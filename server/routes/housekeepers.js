const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");

router.get("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    let query;
    let params;

    if (role === "superadmin") {
      query = `
        SELECT id, first_name, last_name, email, is_active, facility
        FROM users 
        WHERE role = 'housekeeper' AND facility IN ('RCC', 'Hotel Rafael')
        ORDER BY facility, last_name ASC, first_name ASC
      `;
      params = [];
    } else {
      query = `
        SELECT id, first_name, last_name, email, is_active 
        FROM users 
        WHERE role = 'housekeeper' AND facility = $1 
        ORDER BY last_name ASC, first_name ASC
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    const formatted = result.rows.map((u) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      is_active: u.is_active,
      facility: u.facility || facility,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Add housekeeper
router.post("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const {
      first_name,
      last_name,
      email,
      password,
      facility: targetFacility,
    } = req.body;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const housekeeperFacility =
      role === "superadmin" && targetFacility ? targetFacility : facility;

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, facility, is_active,
                         email_verified, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4, 'housekeeper', $5, TRUE, $6, $7, $8)
       RETURNING id, first_name, last_name, email, is_active, facility`,
      [
        first_name,
        last_name,
        email,
        bcryptPassword,
        housekeeperFacility,
        false,
        verificationToken,
        tokenExpiry,
      ]
    );

    try {
      await sendVerificationEmail(email, verificationToken, first_name);
      console.log("✓ Verification email sent to housekeeper:", email);
    } catch (emailError) {
      console.error(
        "Failed to send verification email to housekeeper:",
        emailError
      );
    }

    const hk = newUser.rows[0];
    res.json({
      id: hk.id,
      name: `${hk.first_name} ${hk.last_name}`,
      email: hk.email,
      is_active: hk.is_active,
      facility: hk.facility,
      message: "Housekeeper added successfully. Verification email sent.",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Toggle housekeeper active/inactive status
router.put("/:id/toggle-status", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { id } = req.params;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    let checkQuery;
    let checkParams;

    if (role === "superadmin") {
      checkQuery = `
        SELECT is_active FROM users 
        WHERE id = $1 AND role = 'housekeeper' AND facility IN ('RCC', 'Hotel Rafael')
      `;
      checkParams = [id];
    } else {
      checkQuery = `
        SELECT is_active FROM users 
        WHERE id = $1 AND facility = $2 AND role = 'housekeeper'
      `;
      checkParams = [id, facility];
    }

    const existing = await pool.query(checkQuery, checkParams);

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Housekeeper not found" });
    }

    const newStatus = !existing.rows[0].is_active;

    await pool.query("UPDATE users SET is_active = $1 WHERE id = $2", [
      newStatus,
      id,
    ]);

    res.json({
      message: `Housekeeper ${newStatus ? "enabled" : "disabled"} successfully`,
      is_active: newStatus,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get all schedules
router.get("/all-schedules", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;

    if (role !== "admin" && role !== "superadmin")
      return res.status(403).json({ message: "Access denied" });

    let query;
    let params;

    if (role === "superadmin") {
      query = `
        SELECT s.id, s.housekeeper_id, s.shift_time_in, s.shift_time_out, s.day_offs,
               CONCAT(u.first_name, ' ', u.last_name) AS housekeeper_name,
               u.facility
        FROM housekeeper_schedule s
        JOIN users u ON s.housekeeper_id = u.id
        WHERE u.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY u.facility, u.last_name, u.first_name
      `;
      params = [];
    } else {
      query = `
        SELECT s.id, s.housekeeper_id, s.shift_time_in, s.shift_time_out, s.day_offs,
               CONCAT(u.first_name, ' ', u.last_name) AS housekeeper_name
        FROM housekeeper_schedule s
        JOIN users u ON s.housekeeper_id = u.id
        WHERE u.facility = $1
        ORDER BY u.last_name, u.first_name
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get("/:id/schedule", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { facility, role } = req.user;

    if (role !== "admin" && role !== "superadmin")
      return res
        .status(403)
        .json({ message: "Only admins can view schedules" });

    let housekeeperQuery;
    let housekeeperParams;

    if (role === "superadmin") {
      housekeeperQuery = `
        SELECT id, first_name, last_name, facility 
        FROM users 
        WHERE id = $1 AND role = 'housekeeper' AND facility IN ('RCC', 'Hotel Rafael')
      `;
      housekeeperParams = [id];
    } else {
      housekeeperQuery = `
        SELECT id, first_name, last_name 
        FROM users 
        WHERE id = $1 AND role = 'housekeeper' AND facility = $2
      `;
      housekeeperParams = [id, facility];
    }

    const housekeeper = await pool.query(housekeeperQuery, housekeeperParams);

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

router.post("/:id/schedule", authorization, async (req, res) => {
  try {
    const { id } = req.params; 
    const { shift_time_in, shift_time_out, day_offs } = req.body;
    const { role, facility } = req.user;

    if (role !== "admin" && role !== "superadmin")
      return res
        .status(403)
        .json({ message: "Only admins can manage schedules" });

    let checkQuery;
    let checkParams;

    if (role === "superadmin") {
      checkQuery = `
        SELECT id FROM users 
        WHERE id = $1 AND role = 'housekeeper' AND facility IN ('RCC', 'Hotel Rafael')
      `;
      checkParams = [id];
    } else {
      checkQuery = `
        SELECT id FROM users 
        WHERE id = $1 AND role = 'housekeeper' AND facility = $2
      `;
      checkParams = [id, facility];
    }

    const hk = await pool.query(checkQuery, checkParams);

    if (hk.rowCount === 0)
      return res
        .status(404)
        .json({ message: "Housekeeper not found in your facility" });

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

router.get("/tasks", authorization, async (req, res) => {
  try {
    const housekeeperId = req.user.id;

    const housekeepingTasks = await pool.query(
      `SELECT 
         hr.id,
         hr.status,
         hr.preferred_date,
         TO_CHAR(hr.preferred_time, 'HH12:MI AM') AS preferred_time,
         st.name AS service_type,
         r.room_number,
         r.facility,
         (u.first_name || ' ' || u.last_name) AS guest_name,
         'housekeeping' AS task_type
       FROM housekeeping_requests AS hr
       LEFT JOIN rooms AS r ON hr.room_id = r.id
       LEFT JOIN users AS u ON hr.user_id = u.id
       LEFT JOIN service_types st ON hr.service_type_id = st.id
       WHERE hr.assigned_to = $1
       AND hr.archived = FALSE
       ORDER BY hr.created_at DESC`,
      [housekeeperId]
    );

    const deliveryTasks = await pool.query(
      `SELECT 
         bi.id,
         bi.item_name,
         bi.quantity,
         bi.charge_amount,
         bi.created_at,
         (u.first_name || ' ' || u.last_name) AS guest_name,
         r.room_number,
         r.facility,
         'delivery' AS task_type,
         'pending_delivery' AS status
       FROM borrowed_items bi
       JOIN users u ON bi.user_id = u.id
       LEFT JOIN room_bookings rb ON rb.guest_id = u.id 
         AND rb.time_in <= NOW() 
         AND (rb.time_out IS NULL OR rb.time_out > NOW())
       LEFT JOIN rooms r ON rb.room_id = r.id
       WHERE bi.housekeeper_id = $1
       AND bi.delivery_status = 'pending_delivery'
       ORDER BY bi.created_at DESC`,
      [housekeeperId]
    );

    const allTasks = {
      housekeeping: housekeepingTasks.rows,
      delivery: deliveryTasks.rows,
    };

    res.json(allTasks);
  } catch (err) {
    console.error("Error fetching housekeeper tasks:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/tasks/:id/acknowledge", authorization, async (req, res) => {
  try {
    const { id: hkId, role } = req.user;
    const { id } = req.params;

    if (role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskRes = await pool.query(
      `SELECT preferred_date, preferred_time 
       FROM housekeeping_requests 
       WHERE id = $1 AND assigned_to = $2`,
      [id, hkId]
    );

    if (taskRes.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Task not found or not assigned to you" });
    }

    const task = taskRes.rows[0];
    const now = new Date();
    const [startTimeStr] = task.preferred_time.split(" - ");
    const serviceDateTime = new Date(`${task.preferred_date} ${startTimeStr}`);

    if (now < serviceDateTime) {
      return res.status(400).json({
        error: `You can only mark this task as in progress at or after ${task.preferred_time} on ${task.preferred_date}.`,
      });
    }

    const updated = await pool.query(
      `UPDATE housekeeping_requests 
       SET status = 'in_progress' 
       WHERE id = $1 AND assigned_to = $2
       RETURNING user_id`,
      [id, hkId]
    );

    const guestId = updated.rows[0].user_id;

    const message = "Your housekeeping request is now in progress.";
    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [guestId, message]
    );

    if (req.io) {
      req.io.to(`user:${guestId}`).emit("newNotification", {
        message,
        type: "info",
      });
    }

    res.json({ message: "Task marked as in progress." });
  } catch (err) {
    console.error("Error marking task as in progress:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/tasks/:id/complete", authorization, async (req, res) => {
  try {
    const { id: hkId, role } = req.user;
    const { id } = req.params;

    if (role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskRes = await pool.query(
      `SELECT hr.*, st.name AS service_type_name
       FROM housekeeping_requests hr
       LEFT JOIN service_types st ON hr.service_type_id = st.id
       WHERE hr.id = $1 AND hr.assigned_to = $2`,
      [id, hkId]
    );

    if (taskRes.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Task not found or not assigned to you" });
    }

    const task = taskRes.rows[0];

    const now = new Date();
    const serviceDate = new Date(task.preferred_date);
    const [startTimeStr] = task.preferred_time.split(" - ");
    const serviceDateTime = new Date(`${task.preferred_date} ${startTimeStr}`);

    if (now < serviceDateTime) {
      return res.status(400).json({
        error: `You can only mark this task as done at or after ${task.preferred_time} on ${task.preferred_date}.`,
      });
    }

    await pool.query(
      `INSERT INTO service_history (
        request_id, guest_id, housekeeper_id, room_id, facility,
        service_type_id, preferred_date, preferred_time, status
      )
      VALUES ($1, $2, $3, $4, 
              (SELECT facility FROM rooms WHERE id = $4),
              $5, $6, $7, 'completed')`,
      [
        task.id,
        task.user_id,
        hkId,
        task.room_id,
        task.service_type_id,
        task.preferred_date,
        task.preferred_time,
      ]
    );

    await pool.query(
      `UPDATE service_history SET status = 'completed' WHERE request_id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE housekeeping_requests SET archived = TRUE WHERE id = $1`,
      [id]
    );

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
      console.log(`Sent completion notification to user:${guestId}`);
    }

    res.json({ message: "Task completed and moved to service history." });
  } catch (err) {
    console.error("Error completing task:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/delivery/:id/confirm", authorization, async (req, res) => {
  try {
    const { id: hkId, role } = req.user;
    const { id } = req.params;

    if (role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    const itemRes = await pool.query(
      `SELECT bi.*, u.first_name, u.last_name
       FROM borrowed_items bi
       JOIN users u ON bi.user_id = u.id
       WHERE bi.id = $1 AND bi.housekeeper_id = $2 AND bi.delivery_status = 'pending_delivery'`,
      [id, hkId]
    );

    if (itemRes.rowCount === 0) {
      return res.status(404).json({
        error: "Delivery task not found or not assigned to you",
      });
    }

    const item = itemRes.rows[0];
    const guestName = `${item.first_name} ${item.last_name}`;

    await pool.query(
      `UPDATE borrowed_items 
       SET delivery_status = 'delivered'
       WHERE id = $1`,
      [id]
    );

    const message = `Your borrowed item (${item.item_name} x${item.quantity}) has been delivered. You have been billed ₱${item.charge_amount}.`;
    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [item.user_id, message]
    );

    if (req.io) {
      req.io.to(`user:${item.user_id}`).emit("newNotification", {
        message,
        type: "success",
      });
    }

    res.json({ message: "Delivery confirmed and guest billed successfully." });
  } catch (err) {
    console.error("Error confirming delivery:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/task-history", authorization, async (req, res) => {
  try {
    const { id: housekeeperId, role } = req.user;
    const { days } = req.query;

    if (role !== "housekeeper") {
      return res
        .status(403)
        .json({ error: "Access denied. Housekeeper only." });
    }

    const validDays = [7, 14, 30, 0];
    const range = validDays.includes(Number(days)) ? Number(days) : 7;

    const dateFilter =
      range === 0
        ? ""
        : `AND sh.assigned_at >= NOW() - INTERVAL '${range} days'`;

    const historyQuery = `
  SELECT 
    CASE 
      WHEN requester.role = 'guest' THEN CONCAT(requester.first_name, ' ', requester.last_name)
      WHEN requester.role IN ('admin', 'superadmin') THEN CONCAT(requester.first_name, ' ', requester.last_name, ' (Admin)')
      ELSE 'N/A'
    END AS guest_name,
    st.name AS service_type,
    r.room_number,
    sh.facility,
    TO_CHAR(sh.preferred_date, 'YYYY-MM-DD') AS date,
    TO_CHAR(sh.preferred_time, 'HH12:MI AM') AS time
  FROM service_history sh
  LEFT JOIN users requester ON sh.guest_id = requester.id
  LEFT JOIN rooms r ON sh.room_id = r.id
  LEFT JOIN service_types st ON sh.service_type_id = st.id
  WHERE sh.housekeeper_id = $1
    AND sh.status = 'completed'
    ${dateFilter}
  ORDER BY sh.preferred_date DESC, sh.preferred_time DESC
`;

    const { rows } = await pool.query(historyQuery, [housekeeperId]);

    res.json({
      range_days: range === 0 ? "all_time" : range,
      total_records: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching task history:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
