const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const { getIo } = require("../realtime");
const { createNotification } = require("../utils/notifications");

// Get rooms
router.get("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    let query;
    let params;

    if (role === "superadmin") {
      query = `
        SELECT 
          r.id, 
          r.facility, 
          r.room_number, 
          b.id AS booking_id, 
          b.time_in, 
          b. time_out, 
          u.id AS guest_id, 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          (b.time_in <= NOW()) AS is_active,
          CASE 
            WHEN b.time_out IS NOT NULL AND b.time_out <= NOW() THEN TRUE
            ELSE FALSE
          END AS is_overdue,
          COALESCE(unpaid. unpaid_count, 0) AS unpaid_count,
          COALESCE(unpaid.total_unpaid, 0) AS total_unpaid
        FROM rooms r
        LEFT JOIN LATERAL (
          SELECT * FROM room_bookings rb
          WHERE rb.room_id = r.id
          ORDER BY rb.time_in DESC
          LIMIT 1
        ) b ON true
        LEFT JOIN users u ON b.guest_id = u.id
        LEFT JOIN LATERAL (
          SELECT 
            COUNT(*) as unpaid_count,
            COALESCE(SUM(charge_amount), 0) as total_unpaid
          FROM borrowed_items
          WHERE user_id = b.guest_id 
            AND is_paid = FALSE
            AND delivery_status = 'delivered'
        ) unpaid ON b.guest_id IS NOT NULL
        WHERE r.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY r.facility, r.room_number;
      `;
      params = [];
    } else {
      query = `
        SELECT 
          r.id, 
          r.facility, 
          r. room_number, 
          b.id AS booking_id, 
          b.time_in, 
          b.time_out, 
          u.id AS guest_id, 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          (b.time_in <= NOW()) AS is_active,
          CASE 
            WHEN b. time_out IS NOT NULL AND b.time_out <= NOW() THEN TRUE
            ELSE FALSE
          END AS is_overdue,
          COALESCE(unpaid.unpaid_count, 0) AS unpaid_count,
          COALESCE(unpaid.total_unpaid, 0) AS total_unpaid
        FROM rooms r
        LEFT JOIN LATERAL (
          SELECT * FROM room_bookings rb
          WHERE rb.room_id = r. id
          ORDER BY rb.time_in DESC
          LIMIT 1
        ) b ON true
        LEFT JOIN users u ON b. guest_id = u.id
        LEFT JOIN LATERAL (
          SELECT 
            COUNT(*) as unpaid_count,
            COALESCE(SUM(charge_amount), 0) as total_unpaid
          FROM borrowed_items
          WHERE user_id = b.guest_id 
            AND is_paid = FALSE
            AND delivery_status = 'delivered'
        ) unpaid ON b.guest_id IS NOT NULL
        WHERE r.facility = $1
        ORDER BY r. room_number;
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    const rooms = result.rows.map((room) => ({
      id: room.id,
      facility: room.facility,
      room_number: room.room_number,
      booking:  room.booking_id
        ?  {
            booking_id: room.booking_id,
            guest_id: room.guest_id,
            guest_name: room.guest_name,
            time_in: room.time_in,
            time_out: room.time_out,
            is_active: room.is_active,
            is_overdue:  room.is_overdue,
            unpaid_count: parseInt(room.unpaid_count) || 0,
            total_unpaid: parseFloat(room.total_unpaid) || 0,
          }
        : null,
    }));

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err. message);
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
      SELECT rb.id, rb.guest_id, rb.time_in, rb.time_out,
             CONCAT_WS(' ', u.first_name, u.last_name) as guest_name
      FROM room_bookings rb
      JOIN users u ON rb.guest_id = u.id
      WHERE rb.room_id = $1
      ORDER BY rb.time_in DESC
      LIMIT 1
      `,
      [id]
    );

    if (roomOverlap.rows.length > 0) {
      const existing = roomOverlap.rows[0];
      console.log("⚠️ Room already has a booking:", existing);

       return res.status(400).json({ 
        error: "Room already has an active or scheduled booking.",
        details: `${existing.guest_name} is currently assigned to this room.`
      });
    }

    const guestOverlap = await pool.query(
      `
      SELECT rb.id, r.room_number, rb.time_in, rb.time_out
      FROM room_bookings rb
      JOIN rooms r ON rb.room_id = r. id
      WHERE rb.guest_id = $1
      ORDER BY rb.time_in DESC
      LIMIT 1
      `,
      [guest_id]
    );

    if (guestOverlap.rows.length > 0) {
      const existing = guestOverlap.rows[0];
      console.log("⚠️ Guest already has a booking:", existing);
      
      return res.status(400).json({ 
        error: "Guest is already assigned to a room.",
        details: `Currently in Room ${existing.room_number}.`
      });
    }

    const newBooking = await pool.query(
      `
      INSERT INTO room_bookings (room_id, guest_id, time_in, time_out)
      VALUES ($1, $2, NOW(), $3::timestamptz)
      RETURNING *
      `,
      [id, guest_id, time_out || null]
    );

    const updatedUser = await pool.query(
      `
      UPDATE users 
      SET facility = (SELECT facility FROM rooms WHERE id = $1) 
      WHERE id = $2
      RETURNING id, email, role, facility
      `,
      [id, guest_id]
    );

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
      facility: updatedUser.rows[0].facility,
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
    const { role, facility } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const roomRes = await pool.query(
      `SELECT r.id, r.room_number, r.facility
       FROM rooms r
       WHERE r.id = $1`,
      [id]
    );

    if (roomRes.rows.length === 0) {
      return res.status(404).json({ error: "Room not found." });
    }

    const room = roomRes.rows[0];

    if (role === 'admin' && room.facility.toLowerCase() !== facility.toLowerCase()) {
      return res.status(403).json({ error: "Cannot manage rooms from other facilities." });
    }

    // *** CRITICAL FIX: Get guest_id FIRST, then check their unpaid items ***
    const bookingCheck = await pool.query(
      `SELECT rb.guest_id, 
              CONCAT_WS(' ', u.first_name, u.last_name) as guest_name
       FROM room_bookings rb
       JOIN users u ON rb.guest_id = u.id
       WHERE rb.room_id = $1 
         AND rb.time_in <= NOW() 
         AND (rb.time_out IS NULL OR rb.time_out > NOW())
       LIMIT 1`,
      [id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(400).json({ error: "No active booking found for this room." });
    }

    const guestId = bookingCheck.rows[0].guest_id;
    const guestName = bookingCheck.rows[0].guest_name;

    console.log("\n=== MANUAL CHECKOUT DEBUG ===");
    console.log("Guest ID:", guestId);
    console.log("Guest Name:", guestName);
    console.log("Room:", room.room_number);

    const unpaidItems = await pool.query(
      `SELECT COUNT(*) as unpaid_count, 
              COALESCE(SUM(charge_amount), 0) as total_unpaid
       FROM borrowed_items
       WHERE user_id = $1 
         AND is_paid = false
         AND delivery_status = 'delivered'`,
      [guestId]
    );

    const unpaidCount = parseInt(unpaidItems.rows[0].unpaid_count);
    const totalUnpaid = parseFloat(unpaidItems.rows[0].total_unpaid || 0);

    console.log("Unpaid Count:", unpaidCount);
    console.log("Total Unpaid:", totalUnpaid);
    console.log("Will block? :", unpaidCount > 0);
    console.log("=== END DEBUG ===\n");

    if (unpaidCount > 0) {
      console.log(`❌ Manual checkout blocked for ${guestName} - ${unpaidCount} unpaid items (₱${totalUnpaid.toFixed(2)})`);
      
      return res.status(400).json({ 
        error: "Cannot check out guest with pending payments",
        message: `Guest has ${unpaidCount} unpaid item(s) totaling ₱${totalUnpaid.toFixed(2)}. Please settle payment first.`,
        unpaid_count: unpaidCount,
        total_amount: totalUnpaid.toFixed(2),
        blocked: true
      });
    }

    console.log(`✅ Manual checkout ALLOWED for ${guestName}`);

    // No unpaid items - proceed with checkout
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

    const updatedUser = await pool.query(
      "UPDATE users SET facility = NULL WHERE id = $1 RETURNING id, email, role, facility", 
      [guestId]
    );

    const jwtGenerator = require("../utils/jwtGenerator");
    const newToken = jwtGenerator({
      id: updatedUser.rows[0].id,
      email: updatedUser.rows[0].email,
      role: updatedUser.rows[0].role,
      facility: updatedUser.rows[0].facility,
    });

    console.log(`✓ Manually checked out ${guestName} from Room ${room.room_number}`);

    // Auto-create checkout cleaning request
    const serviceTypeRes = await pool.query(
      `SELECT id, duration FROM service_types 
       WHERE LOWER(facility) = LOWER($1) 
       AND LOWER(name) = 'checkout'
       LIMIT 1`,
      [room.facility]
    );

    let autoCleaningCreated = false;

    if (serviceTypeRes.rows.length > 0) {
      const serviceTypeId = serviceTypeRes.rows[0].id;
      const durationMinutes = serviceTypeRes.rows[0].duration;
      
      const today = new Date();
      const preferred_date = today.toISOString().split("T")[0];
      
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const preferred_time = now.toTimeString().split(' ')[0]; 

      const facilityKey = room.facility.trim().toLowerCase();
      const currentDay = new Date().toLocaleString("en-US", { weekday: "long" });

      const availableHk = await pool.query(
        `SELECT 
          u.id, 
          (u.first_name || ' ' || u.last_name) AS name,
          hs.shift_time_in, 
          hs.shift_time_out
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
          )`,
        [facilityKey, currentDay, preferred_time]
      );

if (availableHk.rows. length > 0) {
  const busyReqs = await pool.query(
    `SELECT hr.assigned_to, hr.preferred_time, st.duration
     FROM housekeeping_requests hr
     JOIN service_types st ON hr.service_type_id = st.id
     WHERE hr.preferred_date = $1
       AND hr.assigned_to IS NOT NULL
       AND hr.status IN ('approved','in_progress')`,
    [preferred_date]
  );

  const busyHistory = await pool. query(
    `SELECT sh.housekeeper_id AS assigned_to, sh.preferred_time, st.duration
     FROM service_history sh
     JOIN service_types st ON sh.service_type_id = st.id
     WHERE sh.preferred_date = $1
       AND sh.housekeeper_id IS NOT NULL
       AND sh.status IN ('approved','in_progress')`,
    [preferred_date]
  );

  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const toTimeString = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  const newStartMin = toMinutes(preferred_time);
  const newEndMin = newStartMin + durationMinutes;

  // Build a map of each housekeeper's busy periods
  const housekeeperBusyPeriods = {};
  availableHk.rows.forEach(hk => {
    housekeeperBusyPeriods[hk.id] = [];
  });

  [... busyReqs.rows, ... busyHistory.rows].forEach(row => {
    if (!row.assigned_to || ! housekeeperBusyPeriods[row.assigned_to]) return;
    const otherStartMin = toMinutes(row.preferred_time);
    const otherEndMin = otherStartMin + row. duration;
    housekeeperBusyPeriods[row.assigned_to]. push({
      start: otherStartMin,
      end: otherEndMin
    });
  });

  // Sort busy periods for each housekeeper by start time
  Object.keys(housekeeperBusyPeriods).forEach(hkId => {
    housekeeperBusyPeriods[hkId].sort((a, b) => a.start - b.start);
  });

  // Function to check if a housekeeper is free during a time slot
  const isHousekeeperFree = (hkId, startMin, endMin) => {
    const periods = housekeeperBusyPeriods[hkId];
    for (const period of periods) {
      if (startMin < period.end && endMin > period.start) {
        return false; // Overlaps with busy period
      }
    }
    return true;
  };

  // Function to find earliest available time for a housekeeper
  const findEarliestAvailableTime = (hkId, requestedStartMin, shiftEndMin) => {
    let currentStart = requestedStartMin;
    const periods = housekeeperBusyPeriods[hkId];
    
    for (const period of periods) {
      const currentEnd = currentStart + durationMinutes;
      
      // If current slot doesn't overlap, we found it
      if (currentEnd <= period.start) {
        return currentStart;
      }
      
      // If it overlaps, try after this busy period
      if (currentStart < period.end) {
        currentStart = period.end;
      }
    }
    
    // Check if the slot after all busy periods fits before shift ends
    if (currentStart + durationMinutes <= shiftEndMin) {
      return currentStart;
    }
    
    return null; // No available time today
  };

  // First, try to find housekeepers who are free RIGHT NOW
  const freeHk = availableHk.rows. filter(hk => 
    isHousekeeperFree(hk.id, newStartMin, newEndMin)
  );

  let selectedHk = null;
  let assignedTime = preferred_time;

  if (freeHk.length > 0) {
    // Found free housekeepers - use the one with least tasks today
    const counts = await pool.query(
      `SELECT assigned_to AS hk_id, COUNT(*) AS tasks_today
       FROM housekeeping_requests
       WHERE DATE(created_at) = $1
         AND assigned_to IS NOT NULL
         AND status IN ('approved','in_progress')
       GROUP BY assigned_to`,
      [preferred_date]
    );

    const countMap = {};
    counts.rows.forEach(row => {
      countMap[row.hk_id] = parseInt(row.tasks_today);
    });

    freeHk.sort((a, b) => {
      const countA = countMap[a.id] || 0;
      const countB = countMap[b. id] || 0;
      if (countA === countB) return a.name.localeCompare(b. name);
      return countA - countB;
    });

    selectedHk = freeHk[0];
    console.log(`✓ Found immediately available housekeeper: ${selectedHk.name}`);
  } else {
    // No one is free right now - find who becomes available earliest
    console.log(`⚠️ No housekeepers immediately available, finding earliest slot...`);
    
    const availabilityMap = [];
    
    for (const hk of availableHk.rows) {
      const shiftEndMin = toMinutes(hk.shift_time_out);
      const earliestTime = findEarliestAvailableTime(hk.id, newStartMin, shiftEndMin);
      
      if (earliestTime !== null) {
        availabilityMap.push({
          housekeeper: hk,
          availableAtMin: earliestTime,
          availableAtTime: toTimeString(earliestTime)
        });
      }
    }

    if (availabilityMap.length > 0) {
      // Sort by earliest available time
      availabilityMap.sort((a, b) => a.availableAtMin - b.availableAtMin);
      
      const earliest = availabilityMap[0];
      selectedHk = earliest.housekeeper;
      assignedTime = earliest.availableAtTime;
      
      console.log(`✓ Assigned to ${selectedHk.name} at ${assignedTime} (earliest available)`);
    } else {
      console.log(`✗ No housekeepers available today within their shifts`);
    }
  }

  // If we found a housekeeper (either immediately or scheduled for later)
  if (selectedHk) {
    const adminRes = await pool.query(
      `SELECT id FROM users 
       WHERE role IN ('admin', 'superadmin') 
       AND LOWER(facility) = LOWER($1) 
       LIMIT 1`,
      [facilityKey]
    );

    const requesterId = adminRes.rows. length > 0 ? adminRes.rows[0].id : req.user.id;

    await pool.query(
      `INSERT INTO housekeeping_requests
       (user_id, room_id, preferred_date, preferred_time, service_type_id, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, 'approved', $6)`,
      [requesterId, room.id, preferred_date, assignedTime, serviceTypeId, selectedHk.id]
    );

    const timeDisplay = assignedTime.substring(0, 5);
    await createNotification(
      selectedHk.id,
      `Automatic checkout cleaning:  Room ${room.room_number} at ${timeDisplay}. `
    );

    const io = getIo();
    if (io) {
      io.to(`user:${selectedHk.id}`).emit("newAssignment", {
        message: `Automatic checkout cleaning assigned:  Room ${room.room_number} at ${timeDisplay}`,
        room: room.room_number,
        facility: facilityKey,
        auto_created: true,
        scheduled_time: assignedTime
      });
    }

    autoCleaningCreated = true;
  }
}
    }

    const io = getIo();
    if (io) {
      io.to(`facility:${room.facility.toLowerCase()}`).emit("booking:removed", {
        room_id: room.id,
        room_number: room.room_number,
      });

      if (guestId) {
        io.to(`user:${guestId}`).emit("booking:removed", {
          message: "You have been checked out.",
        });
      }
    }

    res.json({
      message: "Guest checked out successfully.",
      history: result.rows[0],
      token: newToken,
      guest_id: guestId,
      auto_cleaning: autoCleaningCreated 
        ? "Checkout cleaning request created automatically"
        : "No 'Checkout' service type found or no available housekeepers"
    });
  } catch (err) {
    console.error("Error removing guest:", err.message);
    res.status(500).send("Server error");
  }
});

const handleRemove = async (room) => {
  if (role === "superadmin") {
    alert("Superadmins can only view rooms. Guest checkout is restricted to facility admins.");
    return;
  }

  if (!window.confirm(`Check out guest from ${room.room_number}?`)) return;

  try {
    const res = await fetch(`http://localhost:5000/rooms/${room.id}/remove`, {
      method: "PUT",
      headers: { token: localStorage.token },
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));

      if (j.unpaid_count && j.total_amount) {
        alert(
          `${j.error}\n\n` +
          `Unpaid items: ${j.unpaid_count}\n` +
          `Total amount: ₱${j.total_amount}\n\n` +
          `Please settle payments in the Borrowed Items section before checking out.`
        );
      } else {
        alert("Checkout failed: " + (j.error || j.message || res.status));
      }
      return;
    }

    const data = await res.json();

    const token = localStorage.getItem("token");
    if (token && data.token) {
      try {
        const currentUser = JSON.parse(atob(token.split('.')[1]));
        if (currentUser.id === room.booking?.guest_id) {
          console.log("Current user was checked out - updating token and reloading");
          localStorage.setItem("token", data.token);
          
          alert("You have been checked out. The page will reload to update your session.");
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
          return;
        }
      } catch (parseError) {
        console.error("Error parsing token:", parseError);
      }
    }

    await fetchRooms();
    alert("Guest checked out successfully.");
    
  } catch (err) {
    console.error("Remove error:", err);
    alert("Network error. Please check your connection.");
  }
};

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

    const roomFacility =
      role === "superadmin" && targetFacility ? targetFacility : facility;

    if (!room_number || room_number.trim() === "") {
      return res.status(400).json({ error: "Room number is required." });
    }

    const exists = await pool.query(
      "SELECT 1 FROM rooms WHERE facility = $1 AND room_number = $2",
      [roomFacility, room_number.trim()]
    );

    if (exists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Room already exists in this facility." });
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

    if (!updated.rows.length)
      return res.status(404).json({ error: "Room not found." });

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
      return res
        .status(400)
        .json({ error: "Cannot delete — room currently occupied." });
    }

    const deleted = await pool.query(
      "DELETE FROM rooms WHERE id = $1 RETURNING *",
      [id]
    );

    if (!deleted.rows.length)
      return res.status(404).json({ error: "Room not found." });

    getIo().emit("room:deleted", deleted.rows[0]);
    res.json({ message: "Room deleted", room: deleted.rows[0] });
  } catch (err) {
    console.error("Error deleting room:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
