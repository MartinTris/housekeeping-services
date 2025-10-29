const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const authorization = require("../middleware/authorization");

// REGISTER
router.post("/register", validInfo, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, student_number, facility } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length !== 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    if (role === "student") {
      if (!student_number) {
        return res.status(400).json({ message: "Student number is required for students" });
      }

      const studentRegex = /^202\d{6}$/;
      if (!studentRegex.test(student_number)) {
        return res.status(400).json({ message: "Invalid student number" });
      }

      const lastFour = student_number.slice(-4);

      if (!email.endsWith("@dlsud.edu.ph")) {
        return res.status(400).json({ message: "Email must be a DLSU-D email address" });
      }

      if (!email.includes(lastFour)) {
        return res.status(400).json({ message: "Email must contain the last 4 digits of your student number" });
      }
    }

    // Password hash
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, student_number, password_hash, role, facility) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [first_name, last_name, email, student_number || null, bcryptPassword, role, facility || null]
    );

    // Generate JWT token
    const token = jwtGenerator(newUser.rows[0]);
    res.json({ token, message: "User registered successfully" });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// LOGIN
router.post("/login", validInfo, async (req, res) => {
  try {
    const { email, student_number, password, role } = req.body;

    let user;

    if (role === "student") {
      if (!student_number) {
        return res.status(400).json({ message: "Student number required" });
      }
      user = await pool.query(
        "SELECT * FROM users WHERE student_number = $1 AND role = 'student'",
        [student_number]
      );
    } else if (role === "guest" || role === "admin" || role === "housekeeper") {
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      user = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND role = $2",
        [email, role]
      );
    } else {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found or role mismatch" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const token = jwtGenerator(user.rows[0]);
    res.json({ token, role: user.rows[0].role });
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

module.exports = router;
