const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const { authorization } = require("../middleware/authorization");

// Get all admins (superadmin only)
router.get("/", authorization, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    const admins = await pool.query(
      `SELECT id, first_name, last_name, email, facility, is_active, created_at
       FROM users
       WHERE role = 'admin'
       ORDER BY facility, first_name ASC`
    );

    res.json(admins.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new admin (superadmin only)
router.post("/", authorization, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    const { first_name, last_name, email, password, facility } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password || !facility) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!["RCC", "Hotel Rafael"].includes(facility)) {
      return res.status(400).json({ error: "Invalid facility selected." });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists." });
    }

    // Hash password
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // Insert new admin - FIXED: Changed 'password' to 'password_hash'
    const newAdmin = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, facility, is_active)
       VALUES ($1, $2, $3, $4, 'admin', $5, true)
       RETURNING id, first_name, last_name, email, facility, is_active, created_at`,
      [first_name, last_name, email, bcryptPassword, facility]
    );

    res.json(newAdmin.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Toggle admin status (enable/disable) - superadmin only
router.put("/:id/toggle-status", authorization, async (req, res) => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    if (role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    // Check if user exists and is an admin
    const adminCheck = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'admin'",
      [id]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Toggle is_active status
    const result = await pool.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE id = $1 AND role = 'admin'
       RETURNING is_active`,
      [id]
    );

    res.json({ is_active: result.rows[0].is_active });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;