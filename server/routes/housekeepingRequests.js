const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");
const { createNotification } = require("../utils/notifications");
const { getIo } = require("../realtime"); // ✅ Import socket instance

// ===================== CREATE REQUEST =====================
router.post("/", authorization, async (req, res) => {
  try {
    let { preferred_time, service_type } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: no user ID found" });
    }

    // ✅ Force all requests to use today's date only (YYYY-MM-DD)
    const today = new Date();
    const preferred_date = today.toISOString().split("T")[0];

    // Validate that the request is for today only
    const reqDate = new Date(preferred_date);
    const nowDate = new Date();
    if (reqDate.toDateString() !== nowDate.toDateString()) {
      return res
        .status(400)
        .json({ error: "You can only book services for today." });
    }

    // Normalize preferred_time
    let normalizedTime = preferred_time;
    if (normalizedTime && /^\d{2}:\d{2}$/.test(normalizedTime)) {
      normalizedTime += ":00";
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalizedTime)) {
      return res.status(400).json({ error: "Invalid preferred_time format" });
    }

    // Get guest info (facility + name)
    const userRes = await pool.query(
      `SELECT id, facility, first_name, last_name FROM users WHERE id = $1::uuid`,
      [userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].facility) {
      return res
        .status(400)
        .json({ error: "You must be assigned to a room to request service." });
    }

    const { facility, first_name, last_name } = userRes.rows[0];
    const guestName = `${first_name} ${last_name}`;

    // Ensure consistent facility casing
    const facilityKey = facility.trim().toLowerCase();

    // Find active booking for this guest
    const bookingRes = await pool.query(
      `SELECT rb.room_id, r.room_number
       FROM room_bookings rb
       JOIN rooms r ON rb.room_id = r.id
       WHERE rb.guest_id = $1::uuid
         AND rb.time_in <= NOW()
         AND (rb.time_out IS NULL OR rb.time_out > NOW())
       ORDER BY rb.time_in DESC
       LIMIT 1`,
      [userId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(400).json({ error: "No active room booking found." });
    }

    const { room_id: roomId, room_number } = bookingRes.rows[0];

    // ------------------------------
    // STEP 1: Find available housekeepers
    // ------------------------------
    const currentDay = new Date(preferred_date).toLocaleString("en-US", {
      weekday: "long",
    });
    const availableHk = await pool.query(
      `
      SELECT 
        u.id, 
        (u.first_name || ' ' || u.last_name) AS name,
        hs.shift_time_in, 
        hs.shift_time_out, 
        hs.day_offs
      FROM users u
      JOIN housekeeper_schedule hs ON hs.housekeeper_id = u.id
      WHERE 
        u.role = 'housekeeper'
        AND LOWER(u.facility) = LOWER($1)
        AND NOT ($2 = ANY(hs.day_offs))
        AND (
          (hs.shift_time_in <= hs.shift_time_out AND $3 BETWEEN hs.shift_time_in AND hs.shift_time_out)
          OR (hs.shift_time_in > hs.shift_time_out AND ($3 >= hs.shift_time_in OR $3 <= hs.shift_time_out))
        )
      `,
      [facilityKey, currentDay, normalizedTime]
    );

    // ------------------------------
    // STEP 2: Handle no available housekeeper
    // ------------------------------
    if (availableHk.rows.length === 0) {
      const pending = await pool.query(
        `INSERT INTO housekeeping_requests
         (user_id, room_id, preferred_date, preferred_time, service_type, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [
          userId,
          roomId,
          preferred_date,
          normalizedTime,
          service_type || "regular",
        ]
      );

      const adminRes = await pool.query(
        `SELECT id FROM users WHERE role = 'admin' AND LOWER(facility) = LOWER($1) LIMIT 1`,
        [facilityKey]
      );

      if (adminRes.rows.length > 0) {
        const adminId = adminRes.rows[0].id;
        await createNotification(
          adminId,
          `New housekeeping request (Pending) from ${guestName} for Room ${room_number}.`
        );

        const io = getIo();
        if (io) {
          io.to(`facility:${facilityKey}`).emit("newRequest", {
            message: `New housekeeping request (Pending) from ${guestName} for Room ${room_number}.`,
            room: room_number,
            facility: facilityKey,
          });
        }
      }

      return res.json({
        ...pending.rows[0],
        message:
          "No housekeeper available right now (all off-duty or on day-off). Request pending approval.",
      });
    }

    // ------------------------------
    // STEP 3–8: (unchanged except for name fields)
    // ------------------------------
    const todayDate = new Date().toISOString().split("T")[0];
    const counts = await pool.query(
      `
      SELECT assigned_to AS hk_id, COUNT(*) AS tasks_today
      FROM housekeeping_requests
      WHERE DATE(created_at) = $1
        AND status IN ('approved', 'done')
      GROUP BY assigned_to
      `,
      [todayDate]
    );

    const countMap = {};
    counts.rows.forEach((row) => {
      countMap[row.hk_id] = parseInt(row.tasks_today);
    });

    availableHk.rows.sort((a, b) => {
      const countA = countMap[a.id] || 0;
      const countB = countMap[b.id] || 0;
      if (countA === countB) return a.name.localeCompare(b.name);
      return countA - countB;
    });

    const selectedHk = availableHk.rows[0];

    const newReq = await pool.query(
      `INSERT INTO housekeeping_requests
       (user_id, room_id, preferred_date, preferred_time, service_type, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, 'approved', $6)
       RETURNING *`,
      [
        userId,
        roomId,
        preferred_date,
        normalizedTime,
        service_type || "regular",
        selectedHk.id,
      ]
    );

    const adminRes = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' AND LOWER(facility) = LOWER($1) LIMIT 1`,
      [facilityKey]
    );

    if (adminRes.rows.length > 0) {
      const adminId = adminRes.rows[0].id;

      await createNotification(
        adminId,
        `New housekeeping request from ${guestName} for Room ${room_number}.`
      );

      const io = getIo();
      if (io) {
        io.to(`facility:${facilityKey}`).emit("newRequest", {
          message: `New housekeeping request from ${guestName} for Room ${room_number}.`,
          room: room_number,
          facility: facilityKey,
        });
      }
    }

    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [
        userId,
        `Your service request has been approved. Housekeeper: ${selectedHk.name}.`,
      ]
    );

    const io = getIo();
    if (io) {
      io.to(`user:${userId}`).emit("housekeeperAssigned", {
        message: `Your service request has been approved. Housekeeper: ${selectedHk.name}.`,
      });
      console.log(`📡 Emitted housekeeperAssigned to user:${userId}`);
    }

    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [
        selectedHk.id,
        `A new housekeeping task has been assigned to you for Room ${room_number} at ${normalizedTime}.`,
      ]
    );

    if (io) {
      io.to(`user:${selectedHk.id}`).emit("newAssignment", {
        message: `You have been assigned a new housekeeping request for Room ${room_number} on ${preferred_date} at ${normalizedTime}.`,
        room: room_number,
        facility: facilityKey,
      });
      console.log(`📡 Emitted newAssignment to user:${selectedHk.id}`);
    }

    return res.json({
      ...newReq.rows[0],
      assigned_housekeeper: selectedHk.name,
      message: "Request approved and housekeeper automatically assigned.",
    });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================== FETCH REQUESTS (ADMIN) =====================
router.get("/", authorization, async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await pool.query(
      "SELECT facility FROM users WHERE id = $1::uuid",
      [adminId]
    );

    if (admin.rows.length === 0 || !admin.rows[0].facility) {
      return res.status(403).json({ error: "Admin facility not found." });
    }

    const facility = admin.rows[0].facility;

    const requests = await pool.query(
      `
      SELECT hr.*, 
             (u.first_name || ' ' || u.last_name) AS guest_name, 
             r.room_number
      FROM housekeeping_requests hr
      JOIN users u ON hr.user_id = u.id
      JOIN rooms r ON hr.room_id = r.id
      WHERE r.facility = $1
      ORDER BY hr.created_at DESC
      `,
      [facility]
    );

    res.json(requests.rows);
  } catch (err) {
    console.error("Error fetching requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================== ASSIGN HOUSEKEEPER =====================
router.put("/:id/assign", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { housekeeperId } = req.body;
    const adminId = req.user.id;

    const admin = await pool.query(
      "SELECT facility FROM users WHERE id = $1::uuid",
      [adminId]
    );

    if (admin.rows.length === 0 || !admin.rows[0].facility) {
      return res.status(403).json({ error: "Admin facility not found." });
    }

    const facility = admin.rows[0].facility;

    const hkCheck = await pool.query(
      `SELECT (first_name || ' ' || last_name) AS name FROM users 
       WHERE id = $1::uuid 
         AND role = 'housekeeper' 
         AND facility = $2`,
      [housekeeperId, facility]
    );

    if (hkCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Housekeeper not found in your facility." });
    }

    const hkName = hkCheck.rows[0].name;

    const reqRes = await pool.query(
      `SELECT * FROM housekeeping_requests WHERE id = $1::uuid`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const reqData = reqRes.rows[0];

    await pool.query(
      `
      INSERT INTO service_history (
        request_id, guest_id, housekeeper_id, room_id, facility,
        service_type, preferred_date, preferred_time, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
      `,
      [
        id,
        reqData.user_id,
        housekeeperId,
        reqData.room_id,
        facility,
        reqData.service_type,
        reqData.preferred_date,
        reqData.preferred_time,
      ]
    );

    await pool.query(`DELETE FROM housekeeping_requests WHERE id = $1::uuid`, [
      id,
    ]);

    const io = getIo();
    if (io) {
      io.to(`user:${reqData.user_id}`).emit("housekeeperAssigned", {
        message: `Your housekeeping request has been approved. Housekeeper: ${hkName}.`,
      });
    }

    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [
        reqData.user_id,
        `Your housekeeping request has been approved. Housekeeper: ${hkName}.`,
      ]
    );

    res.json({
      message: "Housekeeper assigned and request archived.",
      moved: true,
      history: {
        ...reqData,
        housekeeper_id: housekeeperId,
      },
    });
  } catch (err) {
    console.error("Error assigning housekeeper:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================== CHECK AVAILABILITY =====================
router.get("/availability", authorization, async (req, res) => {
  try {
    const { serviceType } = req.query;

    const date = new Date().toISOString().split("T")[0];
    const facility = req.user.facility;
    const duration = serviceType === "deep" ? 60 : 30;

    const housekeepers = await pool.query(
      `SELECT u.id, s.shift_time_in, s.shift_time_out, s.day_offs
       FROM users u
       JOIN housekeeper_schedule s ON s.housekeeper_id = u.id
       WHERE u.role = 'housekeeper' AND LOWER(u.facility) = LOWER($1)`,
      [facility]
    );

    const busy = await pool.query(
      `
      SELECT assigned_to AS housekeeper_id, preferred_time, service_type
      FROM housekeeping_requests
      WHERE preferred_date = $1
      AND assigned_to IS NOT NULL
      `,
      [date]
    );

    const startHour = facility.toLowerCase().includes("rafael") ? 6 : 8;
    const endHour = facility.toLowerCase().includes("rafael") ? 24 : 24;
    const selectedDay = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const busyMap = {};
    for (const b of busy.rows) {
      const hkId = b.housekeeper_id;
      const start = toMinutes(b.preferred_time);
      const end = start + (b.service_type === "deep" ? 60 : 30);
      if (!busyMap[hkId]) busyMap[hkId] = [];
      busyMap[hkId].push({ start, end });
    }

    const availability = {};

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const start = hour * 60 + minute;
        const end = start + duration;
        if (end > endHour * 60) continue;

        const timeKey = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}:00`;

        const availableHousekeepers = housekeepers.rows.filter((hk) => {
          const isDayOff = hk.day_offs?.includes(selectedDay);
          if (isDayOff) return false;

          //const shiftStart = toMinutes(hk.shift_time_in);
          //const shiftEnd = toMinutes(hk.shift_time_out);
          //if (start < shiftStart || end > shiftEnd) return false;

          const blockedIntervals = busyMap[hk.id] || [];
          const overlaps = blockedIntervals.some(
            (b) => start < b.end && end > b.start
          );

          return !overlaps;
        });

        availability[timeKey] = availableHousekeepers.length > 0;
      }
    }

    res.json(availability);
  } catch (err) {
    console.error("❌ Error checking availability:", err);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

module.exports = router;
