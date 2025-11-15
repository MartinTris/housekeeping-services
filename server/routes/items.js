const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.post("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const { name, quantity, price } = req.body;

    if (!name || quantity == null || price == null)
      return res.status(400).json({ error: "Missing required fields" });

    const duplicate = await pool.query(
      `SELECT * FROM borrowable_items 
       WHERE LOWER(name) = LOWER($1) AND facility = $2`,
      [name, facility]
    );

    if (duplicate.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "An item with this name already exists." });
    }

    const result = await pool.query(
      `INSERT INTO borrowable_items (facility, name, quantity, price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [facility, name, quantity, price]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", authorization, async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const facility = userRes.rows[0].facility;

    if (!facility) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT * FROM borrowable_items WHERE facility = $1 ORDER BY created_at DESC`,
      [facility]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching items:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `DELETE FROM borrowable_items WHERE id = $1 AND facility = $2 RETURNING *`,
      [id, facility]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Item not found or unauthorized" });

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    const { id } = req.params;
    const { quantity, price } = req.body;

    if (role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quantity == null || price == null) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await pool.query(
      `UPDATE borrowable_items 
       SET quantity = $1, price = $2 
       WHERE id = $3 AND facility = $4 
       RETURNING *`,
      [quantity, price, id, facility]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Item not found or unauthorized" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/borrow", authorization, async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { item_id, quantity } = req.body;

    if (role !== "guest") {
      return res.status(403).json({ error: "Only guests can borrow items." });
    }

    const userRes = await pool.query(
      "SELECT facility, first_name, last_name FROM users WHERE id = $1",
      [user_id]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "User not found." });

    const { facility, first_name, last_name } = userRes.rows[0];

    if (!facility) {
      return res
        .status(400)
        .json({ error: "You are not assigned to a facility." });
    }

    if (!item_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Invalid item or quantity." });
    }

    const itemRes = await pool.query(
      "SELECT * FROM borrowable_items WHERE id = $1 AND facility = $2",
      [item_id, facility]
    );
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: "Item not found." });

    if (item.quantity < quantity) {
      return res.status(400).json({ error: "Not enough stock available." });
    }

    const guestName = `${first_name} ${last_name}`;
    const facilityKey = facility.trim().toLowerCase();

    const bookingRes = await pool.query(
      `SELECT rb.room_id, r.room_number
       FROM room_bookings rb
       JOIN rooms r ON rb.room_id = r.id
       WHERE rb.guest_id = $1
         AND rb.time_in <= NOW()
         AND (rb.time_out IS NULL OR rb.time_out > NOW())
       ORDER BY rb.time_in DESC
       LIMIT 1`,
      [user_id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(400).json({ error: "No active room booking found." });
    }

    const { room_number } = bookingRes.rows[0];

    // AUTO-ASSIGN HOUSEKEEPER FOR DELIVERY
    // Get active housekeepers in the facility
    const availableHk = await pool.query(
      `
      SELECT 
        u.id,
        (u.first_name || ' ' || u.last_name) AS name
      FROM users u
      JOIN housekeeper_schedule s ON u.id = s.housekeeper_id
      WHERE u.role = 'housekeeper'
        AND u.is_active = TRUE
        AND LOWER(u.facility) = LOWER($1)
        -- exclude housekeepers whose current day is in their day_offs array
        AND NOT (TRIM(to_char(CURRENT_DATE, 'Day')) = ANY(s.day_offs))
        -- exclude housekeepers not currently within their shift time
        AND (
          (CURRENT_TIME AT TIME ZONE 'Asia/Manila') BETWEEN s.shift_time_in AND s.shift_time_out
        )
      `,
      [facilityKey]
    );

    let assignedHousekeeperId;
    let assignedHousekeeperName;

    if (availableHk.rows.length === 0) {
      assignedHousekeeperId = null;
      assignedHousekeeperName = null;
    } else {
      // Exclude busy housekeepers with ongoing housekeeping tasks today
      const busyHk = await pool.query(`
        SELECT DISTINCT assigned_to
        FROM housekeeping_requests
        WHERE status IN ('approved', 'in_progress')
          AND archived = FALSE
          AND assigned_to IS NOT NULL
          AND preferred_date = CURRENT_DATE
      `);

      const busyIds = busyHk.rows.map((r) => String(r.assigned_to));
      const freeHk = availableHk.rows.filter(
        (hk) => !busyIds.includes(String(hk.id))
      );

      const candidates = freeHk.length > 0 ? freeHk : availableHk.rows;

      // Count ongoing deliveries for fairness
      const counts = await pool.query(`
        SELECT housekeeper_id, COUNT(*) AS delivery_count
        FROM borrowed_items
        WHERE housekeeper_id IS NOT NULL
          AND delivery_status IN ('pending_delivery', 'in_progress')
          AND created_at::date = CURRENT_DATE
        GROUP BY housekeeper_id
      `);

      const countMap = {};
      counts.rows.forEach((row) => {
        countMap[row.housekeeper_id] = parseInt(row.delivery_count);
      });

      // Sort by least tasks, then alphabetically
      candidates.sort((a, b) => {
        const countA = countMap[a.id] || 0;
        const countB = countMap[b.id] || 0;
        if (countA === countB) return a.name.localeCompare(b.name);
        return countA - countB;
      });

      const selectedHk = candidates[0];
      assignedHousekeeperId = selectedHk.id;
      assignedHousekeeperName = selectedHk.name;
    }

    // Reduce item quantity
    await pool.query(
      "UPDATE borrowable_items SET quantity = quantity - $1 WHERE id = $2",
      [quantity, item_id]
    );

    // Insert borrowed item with delivery status and assigned housekeeper
    const borrowed = await pool.query(
      `INSERT INTO borrowed_items 
       (user_id, item_name, quantity, charge_amount, delivery_status, housekeeper_id)
       VALUES ($1, $2, $3, $4, 'pending_delivery', $5)
       RETURNING *`,
      [
        user_id,
        item.name,
        quantity,
        item.price * quantity,
        assignedHousekeeperId,
      ]
    );

    // Notify admin
    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       SELECT id, $1, NOW() FROM users
       WHERE role = 'admin' AND facility = $2`,
      [
        `${guestName} borrowed ${quantity} ${item.name}(s) from ${facility}. ${
          assignedHousekeeperName
            ? `Assigned to ${assignedHousekeeperName} for delivery.`
            : "Pending housekeeper assignment for delivery."
        }`,
        facility,
      ]
    );

    // If housekeeper assigned, notify them and the guest
    if (assignedHousekeeperId) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, created_at)
         VALUES ($1, $2, NOW())`,
        [
          assignedHousekeeperId,
          `New delivery task: Deliver ${quantity} ${item.name}(s) to ${guestName} in Room ${room_number}.`,
        ]
      );

      // Notify guest
      await pool.query(
        `INSERT INTO notifications (user_id, message, created_at)
         VALUES ($1, $2, NOW())`,
        [
          user_id,
          `Your borrowed item(s) will be delivered by ${assignedHousekeeperName}. You will be billed after delivery confirmation.`,
        ]
      );

      res.json({
        message: `Item borrowed successfully! ${assignedHousekeeperName} will deliver it to your room.`,
        borrowed: borrowed.rows[0],
        assigned_housekeeper: assignedHousekeeperName,
      });
    } else {
      // No housekeeper available - notify guest
      await pool.query(
        `INSERT INTO notifications (user_id, message, created_at)
         VALUES ($1, $2, NOW())`,
        [
          user_id,
          `Your borrowed item is pending delivery. You will be notified when a housekeeper is assigned.`,
        ]
      );

      res.json({
        message:
          "Item borrowed successfully! Delivery is pending housekeeper assignment.",
        borrowed: borrowed.rows[0],
      });
    }
  } catch (err) {
    console.error("Borrow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/borrowed", authorization, async (req, res) => {
  try {
    const { id: user_id, role } = req.user;

    if (role === "admin") {
      const facilityRes = await pool.query(
        "SELECT facility FROM users WHERE id = $1",
        [user_id]
      );

      if (facilityRes.rows.length === 0)
        return res.status(404).json({ error: "User not found" });

      const facility = facilityRes.rows[0].facility;

      const result = await pool.query(
        `
        SELECT 
          b.id, b.item_name, b.quantity, b.charge_amount, b.created_at, b.is_paid,
          b.delivery_status,
          u.first_name, u.last_name
        FROM borrowed_items b
        JOIN users u ON b.user_id = u.id
        WHERE u.facility = $1
        AND b.delivery_status = 'delivered'
        AND b.is_paid = FALSE
        ORDER BY b.created_at DESC
        `,
        [facility]
      );

      return res.json(result.rows || []);
    } else if (role === "guest") {
      const result = await pool.query(
        `
        SELECT id, item_name, quantity, charge_amount, created_at, is_paid, delivery_status
        FROM borrowed_items
        WHERE user_id = $1
        AND delivery_status = 'delivered'
        ORDER BY created_at DESC
        `,
        [user_id]
      );

      return res.json(result.rows || []);
    } else {
      return res.status(403).json({ error: "Unauthorized access" });
    }
  } catch (err) {
    console.error("Error fetching borrowed items:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/pending", authorization, async (req, res) => {
  try {
    const { role, id: admin_id } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const facilityRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    if (facilityRes.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found." });
    }

    const facility = facilityRes.rows[0].facility;

    const result = await pool.query(
      `SELECT 
         b.id, 
         b.user_id, 
         b.item_name, 
         b.quantity, 
         b.charge_amount, 
         b.created_at, 
         b.is_paid,
         u.first_name || ' ' || u.last_name AS borrower_name
       FROM borrowed_items b
       JOIN users u ON b.user_id = u.id
       WHERE b.is_paid = false
       AND u.facility = $1
       ORDER BY b.created_at DESC`,
      [facility]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending payments:", err.message);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

router.put("/:id/mark-paid", authorization, async (req, res) => {
  const { id } = req.params;

  try {
    const { role, id: admin_id } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const adminRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    const adminFacility = adminRes.rows[0]?.facility;

    const checkRes = await pool.query(
      `SELECT b.*, u.facility 
       FROM borrowed_items b 
       JOIN users u ON b.user_id = u.id 
       WHERE b.id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (checkRes.rows[0].facility !== adminFacility) {
      return res
        .status(403)
        .json({ error: "You can only manage items from your facility." });
    }

    const result = await pool.query(
      "UPDATE borrowed_items SET is_paid = true WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({
      message: "Item marked as paid successfully",
      item: result.rows[0],
    });
  } catch (err) {
    console.error("Error marking item as paid:", err.message);
    res.status(500).json({ error: "Failed to mark item as paid" });
  }
});

router.put("/mark-all-paid/:userId", authorization, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, id: admin_id } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const adminRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    const adminFacility = adminRes.rows[0]?.facility;

    const userRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (userRes.rows[0].facility !== adminFacility) {
      return res
        .status(403)
        .json({ error: "You can only mark paid for users in your facility." });
    }

    const result = await pool.query(
      `UPDATE borrowed_items
       SET is_paid = true
       WHERE user_id = $1 AND is_paid = false`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No unpaid items found for this user." });
    }

    res.json({
      message: `All borrowed items for user ID ${userId} marked as paid.`,
    });
  } catch (err) {
    console.error("Error marking all as paid:", err.message);
    res.status(500).json({ error: "Failed to mark all as paid" });
  }
});

module.exports = router;
