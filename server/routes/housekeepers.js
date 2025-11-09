const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");
const bcrypt = require("bcrypt");

// ---------------------- GET ALL HOUSEKEEPERS ----------------------
router.get("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, is_active 
       FROM users 
       WHERE role = 'housekeeper' AND facility = $1 
       ORDER BY last_name ASC, first_name ASC`,
      [facility]
    );

    // Return a unified "name" field for frontend compatibility
    const formatted = result.rows.map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      is_active: u.is_active,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------- ADD HOUSEKEEPER ----------------------
router.post("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { first_name, last_name, email, password } = req.body;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, facility)
       VALUES ($1, $2, $3, $4, 'housekeeper', $5)
       RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, bcryptPassword, facility]
    );

    const hk = newUser.rows[0];
    res.json({
      id: hk.id,
      name: `${hk.first_name} ${hk.last_name}`,
      email: hk.email,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------- DELETE HOUSEKEEPER ----------------------
// router.delete("/:id", authorization, async (req, res) => {
//   try {
//     const { facility, role } = req.user;
//     const { id } = req.params;

//     if (role !== "admin") {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     await pool.query(
//       "DELETE FROM users WHERE id = $1 AND facility = $2 AND role = 'housekeeper'",
//       [id, facility]
//     );

//     res.json({ message: "Housekeeper removed" });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// ---------------------- TOGGLE HOUSEKEEPER STATUS ----------------------
router.put("/:id/toggle-status", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get current status
    const existing = await pool.query(
      "SELECT is_active FROM users WHERE id = $1 AND facility = $2 AND role = 'housekeeper'",
      [id, facility]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Housekeeper not found" });
    }

    const newStatus = !existing.rows[0].is_active;

    await pool.query(
      "UPDATE users SET is_active = $1 WHERE id = $2",
      [newStatus, id]
    );

    res.json({
      message: `Housekeeper ${newStatus ? "enabled" : "disabled"} successfully`,
      is_active: newStatus,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------- GET ALL SCHEDULES ----------------------
router.get("/all-schedules", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    if (role !== "admin")
      return res.status(403).json({ message: "Only admins can view all schedules" });

    const result = await pool.query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS housekeeper_name, u.id AS housekeeper_id
       FROM housekeeper_schedule s
       JOIN users u ON s.housekeeper_id = u.id
       WHERE u.facility = $1`,
      [facility]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ---------------------- GET INDIVIDUAL SCHEDULE ----------------------
router.get("/:id/schedule", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { facility, role } = req.user;

    if (role !== "admin")
      return res.status(403).json({ message: "Only admins can view schedules" });

    const housekeeper = await pool.query(
      `SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = 'housekeeper' AND facility = $2`,
      [id, facility]
    );

    if (housekeeper.rowCount === 0)
      return res.status(404).json({ message: "Housekeeper not found" });

    const schedule = await pool.query(
      `SELECT * FROM housekeeper_schedule WHERE housekeeper_id = $1`,
      [id]
    );

    if (schedule.rowCount === 0) {
      return res.json({
        housekeeper_id: id,
        shift_time_in: "08:00",
        shift_time_out: "17:00",
        day_offs: [],
        is_new: true,
      });
    }

    res.json(schedule.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ---------------------- CREATE / UPDATE SCHEDULE ----------------------
router.post("/:id/schedule", authorization, async (req, res) => {
  try {
    const { id } = req.params; // housekeeper_id
    const { shift_time_in, shift_time_out, day_offs } = req.body;
    const { role, facility } = req.user;

    if (role !== "admin")
      return res.status(403).json({ message: "Only admins can manage schedules" });

    // Check if housekeeper belongs to this facility
    const hk = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'housekeeper' AND facility = $2",
      [id, facility]
    );

    if (hk.rowCount === 0)
      return res.status(404).json({ message: "Housekeeper not found in your facility" });

    // Check if schedule exists
    const existing = await pool.query(
      "SELECT id FROM housekeeper_schedule WHERE housekeeper_id = $1",
      [id]
    );

    let result;
    if (existing.rowCount > 0) {
      result = await pool.query(
        `UPDATE housekeeper_schedule
         SET shift_time_in = $1, shift_time_out = $2, day_offs = $3
         WHERE housekeeper_id = $4 RETURNING *`,
        [shift_time_in, shift_time_out, day_offs, id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO housekeeper_schedule (housekeeper_id, shift_time_in, shift_time_out, day_offs)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, shift_time_in, shift_time_out, day_offs]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ---------------------- GET TASKS FOR HOUSEKEEPER ----------------------
router.get("/tasks", authorization, async (req, res) => {
  try {
    const housekeeperId = req.user.id; // authenticated housekeeper

    const result = await pool.query(
      `SELECT 
         hr.id,
         hr.status,
         hr.preferred_date,
         TO_CHAR(hr.preferred_time, 'HH12:MI AM') AS preferred_time,
         COALESCE(hr.service_type, 'regular') AS service_type,
         r.room_number,
         r.facility,
         (u.first_name || ' ' || u.last_name) AS guest_name
       FROM housekeeping_requests AS hr
       LEFT JOIN rooms AS r ON hr.room_id = r.id
       LEFT JOIN users AS u ON hr.user_id = u.id
       WHERE hr.assigned_to = $1
       ORDER BY hr.created_at DESC`,
      [housekeeperId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching housekeeper tasks:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------- ACKNOWLEDGE TASK ----------------------
router.put("/tasks/:id/acknowledge", authorization, async (req, res) => {
  try {
    const { id: hkId, role } = req.user;
    const { id } = req.params;

    if (role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update status and return guest user id
    const updated = await pool.query(
      `UPDATE housekeeping_requests 
       SET status = 'in_progress' 
       WHERE id = $1 AND assigned_to = $2
       RETURNING user_id`,
      [id, hkId]
    );

    if (updated.rowCount === 0)
      return res.status(404).json({ error: "Task not found or not assigned to you" });

    const guestId = updated.rows[0].user_id;

    // Insert notification for the guest (match your notifications schema)
    const message = "Your housekeeping request has been acknowledged and is now in progress.";
    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [guestId, message]
    );

    // Emit real-time notification using req.io (index.js attaches io to req)
    if (req.io) {
      req.io.to(`user:${guestId}`).emit("newNotification", {
        message,
        type: "info",
      });
      console.log(`📢 Sent real-time notification to user:${guestId}`);
    }

    res.json({ message: "Task acknowledged." });
  } catch (err) {
    console.error("Error acknowledging task:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------- COMPLETE TASK ----------------------
router.put("/tasks/:id/complete", authorization, async (req, res) => {
  try {
    const { id: hkId, role } = req.user;
    const { id } = req.params;

    if (role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Step 1: Fetch the task details
    const taskRes = await pool.query(
      `SELECT *
       FROM housekeeping_requests
       WHERE id = $1 AND assigned_to = $2`,
      [id, hkId]
    );

    if (taskRes.rowCount === 0) {
      return res.status(404).json({ error: "Task not found or not assigned to you" });
    }

    const task = taskRes.rows[0];

    // Step 2: Validate that current time >= scheduled time
    const now = new Date();
    const serviceDate = new Date(task.preferred_date);
    const [startTimeStr] = task.preferred_time.split(" - "); // "01:00 PM - 01:30 PM"
    const serviceDateTime = new Date(`${task.preferred_date} ${startTimeStr}`);

    if (now < serviceDateTime) {
      return res.status(400).json({
        error: `You can only mark this task as done at or after ${task.preferred_time} on ${task.preferred_date}.`,
      });
    }

    // Step 3: Insert into service_history
    await pool.query(
      `INSERT INTO service_history (
        request_id, guest_id, housekeeper_id, room_id, facility,
        service_type, preferred_date, preferred_time, status
      )
      VALUES ($1, $2, $3, $4, 
              (SELECT facility FROM rooms WHERE id = $4),
              $5, $6, $7, 'completed')`,
      [
        task.id,
        task.user_id,
        hkId,
        task.room_id,
        task.service_type || "regular",
        task.preferred_date,
        task.preferred_time,
      ]
    );

    // Step 4: Delete from housekeeping_requests
    await pool.query(`DELETE FROM housekeeping_requests WHERE id = $1`, [id]);

    // Step 5: Notify guest
    const guestId = task.user_id;
    const completeMessage = "Your housekeeping request has been completed.";

    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [guestId, completeMessage]
    );

    if (req.io) {
      req.io.to(`user:${guestId}`).emit("newNotification", {
        message: completeMessage,
        type: "success",
      });
      console.log(`📢 Sent completion notification to user:${guestId}`);
    }

    res.json({ message: "Task completed and moved to service history." });
  } catch (err) {
    console.error("Error completing task:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
