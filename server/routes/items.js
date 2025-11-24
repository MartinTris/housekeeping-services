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
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: "Item not found." });

    if (item.quantity < quantity) {
      return res.status(400).json({ error: "Not enough stock available." });
    }

    const guestName = `${first_name} ${last_name}`;

    // Get the guest's current room booking with room_id
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

    const { room_id, room_number } = bookingRes.rows[0];

    // Get current Manila time info - SIMPLIFIED for TIMESTAMPTZ
    const timeCheckResult = await pool.query(`
      SELECT 
        CURRENT_TIME as current_time,
        CURRENT_DATE as current_date,
        TRIM(to_char(CURRENT_TIMESTAMP, 'Day')) as current_day_name,
        CURRENT_TIMESTAMP as current_timestamp
    `);

    const { current_time, current_date, current_day_name, current_timestamp } =
      timeCheckResult.rows[0];

    console.log("\n=== TIMESTAMP DEBUG ===");
    console.log("Current Date:", current_date);
    console.log("Current Time:", current_time);
    console.log("Current Day:", current_day_name);
    console.log("Current Timestamp:", current_timestamp);

    // Query for available housekeepers
    const availableHk = await pool.query(
      `
      SELECT 
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
      [facility, current_day_name, current_time]
    );

    console.log("\n=== AVAILABLE HOUSEKEEPERS ===");
    console.log("Count:", availableHk.rows.length);
    availableHk.rows.forEach(hk => {
      console.log(`- ID: ${hk.id}, Name: ${hk.name}, Shift: ${hk.shift_time_in}-${hk.shift_time_out}, Days Off: ${hk.day_offs}`);
    });

    let assignedHousekeeperId;
    let assignedHousekeeperName;

    if (availableHk.rows.length === 0) {
      console.log("\n❌ No available housekeepers found for facility:", facility);
      assignedHousekeeperId = null;
      assignedHousekeeperName = null;
    } else {
      console.log("\n=== CHECKING BUSY HOUSEKEEPERS ===");
      
      // Check for busy housekeepers with housekeeping tasks today
      const busyHousekeeping = await pool.query(
        `
        SELECT 
          assigned_to,
          status,
          preferred_date,
          preferred_date::date as pref_date_only
        FROM housekeeping_requests
        WHERE status IN ('approved', 'in_progress')
          AND archived = FALSE
          AND assigned_to IS NOT NULL
          AND preferred_date::date = CURRENT_DATE
      `
      );

      console.log("\nBusy with housekeeping tasks today:");
      busyHousekeeping.rows.forEach(row => {
        console.log(`- Housekeeper ID: ${row.assigned_to}, Status: ${row.status}, Date: ${row.pref_date_only}`);
      });

      // Check for housekeepers with pending/in-progress deliveries today
      const busyDeliveries = await pool.query(`
        SELECT 
          housekeeper_id,
          delivery_status,
          created_at,
          created_at::date as created_date
        FROM borrowed_items
        WHERE housekeeper_id IS NOT NULL
          AND delivery_status IN ('pending_delivery', 'in_progress')
          AND created_at::date = CURRENT_DATE
      `);

      console.log("\nBusy with deliveries today:");
      busyDeliveries.rows.forEach(row => {
        console.log(`- Housekeeper ID: ${row.housekeeper_id}, Status: ${row.delivery_status}, Date: ${row.created_date}`);
      });

      // Combine busy IDs
      const busyFromHousekeeping = busyHousekeeping.rows.map(r => Number(r.assigned_to));
      const busyFromDeliveries = busyDeliveries.rows.map(r => Number(r.housekeeper_id));
      const allBusyIds = [...new Set([...busyFromHousekeeping, ...busyFromDeliveries])];
      
      console.log("\nAll busy housekeeper IDs:", allBusyIds);

      // Filter out busy housekeepers
      const freeHk = availableHk.rows.filter(hk => !allBusyIds.includes(hk.id));

      console.log("\n=== FREE HOUSEKEEPERS ===");
      console.log("Count:", freeHk.length);
      freeHk.forEach(hk => {
        console.log(`- ID: ${hk.id}, Name: ${hk.name}`);
      });

      // Use free housekeepers if available, otherwise use all available
      const candidates = freeHk.length > 0 ? freeHk : availableHk.rows;
      
      if (freeHk.length === 0) {
        console.log("\n⚠️ No free housekeepers! Using all available housekeepers.");
      }

      console.log("\n=== COUNTING DELIVERIES FOR LOAD BALANCING ===");

      // Count ALL deliveries today (including completed ones)
      const allDeliveriesToday = await pool.query(`
        SELECT 
          housekeeper_id,
          COUNT(*) as delivery_count
        FROM borrowed_items
        WHERE housekeeper_id IS NOT NULL
          AND created_at::date = CURRENT_DATE
        GROUP BY housekeeper_id
      `);

      const deliveryCountMap = {};
      allDeliveriesToday.rows.forEach(row => {
        deliveryCountMap[row.housekeeper_id] = parseInt(row.delivery_count);
      });

      console.log("\nDelivery counts today:");
      candidates.forEach(hk => {
        const count = deliveryCountMap[hk.id] || 0;
        console.log(`- ${hk.name} (ID: ${hk.id}): ${count} deliveries`);
      });

      // Sort candidates: first by delivery count (ascending), then by name
      candidates.sort((a, b) => {
        const countA = deliveryCountMap[a.id] || 0;
        const countB = deliveryCountMap[b.id] || 0;
        
        if (countA !== countB) {
          return countA - countB; // Fewer deliveries = higher priority
        }
        return a.name.localeCompare(b.name); // Alphabetical tiebreaker
      });

      console.log("\n=== SORTED CANDIDATES (by priority) ===");
      candidates.forEach((hk, index) => {
        const count = deliveryCountMap[hk.id] || 0;
        console.log(`${index + 1}. ${hk.name} (ID: ${hk.id}) - ${count} deliveries`);
      });

      // Select the first candidate (least busy)
      const selectedHk = candidates[0];
      assignedHousekeeperId = selectedHk.id;
      assignedHousekeeperName = selectedHk.name;
      
      console.log("\n✅ SELECTED HOUSEKEEPER:");
      console.log(`- ID: ${assignedHousekeeperId}`);
      console.log(`- Name: ${assignedHousekeeperName}`);
      console.log(`- Current deliveries today: ${deliveryCountMap[assignedHousekeeperId] || 0}`);
    }

    // Reduce item quantity
    await pool.query(
      "UPDATE borrowable_items SET quantity = quantity - $1 WHERE id = $2",
      [quantity, item_id]
    );

    // Insert borrowed item with delivery status, assigned housekeeper, AND room_id
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

    console.log("\n✅ Borrowed item created:", borrowed.rows[0].id);

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
          console.log("✓ Delivery assignment email sent to:", hkEmailInfo.rows[0].email);
        } catch (emailError) {
          console.error("Failed to send delivery assignment email:", emailError);
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
    console.error("\n❌ BORROW ERROR:", err);
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
