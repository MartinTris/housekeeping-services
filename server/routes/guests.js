const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const jwtGenerator = require("../utils/jwtGenerator");

router.get("/rooms", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;

    if (!facility && role !== 'superadmin') {
      return res.status(401).json("Facility not assigned");
    }

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT r.*, 
               CONCAT(u.first_name, ' ', u.last_name) AS guest_name
        FROM rooms r
        LEFT JOIN users u ON r.occupied_by = u.id
        WHERE r.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY r.facility, r.room_number
      `;
      params = [];
    } else {
      query = `
        SELECT r.*, 
               CONCAT(u.first_name, ' ', u.last_name) AS guest_name
        FROM rooms r
        LEFT JOIN users u ON r.occupied_by = u.id
        WHERE r.facility = $1
        ORDER BY r.room_number
      `;
      params = [facility];
    }

    const rooms = await pool.query(query, params);
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
       WHERE role = 'guest'
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
  const client = await pool.connect();
  
  try {
    const { room_id } = req.params;
    const { guest_id, time_in, time_out } = req.body;

    await client.query('BEGIN');

    const roomResult = await client.query(
      "SELECT facility FROM rooms WHERE id = $1",
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Room not found" });
    }

    const roomFacility = roomResult.rows[0].facility;

    await client.query(
      "UPDATE users SET facility = $1 WHERE id = $2",
      [roomFacility, guest_id]
    );

    await client.query(
      "INSERT INTO room_bookings (room_id, guest_id, time_in, time_out) VALUES ($1, $2, $3, $4)",
      [room_id, guest_id, time_in, time_out]
    );

    await client.query(
      "UPDATE rooms SET occupied_by = $1 WHERE id = $2",
      [guest_id, room_id]
    );

    const userResult = await client.query(
      "SELECT id, email, role, facility FROM users WHERE id = $1",
      [guest_id]
    );

    await client.query('COMMIT');

    const updatedUser = userResult.rows[0];

    const newToken = jwtGenerator({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      facility: updatedUser.facility,
    });

    res.json({ 
      message: "Guest assigned successfully",
      token: newToken,
      guest_id: guest_id
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
