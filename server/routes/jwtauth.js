const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const { authorization, checkAdminOrSuperAdmin, checkSuperAdmin } = require("../middleware/authorization");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

// REGISTER
router.post("/register", validInfo, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, facility } = req.body;

    // Check if user already exists
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length !== 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Password hash
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const isFirstLogin = role === "admin" || role === "housekeeper";

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert new user with verification token
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, facility, first_login, 
                         email_verified, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        first_name,
        last_name,
        email,
        bcryptPassword,
        role,
        facility || null,
        isFirstLogin,
        false, // email_verified
        verificationToken,
        tokenExpiry,
      ]
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, first_name);
      console.log('✓ Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    // For guests and students, don't generate token until verified
    if (role === 'guest' || role === 'student') {
      return res.json({ 
        message: "Registration successful! Please check your email to verify your account.",
        requiresVerification: true 
      });
    }

    // For admin/housekeeper, generate token (they can verify later)
    const token = jwtGenerator(newUser.rows[0]);
    res.json({ 
      token, 
      message: "User registered successfully. Please verify your email.",
      requiresVerification: true 
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// VERIFY EMAIL
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this token
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE verification_token = $1 
       AND verification_token_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token" 
      });
    }

    const user = result.rows[0];

    // Update user as verified
    await pool.query(
      `UPDATE users 
       SET email_verified = TRUE, 
           verification_token = NULL, 
           verification_token_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    res.json({ 
      message: "Email verified successfully! You can now log in.",
      success: true 
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
    res.status(500).json({ message: "Server error during verification" });
  }
});

// RESEND VERIFICATION EMAIL
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update user with new token
    await pool.query(
      `UPDATE users 
       SET verification_token = $1, verification_token_expires = $2 
       WHERE id = $3`,
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    await sendVerificationEmail(email, verificationToken, user.first_name);

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    console.error('Resend verification error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN - Updated to check email verification
router.post("/login", validInfo, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Query user by email first
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const userData = user.rows[0];

    // Check if email is verified for ALL roles (guest, student, admin, housekeeper)
    if (!userData.email_verified && userData.role !== 'superadmin') {
      return res.status(403).json({ 
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email: email // Send email back so frontend can show resend option
      });
    }

    // Allow superadmin to login through admin button
    if (role === "admin" && userData.role === "superadmin") {
      const validPassword = await bcrypt.compare(password, userData.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ message: "Password incorrect" });
      }

      const token = jwtGenerator(userData);
      return res.json({
        token,
        role: userData.role,
        first_login: userData.first_login,
      });
    }

    // For regular users, check if role matches
    if (userData.role !== role) {
      return res.status(401).json({ message: "User not found or role mismatch" });
    }

    const validPassword = await bcrypt.compare(password, userData.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const token = jwtGenerator(userData);
    res.json({
      token,
      role: userData.role,
      first_login: userData.first_login,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// VERIFY TOKEN
router.get("/is-verify", authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// Force password change on first login
router.put("/change-password", authorization, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*_]).{6,}$/;

    if (!newPassword || !passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters long and include at least 1 number and 1 special character"
      });
    }

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      "UPDATE users SET password_hash = $1, first_login = FALSE WHERE id = $2",
      [bcryptPassword, userId]
    );

    const updatedUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    const newToken = jwtGenerator(updatedUser.rows[0]);

    res.json({ 
      message: "Password updated successfully",
      token: newToken
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// Login
router.post("/login", validInfo, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Query user by email first
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const userData = user.rows[0];

    // Allow superadmin to login through admin button
    if (role === "admin" && userData.role === "superadmin") {
      // Superadmin can login through admin login
      const validPassword = await bcrypt.compare(password, userData.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ message: "Password incorrect" });
      }

      const token = jwtGenerator(userData);
      return res.json({
        token,
        role: userData.role, // Return 'superadmin' not 'admin'
        first_login: userData.first_login,
      });
    }

    // For regular users, check if role matches
    if (userData.role !== role) {
      return res.status(401).json({ message: "User not found or role mismatch" });
    }

    const validPassword = await bcrypt.compare(password, userData.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const token = jwtGenerator(userData);
    res.json({
      token,
      role: userData.role,
      first_login: userData.first_login,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// VERIFY TOKEN
router.get("/is-verify", authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

// Force password change on first login
router.put("/change-password", authorization, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*_]).{6,}$/;

    if (!newPassword || !passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters long and include at least 1 number and 1 special character"
      });
    }

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      "UPDATE users SET password_hash = $1, first_login = FALSE WHERE id = $2",
      [bcryptPassword, userId]
    );

    const updatedUser = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    const newToken = jwtGenerator(updatedUser.rows[0]);

    res.json({ 
      message: "Password updated successfully",
      token: newToken
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

module.exports = router;