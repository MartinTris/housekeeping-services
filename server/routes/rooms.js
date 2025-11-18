const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const { getIo } = require("../realtime");

// Get rooms
router.get("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT 
          r.id, 
          r.facility, 
          r.room_number, 
          b.id AS booking_id, 
          b.time_in, 
          b.time_out, 
          u.id AS guest_id, 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          (b.time_in <= NOW() AND (b.time_out IS NULL OR b.time_out > NOW())) AS is_active
        FROM rooms r
        LEFT JOIN LATERAL (
          SELECT * FROM room_bookings rb
          WHERE rb.room_id = r.id
          ORDER BY rb.time_in DESC
          LIMIT 1
        ) b ON true
        LEFT JOIN users u ON b.guest_id = u.id
        WHERE r.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY r.facility, r.room_number;
      `;
      params = [];
    } else {
      query = `
        SELECT 
          r.id, 
          r.facility, 
          r.room_number, 
          b.id AS booking_id, 
          b.time_in, 
          b.time_out, 
          u.id AS guest_id, 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          (b.time_in <= NOW() AND (b.time_out IS NULL OR b.time_out > NOW())) AS is_active
        FROM rooms r
        LEFT JOIN LATERAL (
          SELECT * FROM room_bookings rb
          WHERE rb.room_id = r.id
          ORDER BY rb.time_in DESC
          LIMIT 1
        ) b ON true
        LEFT JOIN users u ON b.guest_id = u.id
        WHERE r.facility = $1
        ORDER BY r.room_number;
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    const rooms = result.rows.map((room) => ({
      id: room.id,
      facility: room.facility,
      room_number: room.room_number,
      booking: room.booking_id
        ? {
            booking_id: room.booking_id,
            guest_id: room.guest_id,
            guest_name: room.guest_name,
            time_in: room.time_in,
            time_out: room.time_out,
            is_active: room.is_active,
          }
        : null,
    }));

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err.message);
    res.status(500).send("Server error");
  }
});

// assign room
router.post("/:id/assign", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { guest_id, time_out } = req.body;

    if (!guest_id) {
      return res.status(400).json({ error: "guest_id is required." });
    }

    if (time_out) {
      const timeOutDate = new Date(time_out);
      if (timeOutDate <= new Date()) {
        return res
          .status(400)
          .json({ error: "Time out must be later than the current time." });
      }
    }

    const user = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'guest'",
      [guest_id]
    );

    if (user.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "User does not exist or is not eligible." });
    }

    const roomOverlap = await pool.query(
      `
      SELECT 1 FROM room_bookings
      WHERE room_id = $1 AND (time_out IS NULL OR time_out > NOW())
      LIMIT 1
      `,
      [id]
    );

    if (roomOverlap.rows.length > 0) {
      return res.status(400).json({ error: "Room is already occupied." });
    }

    const guestOverlap = await pool.query(
      `
      SELECT 1 FROM room_bookings
      WHERE guest_id = $1 AND (time_out IS NULL OR time_out > NOW())
      LIMIT 1
      `,
      [guest_id]
    );

    if (guestOverlap.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Guest is already checked in to another room." });
    }

    const newBooking = await pool.query(
      `
      INSERT INTO room_bookings (room_id, guest_id, time_in, time_out)
      VALUES ($1, $2, NOW(), $3::timestamptz)
      RETURNING *
      `,
      [id, guest_id, time_out || null]
    );

    // Update user's facility based on room's facility
    const updatedUser = await pool.query(
      `
      UPDATE users 
      SET facility = (SELECT facility FROM rooms WHERE id = $1) 
      WHERE id = $2
      RETURNING id, email, role, facility
      `,
      [id, guest_id]
    );

    // Generate new token with updated facility
    const jwtGenerator = require("../utils/jwtGenerator");
    const newToken = jwtGenerator({
      id: updatedUser.rows[0].id,
      email: updatedUser.rows[0].email,
      role: updatedUser.rows[0].role,
      facility: updatedUser.rows[0].facility,
    });

    getIo().emit("booking:assigned", {
      room_id: id,
      booking: newBooking.rows[0],
    });

    res.json({ 
      message: "Guest assigned", 
      booking: newBooking.rows[0],
      token: newToken,
      guest_id: guest_id,
      facility: updatedUser.rows[0].facility
    });
  } catch (err) {
    console.error("Error assigning guest:", err.message);
    res.status(500).send("Server error");
  }
});

// remove guest
router.put("/:id/remove", authorization, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      WITH active AS (
        SELECT id, room_id, guest_id, time_in, time_out
        FROM room_bookings
        WHERE room_id = $1 
          AND time_in <= NOW() 
          AND (time_out IS NULL OR time_out > NOW())
        ORDER BY time_in DESC
        LIMIT 1
      ),
      moved AS (
        INSERT INTO booking_history (room_id, guest_id, time_in, time_out, checked_out_at, moved_from_booking)
        SELECT room_id, guest_id, time_in, COALESCE(time_out, NOW()), NOW(), id
        FROM active
        RETURNING *
      ),
      deleted AS (
        DELETE FROM room_bookings WHERE id IN (SELECT id FROM active)
        RETURNING *
      )
      SELECT moved.*, deleted.* 
      FROM moved 
      LEFT JOIN deleted ON moved.moved_from_booking = deleted.id;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No active booking found for this room." });
    }

    const guestId = result.rows[0].guest_id;
    
    // Update user facility to NULL and get updated user data
    const updatedUser = await pool.query(
      "UPDATE users SET facility = NULL WHERE id = $1 RETURNING id, email, role, facility", 
      [guestId]
    );

    // Generate new token with facility removed
    const jwtGenerator = require("../utils/jwtGenerator");
    const newToken = jwtGenerator({
      id: updatedUser.rows[0].id,
      email: updatedUser.rows[0].email,
      role: updatedUser.rows[0].role,
      facility: updatedUser.rows[0].facility, // Will be null
    });

    getIo().emit("booking:removed", {
      room_id: id,
      history: result.rows[0],
    });

    res.json({
      message: "Guest checked out and moved to booking_history",
      history: result.rows[0],
      token: newToken,
      guest_id: guestId
    });
  } catch (err) {
    console.error("Error removing guest:", err.message);
    res.status(500).send("Server error");
  }
});

// update timeout
router.put("/:id/update-timeout", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { time_out } = req.body;

    const result = await pool.query(
      `
      UPDATE room_bookings 
      SET time_out = $1::timestamptz 
      WHERE id = $2 
      RETURNING *
      `,
      [time_out || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }

    getIo().emit("booking:timeoutUpdated", { booking: result.rows[0] });

    res.json({ message: "Timeout updated", booking: result.rows[0] });
  } catch (err) {
    console.error("Error updating timeout:", err.message);
    res.status(500).send("Server error");
  }
});

// add a new room
router.post("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { room_number, facility: targetFacility } = req.body;

    const roomFacility = role === 'superadmin' && targetFacility 
      ? targetFacility 
      : facility;

    if (!room_number || room_number.trim() === "") {
      return res.status(400).json({ error: "Room number is required." });
    }

    const exists = await pool.query(
      "SELECT 1 FROM rooms WHERE facility = $1 AND room_number = $2",
      [roomFacility, room_number.trim()]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Room already exists in this facility." });
    }

    const newRoom = await pool.query(
      "INSERT INTO rooms (facility, room_number) VALUES ($1, $2) RETURNING *",
      [facility, room_number.trim()]
    );

    getIo().emit("room:added", newRoom.rows[0]);
    res.json({ message: "Room added successfully", room: newRoom.rows[0] });
  } catch (err) {
    console.error("Error adding room:", err.message);
    res.status(500).send("Server error");
  }
});

// rename room
router.put("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number } = req.body;

    if (!room_number || room_number.trim() === "") {
      return res.status(400).json({ error: "New room number required." });
    }

    const updated = await pool.query(
      "UPDATE rooms SET room_number = $1 WHERE id = $2 RETURNING *",
      [room_number.trim(), id]
    );

    if (!updated.rows.length) return res.status(404).json({ error: "Room not found." });

    getIo().emit("room:updated", updated.rows[0]);
    res.json({ message: "Room renamed", room: updated.rows[0] });
  } catch (err) {
    console.error("Error renaming room:", err.message);
    res.status(500).send("Server error");
  }
});

// delete room
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;

    const active = await pool.query(
      `
      SELECT 1 FROM room_bookings 
      WHERE room_id = $1 AND (time_out IS NULL OR time_out > NOW()) 
      LIMIT 1
      `,
      [id]
    );

    if (active.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete — room currently occupied." });
    }

    const deleted = await pool.query("DELETE FROM rooms WHERE id = $1 RETURNING *", [id]);

    if (!deleted.rows.length) return res.status(404).json({ error: "Room not found." });

    getIo().emit("room:deleted", deleted.rows[0]);
    res.json({ message: "Room deleted", room: deleted.rows[0] });
  } catch (err) {
    console.error("Error deleting room:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
