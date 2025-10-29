const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    // get the user with role
    const userResult = await pool.query(
      "SELECT id, first_name, last_name, role, facility FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const user = userResult.rows[0];
    const fullName = `${user.first_name} ${user.last_name}`;

    return res.json({
      message: `Welcome ${user.role}`,
      name: fullName,
      facility: user.facility,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json("Server error");
  }
});

module.exports = router;
