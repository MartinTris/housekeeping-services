const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");
const { sendTaskAssignmentEmail } = require("../utils/emailService");

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
    const { facility, role } = req.user;

    if (!facility && role !== "superadmin") {
      return res.json([]);
    }

    let query;
    let params;

    if (role === "superadmin") {
      query = `
        SELECT * FROM borrowable_items 
        WHERE facility IN ('RCC', 'Hotel Rafael') 
        ORDER BY facility, created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT * FROM borrowable_items 
        WHERE facility = $1 
        ORDER BY created_at DESC
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

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

    if (itemRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item not found or not in your facility." });
    }

    const item = itemRes.rows[0];

    if (item.quantity < quantity) {
      return res.status(400).json({ error: "Not enough items available." });
    }

    const guestName = `${first_name} ${last_name}`;

    const roomRes = await pool.query(
      `SELECT r.id, r.room_number
       FROM room_bookings rb
       JOIN rooms r ON rb.room_id = r.id
       WHERE rb.guest_id = $1
         AND rb.time_in <= NOW()
         AND (rb.time_out IS NULL OR rb.time_out > NOW())
       LIMIT 1`,
      [user_id]
    );

    let room_id = null;
    let room_number = null;

    if (roomRes.rows.length > 0) {
      room_id = roomRes.rows[0].id;
      room_number = roomRes.rows[0].room_number;
    }

    console.log("\n=== BORROW ITEM ASSIGNMENT ===");
    console.log("Guest:", guestName);
    console.log("Room:", room_number || "N/A");
    console.log("Item:", item.name);
    console.log("Quantity:", quantity);
    console.log("Facility:", facility);

    const manila_now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });
    const manila_date_obj = new Date(manila_now);
    const manila_date = manila_date_obj.toISOString().split("T")[0];
    const manila_time = manila_date_obj.toTimeString().split(" ")[0];
    const current_day_name = manila_date_obj.toLocaleDateString("en-US", {
      weekday: "long",
    });

    console.log("Manila date:", manila_date);
    console.log("Manila time:", manila_time);
    console.log("Current day:", current_day_name);

    const availableHk = await pool.query(
      `SELECT 
        u.id, 
        (u.first_name || ' ' || u.last_name) AS name,
        s.shift_time_in,
        s.shift_time_out,
        s.day_offs
      FROM users u
      JOIN housekeeper_schedule s ON u.id = s.housekeeper_id
      WHERE u.role = 'housekeeper'
        AND u.is_active = TRUE
        AND u.facility = $1
        AND NOT ($2 = ANY(s.day_offs))
        AND $3::time BETWEEN s.shift_time_in AND s.shift_time_out
      `,
      [facility, current_day_name, manila_time]
    );

    console.log("=== AVAILABLE HOUSEKEEPERS ===");
    console.log("Available housekeepers count:", availableHk.rows.length);
    console.log("Available housekeepers:", availableHk.rows.map(h => ({ id: h.id, name: h.name })));

    let assignedHousekeeperId;
    let assignedHousekeeperName;

    if (availableHk.rows.length === 0) {
      console.log("No available housekeepers found for facility:", facility);
      assignedHousekeeperId = null;
      assignedHousekeeperName = null;
    } else {
      console.log("=== CHECKING BUSY HOUSEKEEPERS ===");

      const busyHk = await pool.query(
        `
        SELECT DISTINCT assigned_to
        FROM housekeeping_requests
        WHERE status IN ('approved', 'in_progress')
          AND archived = FALSE
          AND assigned_to IS NOT NULL
          AND (preferred_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date = $1
      `,
        [manila_date]
      );

      console.log("Busy housekeepers (housekeeping tasks):", busyHk.rows);

      const busyDeliveries = await pool.query(`
        SELECT DISTINCT housekeeper_id
        FROM borrowed_items
        WHERE housekeeper_id IS NOT NULL
          AND delivery_status IN ('pending_delivery', 'in_progress')
          AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date = $1
      `, [manila_date]);

      console.log("Busy housekeepers (deliveries):", busyDeliveries.rows);

      const busyIds = [
        ...busyHk.rows.map((r) => String(r.assigned_to)),
        ...busyDeliveries.rows.map((r) => String(r.housekeeper_id))
      ];
      const uniqueBusyIds = [...new Set(busyIds)];
      console.log("Combined busy IDs:", uniqueBusyIds);

      const freeHk = availableHk.rows.filter(
        (hk) => !uniqueBusyIds.includes(String(hk.id))
      );

      console.log("Free housekeepers after filtering:", freeHk.length);
      console.log("Free housekeepers:", freeHk.map((h) => ({ id: h.id, name: h.name })));

      const candidates = freeHk.length > 0 ? freeHk : availableHk.rows;
      console.log("Final candidates:", candidates.map((c) => ({ id: c.id, name: c.name })));
      console.log("=== COUNTING DELIVERIES FOR LOAD BALANCING ===");

      const allDeliveries = await pool.query(`
        SELECT 
          id,
          housekeeper_id, 
          delivery_status,
          (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date as manila_created_date
        FROM borrowed_items
        WHERE housekeeper_id IS NOT NULL
          AND delivery_status IN ('pending_delivery', 'in_progress', 'delivered')
          AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date = $1
      `, [manila_date]);

      console.log("All deliveries today:", allDeliveries.rows);

      const deliveryCounts = {};
      candidates.forEach((hk) => {
        deliveryCounts[hk.id] = allDeliveries.rows.filter(
          (d) => String(d.housekeeper_id) === String(hk.id)
        ).length;
      });

      console.log("Delivery counts per housekeeper:", deliveryCounts);

      candidates.sort((a, b) => {
        const countA = deliveryCounts[a.id] || 0;
        const countB = deliveryCounts[b.id] || 0;
        return countA - countB;
      });

      const minCount = deliveryCounts[candidates[0].id] || 0;

      const leastBusyHousekeepers = candidates.filter(
        (hk) => (deliveryCounts[hk.id] || 0) === minCount
      );

      console.log("Least busy housekeepers (count:", minCount, "):", leastBusyHousekeepers.map(h => h.name));

      const randomIndex = Math.floor(Math.random() * leastBusyHousekeepers.length);
      const selectedHk = leastBusyHousekeepers[randomIndex];

      assignedHousekeeperId = selectedHk.id;
      assignedHousekeeperName = selectedHk.name;

      console.log("=== SELECTED HOUSEKEEPER ===");
      console.log("ID:", assignedHousekeeperId);
      console.log("Name:", assignedHousekeeperName);
      console.log("Current delivery count:", deliveryCounts[assignedHousekeeperId] || 0);
    }

    await pool.query(
      "UPDATE borrowable_items SET quantity = quantity - $1 WHERE id = $2",
      [quantity, item_id]
    );

    const borrowed = await pool.query(
      `INSERT INTO borrowed_items 
       (user_id, item_name, quantity, charge_amount, delivery_status, housekeeper_id, room_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user_id,
        item.name,
        quantity,
        item.price * quantity,
        "pending_delivery",
        assignedHousekeeperId,
        room_id,
      ]
    );

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

    if (assignedHousekeeperId) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, created_at)
         VALUES ($1, $2, NOW())`,
        [
          assignedHousekeeperId,
          `New delivery task: Deliver ${quantity} ${item.name}(s) to ${guestName} in Room ${room_number}.`,
        ]
      );

      const hkEmailInfo = await pool.query(
        `SELECT email, first_name FROM users WHERE id = $1`,
        [assignedHousekeeperId]
      );

      if (hkEmailInfo.rows.length > 0) {
        try {
          await sendTaskAssignmentEmail(
            hkEmailInfo.rows[0].email,
            hkEmailInfo.rows[0].first_name,
            {
              type: "delivery",
              itemName: item.name,
              quantity: quantity,
              roomNumber: room_number,
              guestName: guestName,
            }
          );
          console.log(
            "✓ Delivery assignment email sent to:",
            hkEmailInfo.rows[0].email
          );
        } catch (emailError) {
          console.error(
            "Failed to send delivery assignment email:",
            emailError
          );
        }
      }

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
    const { id: user_id, role, facility } = req.user;

    if (role === "admin" || role === "superadmin") {
      let query;
      let params;

      if (role === "superadmin") {
        query = `
          SELECT 
            b.id, b.item_name, b.quantity, b.charge_amount, b.created_at, b.is_paid,
            b.delivery_status,
            u.first_name, u.last_name, u.facility
          FROM borrowed_items b
          JOIN users u ON b.user_id = u.id
          WHERE u.facility IN ('RCC', 'Hotel Rafael')
          AND b.delivery_status = 'delivered'
          AND b.is_paid = FALSE
          ORDER BY u.facility, b.created_at DESC
        `;
        params = [];
      } else {
        query = `
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
        `;
        params = [facility];
      }

      const result = await pool.query(query, params);

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
    const { role, facility } = req.user;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    let query;
    let params;

    if (role === "superadmin") {
      query = `
        SELECT 
          b.id, 
          b.user_id, 
          b.item_name, 
          b.quantity, 
          b.charge_amount, 
          b.created_at, 
          b.is_paid,
          u.first_name || ' ' || u.last_name AS borrower_name,
          u.facility
        FROM borrowed_items b
        JOIN users u ON b.user_id = u.id
        WHERE b.is_paid = false
        AND b.delivery_status = 'delivered'
        AND u.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY u.facility, b.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT 
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
        AND b.delivery_status = 'delivered'
        AND u.facility = $1
        ORDER BY b.created_at DESC
      `;
      params = [facility];
    }

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending payments:", err.message);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

router.put("/:id/mark-paid", authorization, async (req, res) => {
  const { id } = req.params;
  const { invoice_number } = req.body;

  try {
    const { role, id: admin_id } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    if (!invoice_number || !invoice_number.trim()) {
      return res.status(400).json({ error: "Invoice number is required." });
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
      `UPDATE borrowed_items 
       SET is_paid = true, invoice_number = $1, paid_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [invoice_number.trim(), id]
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

// Mark all items for a user as paid
router.put("/mark-all-paid/:userId", authorization, async (req, res) => {
  try {
    const { userId } = req.params;
    const { invoice_number } = req.body;
    const { role, id: admin_id } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    if (!invoice_number || !invoice_number.trim()) {
      return res.status(400).json({ error: "Invoice number is required." });
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
       SET is_paid = true, invoice_number = $1, paid_at = NOW()
       WHERE user_id = $2 AND is_paid = false
       RETURNING *`,
      [invoice_number.trim(), userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No unpaid items found for this user." });
    }

    res.json({
      message: `All borrowed items for user ID ${userId} marked as paid.`,
      updated_count: result.rowCount,
      invoice_number: invoice_number.trim(),
    });
  } catch (err) {
    console.error("Error marking all as paid:", err.message);
    res.status(500).json({ error: "Failed to mark all as paid" });
  }
});

module.exports = router;
