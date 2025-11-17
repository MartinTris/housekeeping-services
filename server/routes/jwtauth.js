const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const { authorization, checkAdminOrSuperAdmin, checkSuperAdmin } = require("../middleware/authorization");

// REGISTER
router.post("/register", validInfo, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, facility } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length !== 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Password hash
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const isFirstLogin = role === "admin" || role === "housekeeper";

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, facility, first_login) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        first_name,
        last_name,
        email,
        bcryptPassword,
        role,
        facility || null,
        isFirstLogin,
      ]
    );

    // Generate JWT token
    const token = jwtGenerator(newUser.rows[0]);
    res.json({ token, message: "User registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
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
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ message: "New password required" });
    }

    // Password validation: at least 8 characters, 1 number, 1 special character
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long and contain at least 1 number and 1 special character (!@#$%^&*)" 
      });
    }

    const userQuery = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentPasswordHash = userQuery.rows[0].password_hash;

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(new_password, currentPasswordHash);
    
    if (isSamePassword) {
      return res.status(400).json({ 
        message: "New password must be different from the old password" 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(new_password, salt);

    // Update password and set first_login to false
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, first_login = FALSE
       WHERE id = $2`,
      [bcryptPassword, userId]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
