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
      "SELECT id, name, email FROM users WHERE role = 'housekeeper' AND facility = $1 ORDER BY name ASC",
      [facility]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------- ADD HOUSEKEEPER ----------------------
router.post("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { name, email, password } = req.body;

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
      "INSERT INTO users (name, email, password_hash, role, facility) VALUES ($1, $2, $3, 'housekeeper', $4) RETURNING id, name, email",
      [name, email, bcryptPassword, facility]
    );

    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ---------------------- DELETE HOUSEKEEPER ----------------------
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.query(
      "DELETE FROM users WHERE id = $1 AND facility = $2 AND role = 'housekeeper'",
      [id, facility]
    );

    res.json({ message: "Housekeeper removed" });
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
      `SELECT s.*, u.name AS housekeeper_name, u.id AS housekeeper_id
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
      `SELECT id, name FROM users WHERE id = $1 AND role = 'housekeeper' AND facility = $2`,
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
         hr.service_type,
         r.room_number,
         r.facility,
         u.name AS guest_name
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

    await pool.query(
      `UPDATE housekeeping_requests 
       SET status = 'in_progress' 
       WHERE id = $1 AND assigned_to = $2`,
      [id, hkId]
    );

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

    await pool.query(
      `UPDATE housekeeping_requests 
       SET status = 'completed' 
       WHERE id = $1 AND assigned_to = $2`,
      [id, hkId]
    );

    res.json({ message: "Task marked as completed." });
  } catch (err) {
    console.error("Error completing task:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
