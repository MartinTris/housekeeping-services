const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

// get users
router.get("/me", authorization, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email, role, facility FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    const bookingResult = await pool.query(
      `
      SELECT rb.id AS booking_id, rb.room_id, r.room_number, rb.time_in, rb.time_out
      FROM room_bookings rb
      JOIN rooms r ON r.id = rb.room_id
      WHERE rb.guest_id = $1
        AND rb.time_in <= NOW()
        AND (rb.time_out IS NULL OR rb.time_out > NOW())
      ORDER BY rb.time_in DESC
      LIMIT 1
      `,
      [userId]
    );

    user.current_booking = bookingResult.rows.length ? bookingResult.rows[0] : null;

    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
