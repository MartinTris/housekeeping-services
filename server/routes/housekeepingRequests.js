const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const { createNotification } = require("../utils/notifications");
const { getIo } = require("../realtime");

router.post("/", authorization, async (req, res) => {
  try {
    let { preferred_time, service_type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const todayDate = new Date().toISOString().split("T")[0];

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      const requestCountRes = await pool.query(
        `
    SELECT COUNT(*) AS count FROM (
      SELECT id, preferred_date
      FROM housekeeping_requests
      WHERE user_id = $1
        AND preferred_date = $2
        AND archived = FALSE

      UNION ALL

      SELECT id, preferred_date
      FROM service_history
      WHERE guest_id = $1
        AND preferred_date = $2
    ) t
    `,
        [userId, todayDate]
      );

      const totalRequestsToday = parseInt(requestCountRes.rows[0].count, 10);
      if (totalRequestsToday >= 3) {
        return res.status(400).json({
          error: "You have reached the daily limit of 3 service requests.",
        });
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: no user ID found" });
    }

    const today = new Date();
    const preferred_date = today.toISOString().split("T")[0];

    const reqDate = new Date(preferred_date);
    const nowDate = new Date();
    if (reqDate.toDateString() !== nowDate.toDateString()) {
      return res
        .status(400)
        .json({ error: "You can only book services for today." });
    }

    let normalizedTime = preferred_time;
    if (normalizedTime && /^\d{2}:\d{2}$/.test(normalizedTime)) {
      normalizedTime += ":00";
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalizedTime)) {
      return res.status(400).json({ error: "Invalid preferred_time format" });
    }

    const userRes = await pool.query(
      `SELECT id, facility, first_name, last_name FROM users WHERE id = $1::uuid`,
      [userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].facility) {
      return res
        .status(400)
        .json({ error: "You must be assigned to a facility to request service." });
    }

    const { facility, first_name, last_name } = userRes.rows[0];
    const guestName = `${first_name} ${last_name}`;
    const facilityKey = facility.trim().toLowerCase();

    const typeRes = await pool.query(
      "SELECT id, duration FROM service_types WHERE name = $1 AND LOWER(facility) = LOWER($2)",
      [service_type, facility]
    );
    if (typeRes.rows.length === 0) {
      return res.status(400).json({ error: "Invalid service type for your facility." });
    }
    const serviceTypeId = typeRes.rows[0].id;
    const durationMinutes = typeRes.rows[0].duration;

    const overlapCheck = await pool.query(
      `
      SELECT 1
      FROM housekeeping_requests hr
      JOIN service_types st ON hr.service_type_id = st.id
      WHERE hr.user_id = $1
        AND hr.preferred_date = $2
        AND hr.archived = FALSE
        AND hr.status IN ('pending', 'approved', 'in_progress')
        AND (
          hr.preferred_time < ($3::time + ($4 || ' minutes')::interval)
          AND (hr.preferred_time + (st.duration || ' minutes')::interval) > $3::time
        )
      LIMIT 1
      `,
      [userId, preferred_date, normalizedTime, durationMinutes]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({
        error:
          "You already have a housekeeping request that overlaps with this timeslot.",
      });
    }

    let roomId, room_number;

    if (userRole === 'admin' || userRole === 'superadmin') {
      const adminRoomRes = await pool.query(
        `SELECT id, room_number FROM rooms 
         WHERE LOWER(room_number) = 'admin office' 
         AND LOWER(facility) = LOWER($1)
         LIMIT 1`,
        [facility]
      );

      if (adminRoomRes.rows.length > 0) {
        roomId = adminRoomRes.rows[0].id;
        room_number = adminRoomRes.rows[0].room_number;
      } else {
        // Create Admin Office room if it doesn't exist
        const newRoomRes = await pool.query(
          `INSERT INTO rooms (room_number, facility)
           VALUES ('Admin Office', $1)
           RETURNING id, room_number`,
          [facility]
        );
        roomId = newRoomRes.rows[0].id;
        room_number = newRoomRes.rows[0].room_number;
      }
    } else {
      // For guests, check active room booking
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

      roomId = bookingRes.rows[0].room_id;
      room_number = bookingRes.rows[0].room_number;
    }

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
        AND u.is_active = TRUE
        AND LOWER(u.facility) = LOWER($1)
        AND NOT ($2 = ANY(hs.day_offs))
        AND (
          (hs.shift_time_in <= hs.shift_time_out AND $3 BETWEEN hs.shift_time_in AND hs.shift_time_out)
          OR (hs.shift_time_in > hs.shift_time_out AND ($3 >= hs.shift_time_in OR $3 <= hs.shift_time_out))
        )
      `,
      [facilityKey, currentDay, normalizedTime]
    );

    function addMinutesToTimeStr(timeStr, minutesToAdd) {
      const [hours, minutes, seconds = "00"] = timeStr.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + minutesToAdd;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      return `${String(newHours).padStart(2, "0")}:${String(
        newMinutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    const startTime = normalizedTime;
    const endTimeStr = addMinutesToTimeStr(startTime, durationMinutes);

    const busyReqs = await pool.query(
      `
      SELECT hr.assigned_to, hr.preferred_time, st.duration
      FROM housekeeping_requests hr
      JOIN service_types st ON hr.service_type_id = st.id
      WHERE hr.preferred_date = $1
        AND hr.assigned_to IS NOT NULL
        AND hr.status IN ('approved','in_progress')
      `,
      [preferred_date]
    );

    const busyHistory = await pool.query(
      `
      SELECT sh.housekeeper_id AS assigned_to, sh.preferred_time, st.duration
      FROM service_history sh
      JOIN service_types st ON sh.service_type_id = st.id
      WHERE sh.preferred_date = $1
        AND sh.housekeeper_id IS NOT NULL
        AND sh.status IN ('approved','in_progress')
      `,
      [preferred_date]
    );

    const combinedBusy = [...busyReqs.rows, ...busyHistory.rows];

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const newStartMin = toMinutes(startTime);
    const newEndMin = toMinutes(endTimeStr);

    const busyIdsSet = new Set();

    for (const row of combinedBusy) {
      if (!row.assigned_to) continue;
      const otherStartMin = toMinutes(row.preferred_time);
      const otherDuration = row.duration;
      const otherEndMin = (otherStartMin + otherDuration) % (24 * 60);

      if (otherStartMin < newEndMin && otherEndMin > newStartMin) {
        busyIdsSet.add(String(row.assigned_to));
      }
    }

    const busyIds = Array.from(busyIdsSet);
    const freeHk = availableHk.rows.filter(
      (hk) => !busyIds.includes(String(hk.id))
    );

    if (freeHk.length === 0) {
      const pending = await pool.query(
        `INSERT INTO housekeeping_requests
         (user_id, room_id, preferred_date, preferred_time, service_type_id, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [userId, roomId, preferred_date, normalizedTime, serviceTypeId]
      );

      // Only notify admin if requester is not admin/superadmin
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        const adminRes = await pool.query(
          `SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND LOWER(facility) = LOWER($1) LIMIT 1`,
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
      }

      return res.json({
        ...pending.rows[0],
        message:
          "No housekeeper available right now (all off-duty, busy, or on day-off). Request pending approval.",
      });
    }

    const counts = await pool.query(
      `
  SELECT assigned_to AS hk_id, COUNT(*) AS tasks_today
  FROM housekeeping_requests
  WHERE DATE(created_at) = $1
    AND assigned_to IS NOT NULL
    AND status IN ('approved','in_progress')
  GROUP BY assigned_to
  `,
      [todayDate]
    );

    const countMap = {};
    counts.rows.forEach((row) => {
      countMap[row.hk_id] = parseInt(row.tasks_today);
    });

    freeHk.sort((a, b) => {
      const countA = countMap[a.id] || 0;
      const countB = countMap[b.id] || 0;
      if (countA === countB) return a.name.localeCompare(b.name);
      return countA - countB;
    });

    const selectedHk = freeHk[0];

    const newReq = await pool.query(
      `INSERT INTO housekeeping_requests
       (user_id, room_id, preferred_date, preferred_time, service_type_id, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, 'approved', $6)
       RETURNING *`,
      [
        userId,
        roomId,
        preferred_date,
        normalizedTime,
        serviceTypeId,
        selectedHk.id,
      ]
    );

    // Only notify admin if requester is not admin/superadmin
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      const adminRes = await pool.query(
        `SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND LOWER(facility) = LOWER($1) LIMIT 1`,
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
      console.log(`Housekeeper Assigned to user:${userId}`);
    }

    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [
        selectedHk.id,
        `A new housekeeping task has been assigned to you for ${room_number} at ${normalizedTime}.`,
      ]
    );

    if (io) {
      io.to(`user:${selectedHk.id}`).emit("newAssignment", {
        message: `You have been assigned a new housekeeping request for ${room_number} on ${preferred_date} at ${normalizedTime}.`,
        room: room_number,
        facility: facilityKey,
      });
      console.log(`New assignment to user:${selectedHk.id}`);
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

// GET all requests - SUPERADMIN SUPPORT
router.get("/", authorization, async (req, res) => {
  try {
    const { id: adminId, role, facility } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT hr.*, 
               (u.first_name || ' ' || u.last_name) AS guest_name, 
               r.room_number,
               r.facility,
               st.name AS service_type_name,
               (hk.first_name || ' ' || hk.last_name) AS housekeeper_name
        FROM housekeeping_requests hr
        JOIN users u ON hr.user_id = u.id
        JOIN rooms r ON hr.room_id = r.id
        LEFT JOIN service_types st ON hr.service_type_id = st.id
        LEFT JOIN users hk ON hr.assigned_to = hk.id
        WHERE r.facility IN ('RCC', 'Hotel Rafael')
        AND hr.archived = FALSE
        ORDER BY r.facility, hr.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT hr.*, 
               (u.first_name || ' ' || u.last_name) AS guest_name, 
               r.room_number,
               st.name AS service_type_name,
               (hk.first_name || ' ' || hk.last_name) AS housekeeper_name
        FROM housekeeping_requests hr
        JOIN users u ON hr.user_id = u.id
        JOIN rooms r ON hr.room_id = r.id
        LEFT JOIN service_types st ON hr.service_type_id = st.id
        LEFT JOIN users hk ON hr.assigned_to = hk.id
        WHERE r.facility = $1
        AND hr.archived = FALSE
        ORDER BY hr.created_at DESC
      `;
      params = [facility];
    }

    const requests = await pool.query(query, params);

    res.json(requests.rows);
  } catch (err) {
    console.error("Error fetching requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Assign housekeeper - SUPERADMIN SUPPORT
router.put("/:id/assign", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { housekeeperId } = req.body;
    const { id: adminId, role, facility } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Get the request to find its facility
    const requestCheck = await pool.query(
      `SELECT r.facility 
       FROM housekeeping_requests hr
       JOIN rooms r ON hr.room_id = r.id
       WHERE hr.id = $1`,
      [id]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    const requestFacility = requestCheck.rows[0].facility;

    // For superadmin, check housekeeper is in the same facility as the request
    // For regular admin, check both facility and that it matches their facility
    let hkCheckQuery;
    let hkCheckParams;

    if (role === 'superadmin') {
      hkCheckQuery = `
        SELECT (first_name || ' ' || last_name) AS name, is_active, facility
        FROM users 
        WHERE id = $1::uuid 
          AND role = 'housekeeper' 
          AND LOWER(facility) = LOWER($2)
      `;
      hkCheckParams = [housekeeperId, requestFacility];
    } else {
      // Regular admin must assign within their own facility
      if (requestFacility.toLowerCase() !== facility.toLowerCase()) {
        return res.status(403).json({ error: "Cannot assign requests from other facilities." });
      }
      
      hkCheckQuery = `
        SELECT (first_name || ' ' || last_name) AS name, is_active 
        FROM users 
        WHERE id = $1::uuid 
          AND role = 'housekeeper' 
          AND LOWER(facility) = LOWER($2)
      `;
      hkCheckParams = [housekeeperId, facility];
    }

    const hkCheck = await pool.query(hkCheckQuery, hkCheckParams);

    if (hkCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Housekeeper not found in the request's facility." });
    }

    if (!hkCheck.rows[0].is_active) {
      return res.status(400).json({
        error: "This housekeeper is currently disabled and cannot be assigned.",
      });
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

    // Insert into service_history
    await pool.query(
      `
      INSERT INTO service_history (
        request_id, guest_id, housekeeper_id, room_id, facility,
        service_type_id, preferred_date, preferred_time, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
      `,
      [
        reqData.id,
        reqData.user_id,
        housekeeperId,
        reqData.room_id,
        requestFacility,
        reqData.service_type_id,
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

// Check housekeeper availability
router.get("/availability", authorization, async (req, res) => {
  try {
    const { serviceType, serviceTypeId } = req.query;

    const date = new Date().toISOString().split("T")[0];
    const facility = req.user.facility;

    console.log('Checking availability for:', { serviceType, serviceTypeId, facility, date });

    let duration, foundServiceTypeId;

    // Try to find by ID first (preferred method)
    if (serviceTypeId) {
      const serviceTypeRes = await pool.query(
        "SELECT id, duration, name FROM service_types WHERE id = $1 AND LOWER(facility) = LOWER($2)",
        [serviceTypeId, facility]
      );

      if (serviceTypeRes.rows.length > 0) {
        foundServiceTypeId = serviceTypeRes.rows[0].id;
        duration = serviceTypeRes.rows[0].duration;
      }
    }

    // If not found by ID, try by name
    if (!duration && serviceType) {
      const serviceTypeRes = await pool.query(
        "SELECT id, duration, name FROM service_types WHERE LOWER(name) = LOWER($1) AND LOWER(facility) = LOWER($2)",
        [serviceType, facility]
      );

      if (serviceTypeRes.rows.length > 0) {
        foundServiceTypeId = serviceTypeRes.rows[0].id;
        duration = serviceTypeRes.rows[0].duration;
      }
    }

    // If still not found, return error with available types (exclude Checkout)
    if (!duration) {
      const availableTypes = await pool.query(
        "SELECT id, name FROM service_types WHERE LOWER(facility) = LOWER($1) AND LOWER(name) != 'checkout'",
        [facility]
      );
      
      return res.status(400).json({ 
        error: "Invalid service type",
        serviceTypeProvided: serviceType || serviceTypeId,
        availableServiceTypes: availableTypes.rows
      });
    }

    // Get all housekeepers with their schedules
    const housekeepers = await pool.query(
      `SELECT u.id, s.shift_time_in, s.shift_time_out, s.day_offs
       FROM users u
       JOIN housekeeper_schedule s ON s.housekeeper_id = u.id
       WHERE u.role = 'housekeeper' AND u.is_active = TRUE AND LOWER(u.facility) = LOWER($1)`,
      [facility]
    );

    // Get busy times from housekeeping_requests
    const busy = await pool.query(
      `SELECT hr.assigned_to AS housekeeper_id, hr.preferred_time, st.duration
       FROM housekeeping_requests hr
       JOIN service_types st ON hr.service_type_id = st.id
       WHERE hr.preferred_date = $1
       AND hr.assigned_to IS NOT NULL
       AND hr.status IN ('approved', 'in_progress')`,
      [date]
    );

    // Get busy times from service_history
    const busyHistory = await pool.query(
      `SELECT sh.housekeeper_id, sh.preferred_time, st.duration
       FROM service_history sh
       JOIN service_types st ON sh.service_type_id = st.id
       WHERE sh.preferred_date = $1
       AND sh.housekeeper_id IS NOT NULL
       AND sh.status IN ('approved', 'in_progress')`,
      [date]
    );

    const startHour = 0;
    const endHour = 24;
    const selectedDay = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Helper function to convert time string to minutes
    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Build a map of busy intervals for each housekeeper
    const busyMap = {};

    // Combine both busy arrays
    const allBusy = [...busy.rows, ...busyHistory.rows];

    for (const b of allBusy) {
      const hkId = b.housekeeper_id;
      const startMin = toMinutes(b.preferred_time);
      const endMin = startMin + b.duration;
      
      if (!busyMap[hkId]) busyMap[hkId] = [];
      busyMap[hkId].push({ start: startMin, end: endMin });
    }

    console.log('Busy map:', JSON.stringify(busyMap, null, 2));

    const availability = {};

    // Generate all possible time slots
    for (
      let timeInMinutes = startHour * 60;
      timeInMinutes < endHour * 60;
      timeInMinutes += duration
    ) {
      const slotStart = timeInMinutes;
      const slotEnd = slotStart + duration;

      // Don't create slots that extend past end hour
      if (slotEnd > endHour * 60) continue;

      const hour = Math.floor(timeInMinutes / 60);
      const minute = timeInMinutes % 60;

      const timeKey = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

      // Check if ANY housekeeper is available for this slot
      const availableHousekeepers = housekeepers.rows.filter((hk) => {
        // Check if it's their day off
        const isDayOff = hk.day_offs?.includes(selectedDay);
        if (isDayOff) {
          console.log(`Housekeeper ${hk.id} is off on ${selectedDay}`);
          return false;
        }

        // Check if the slot falls within their shift
        const shiftStart = toMinutes(hk.shift_time_in);
        const shiftEnd = toMinutes(hk.shift_time_out);
        
        // Handle shifts that cross midnight
        let isWithinShift;
        if (shiftStart <= shiftEnd) {
          // Normal shift (e.g., 8:00 to 17:00)
          isWithinShift = slotStart >= shiftStart && slotEnd <= shiftEnd;
        } else {
          // Overnight shift (e.g., 22:00 to 06:00)
          isWithinShift = slotStart >= shiftStart || slotEnd <= shiftEnd;
        }

        if (!isWithinShift) {
          console.log(`Slot ${timeKey} is outside shift for housekeeper ${hk.id}`);
          return false;
        }

        // Check if they have any conflicting busy intervals
        const blockedIntervals = busyMap[hk.id] || [];
        const hasConflict = blockedIntervals.some((b) => {
          // Two intervals overlap if: start1 < end2 AND end1 > start2
          const overlaps = slotStart < b.end && slotEnd > b.start;
          if (overlaps) {
            console.log(`Housekeeper ${hk.id} is busy during ${timeKey}: slot ${slotStart}-${slotEnd} overlaps with busy ${b.start}-${b.end}`);
          }
          return overlaps;
        });

        return !hasConflict;
      });

      availability[timeKey] = availableHousekeepers.length > 0;
      
      if (!availability[timeKey]) {
        console.log(`No housekeepers available for ${timeKey}`);
      }
    }

    console.log('Final availability:', availability);
    res.json(availability);
  } catch (err) {
    console.error("Error checking availability:", err);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// Fetch user requests today count
router.get("/user/today", authorization, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });

    const result = await pool.query(
      `
      SELECT COUNT(*) AS count FROM (
        SELECT id FROM housekeeping_requests
        WHERE user_id = $1 AND preferred_date = $2 AND archived = FALSE

        UNION ALL

        SELECT id FROM service_history
        WHERE guest_id = $1 AND preferred_date = $2
      ) t
      `,
      [userId, today]
    );

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Error fetching user request count (today):", err);
    res.status(500).json({ error: "Server error fetching request count" });
  }
});

// Fetch user requests all time count
router.get("/user/total", authorization, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT COUNT(*) AS count FROM (
        SELECT id FROM housekeeping_requests
        WHERE user_id = $1 AND archived = FALSE

        UNION ALL

        SELECT id FROM service_history
        WHERE guest_id = $1
      ) t
      `,
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Error fetching user's total request count:", err);
    res
      .status(500)
      .json({ error: "Server error fetching total request count" });
  }
});

// SUPERADMIN SUPPORT - Get admin total requests
router.get("/admin/total", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT COUNT(*) AS count
        FROM service_history
        WHERE facility IN ('RCC', 'Hotel Rafael')
          AND status = 'completed'
      `;
      params = [];
    } else {
      query = `
        SELECT COUNT(*) AS count
        FROM service_history
        WHERE facility = $1
          AND status = 'completed'
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Error fetching admin completed requests:", err);
    res
      .status(500)
      .json({ error: "Server error fetching admin completed requests" });
  }
});

router.get("/housekeeper/total-done", authorization, async (req, res) => {
  try {
    const housekeeperId = req.user.id;

    if (req.user.role !== "housekeeper" && req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const totalTasksRes = await pool.query(
      `SELECT COUNT(*) AS total_done
       FROM service_history
       WHERE housekeeper_id = $1 AND status = 'completed'`,
      [housekeeperId]
    );

    res.json({
      totalDone: parseInt(totalTasksRes.rows[0].total_done, 10) || 0,
    });
  } catch (err) {
    console.error("Error fetching housekeeper total tasks done:", err);
    res.status(500).json({ error: "Server error fetching total tasks" });
  }
});

router.get("/service-types", authorization, async (req, res) => {
  try {
    const { facility } = req.user;

    const types = await pool.query(
      "SELECT id, name, duration FROM service_types WHERE LOWER(facility) = LOWER($1) AND LOWER(name) != 'checkout' ORDER BY name ASC",
      [facility]
    );
    res.json(types.rows);
  } catch (err) {
    console.error("Error fetching service types:", err);
    res.status(500).json({ error: "Failed to fetch service types" });
  }
});

module.exports = router;