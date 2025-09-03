const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    // get the user with role
    const userResult = await pool.query(
      "SELECT id, name, role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const user = userResult.rows[0];

    // Just return welcome message depending on role
    switch (user.role) {
      case "student":
      case "guest":
        return res.json({ message: `Welcome ${user.role}`, name: user.name });
      case "housekeeper":
        return res.json({ message: "Welcome housekeeper", name: user.name });
      case "admin":
        return res.json({ message: "Welcome admin", name: user.name });
      default:
        return res.status(403).json("Invalid role");
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

module.exports = router;
