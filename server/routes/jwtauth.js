const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const { authorization, checkAdminOrSuperAdmin, checkSuperAdmin } = require("../middleware/authorization");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");

// Register
router.post("/register", validInfo, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, facility } = req.body;

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*_]).{6,}$/;
    
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters long and include at least 1 number and 1 special character"
      });
    }

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length !== 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Password hash
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const isFirstLogin = role === "admin" || role === "housekeeper";

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
        false,
        verificationToken,
        tokenExpiry,
      ]
    );

    try {
      await sendVerificationEmail(email, verificationToken, first_name);
      console.log('✓ Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    if (role === 'guest' || role === 'student') {
      return res.json({ 
        message: "Registration successful! Please check your email to verify your account.",
        requiresVerification: true 
      });
    }

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

// Verify Email
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

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

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users 
       SET verification_token = $1, verification_token_expires = $2 
       WHERE id = $3`,
      [verificationToken, tokenExpiry, user.id]
    );

    await sendVerificationEmail(email, verificationToken, user.first_name);

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    console.error('Resend verification error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Request password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await pool.query(
      "SELECT id, email, first_name FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.json({ 
        message: "If an account exists with that email, a password reset link has been sent." 
      });
    }

    const userData = user.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, password_reset_expires = $2 
       WHERE id = $3`,
      [resetToken, tokenExpiry, userData.id]
    );

    try {
      await sendPasswordResetEmail(userData.email, resetToken, userData.first_name);
      console.log('✓ Password reset email sent to:', userData.email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        message: "Failed to send password reset email. Please try again later." 
      });
    }

    res.json({ 
      message: "If an account exists with that email, a password reset link has been sent." 
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify Reset Token
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT id, email, first_name FROM users 
       WHERE password_reset_token = $1 
       AND password_reset_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token",
        valid: false 
      });
    }

    res.json({ 
      valid: true,
      email: result.rows[0].email 
    });
  } catch (err) {
    console.error('Verify reset token error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*_]).{6,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters long and include at least 1 number and 1 special character (!@#$%^&*_)"
      });
    }

    const user = await pool.query(
      `SELECT id, role, email, password_hash FROM users 
       WHERE password_reset_token = $1 
       AND password_reset_expires > NOW()`,
      [token]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const userData = user.rows[0];

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, userData.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: "New password must be different from your current password" 
      });
    }

    // Hash new password
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_token = NULL, 
           password_reset_expires = NULL,
           first_login = false
       WHERE id = $2`,
      [bcryptPassword, userData.id]
    );

    res.json({ 
      message: "Password has been reset successfully. You can now log in with your new password.",
      success: true
    });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", validInfo, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const userData = user.rows[0];

    if (!userData.email_verified && userData.role !== 'superadmin') {
      return res.status(403).json({ 
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email: email
      });
    }

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

// Verify token
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
      token: newToken,
      first_login: false
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

module.exports = router;