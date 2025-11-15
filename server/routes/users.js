const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const { authorization } = require("../middleware/authorization");

// Get users
router.get("/me", authorization, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email, role, facility FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];
    user.current_booking = null;

    if (role === "guest") {
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

      user.current_booking =
        bookingResult.rows.length ? bookingResult.rows[0] : null;
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err.message);
    res.status(500).send("Server error");
  }
});

router.put("/reset-password", authorization, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const userRes = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const storedPassword = userRes.rows[0].password_hash;
    const isMatch = await bcrypt.compare(oldPassword, storedPassword);

    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect." });
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, storedPassword);
    
    if (isSamePassword) {
      return res.status(400).json({ error: "New password must be different from the old password." });
    }

    const bcryptPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [bcryptPassword, userId]
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password reset error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
