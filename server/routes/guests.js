const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

router.get("/rooms", authorization, async (req, res) => {
  try {
    const user = await pool.query("SELECT facility FROM users WHERE id = $1", [
      req.user.id,
    ]);

    if (user.rows.length === 0) return res.status(401).json("User not found");

    const facility = user.rows[0].facility;

    const rooms = await pool.query(
      `SELECT r.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS guest_name
       FROM rooms r
       LEFT JOIN users u ON r.occupied_by = u.id
       WHERE r.facility = $1
       ORDER BY r.room_number`,
      [facility]
    );

    res.json(rooms.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get("/search", authorization, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json([]);

    const guests = await pool.query(
      `SELECT id, 
              CONCAT(first_name, ' ', last_name) AS name, 
              email 
       FROM users 
       WHERE role IN ('guest', 'student')
       AND (
         first_name ILIKE $1 
         OR last_name ILIKE $1 
         OR CONCAT(first_name, ' ', last_name) ILIKE $1 
         OR email ILIKE $1
       )
       LIMIT 10;`,
      [`%${query}%`]
    );

    res.json(guests.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/assign/:room_id", authorization, async (req, res) => {
  try {
    const { room_id } = req.params;
    const { guest_id, time_in, time_out } = req.body;

    await pool.query(
      "INSERT INTO room_bookings (room_id, guest_id, time_in, time_out) VALUES ($1, $2, $3, $4)",
      [room_id, guest_id, time_in, time_out]
    );

    await pool.query("UPDATE rooms SET occupied_by = $1 WHERE id = $2", [
      guest_id,
      room_id,
    ]);

    res.json({ message: "Guest assigned successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
