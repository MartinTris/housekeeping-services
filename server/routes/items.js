// routes/items.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

// ✅ Admin adds new item for their facility
router.post("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const { name, quantity, price } = req.body;

    if (!name || quantity == null || price == null)
      return res.status(400).json({ error: "Missing required fields" });

    // ✅ Check for duplicate item name (case-insensitive)
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

// ✅ Get all items for user's facility
// ✅ Get all items for the user's current facility (fresh from DB)
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
      return res.json([]); // User not yet assigned to a facility
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

// ✅ Delete an item by ID (Admin only)
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Ensure the item belongs to the admin's facility
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

// ✅ Update item (Admin only)
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

    // ✅ Update quantity and price only — name edit removed (since not provided)
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

// ✅ User borrows an item
router.post("/borrow", authorization, async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { item_id, quantity } = req.body;

    if (role !== "guest" && role !== "student") {
      return res.status(403).json({ error: "Only guests and students can borrow items." });
    }

    // 🔁 Always fetch the latest facility from the database
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

    // ✅ Fetch item using the fresh facility
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

    // ✅ Update item quantity
    await pool.query(
      "UPDATE borrowable_items SET quantity = quantity - $1 WHERE id = $2",
      [quantity, item_id]
    );

    // ✅ Record borrowed item
    const borrowed = await pool.query(
      `INSERT INTO borrowed_items (user_id, item_name, quantity, charge_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, item.name, quantity, item.price * quantity]
    );

    // ✅ Notify admins of the same facility
    await pool.query(
      `INSERT INTO notifications (user_id, message, created_at)
       SELECT id, $1, NOW() FROM users
       WHERE role = 'admin' AND facility = $2`,
      [
        `${guestName} borrowed ${quantity} ${item.name}(s) from ${facility}.`,
        facility,
      ]
    );

    res.json({
      message: "Item borrowed successfully!",
      borrowed: borrowed.rows[0],
    });
  } catch (err) {
    console.error("Borrow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all borrowed items (Admins see by facility, guests see their own)
router.get("/borrowed", authorization, async (req, res) => {
  try {
    const { id: user_id, role } = req.user;

    if (role === "admin") {
      // Get admin facility
      const facilityRes = await pool.query(
        "SELECT facility FROM users WHERE id = $1",
        [user_id]
      );

      if (facilityRes.rows.length === 0)
        return res.status(404).json({ error: "User not found" });

      const facility = facilityRes.rows[0].facility;

      // ✅ Fetch all borrowed items by guests of same facility
      const result = await pool.query(
        `
        SELECT 
          b.id, b.item_name, b.quantity, b.charge_amount, b.created_at, b.is_paid,
          u.first_name, u.last_name
        FROM borrowed_items b
        JOIN users u ON b.user_id = u.id
        WHERE u.facility = $1
        ORDER BY b.created_at DESC
        `,
        [facility]
      );

      return res.json(result.rows || []); // ✅ Always return array
    } else if (role === "guest" || role === "student") {
      // ✅ Guests only see their own borrowed items
      const result = await pool.query(
        `
        SELECT id, item_name, quantity, charge_amount, created_at, is_paid
        FROM borrowed_items
        WHERE user_id = $1
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

    // 🏨 Get admin's facility
    const facilityRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    if (facilityRes.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found." });
    }

    const facility = facilityRes.rows[0].facility;

    // 🧾 Get only pending items for users in the same facility
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

// ✅ Mark a specific borrowed item as paid (admin only)
router.put("/:id/mark-paid", authorization, async (req, res) => {
  const { id } = req.params;

  try {
    const { role, id: admin_id } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    // Get admin facility
    const adminRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    const adminFacility = adminRes.rows[0]?.facility;

    // Ensure the borrowed item belongs to a user in the same facility
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
      return res.status(403).json({ error: "You can only manage items from your facility." });
    }

    const result = await pool.query(
      "UPDATE borrowed_items SET is_paid = true WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({ message: "Item marked as paid successfully", item: result.rows[0] });
  } catch (err) {
    console.error("Error marking item as paid:", err.message);
    res.status(500).json({ error: "Failed to mark item as paid" });
  }
});

// ✅ Mark all borrowed items as paid for a user (admin only, same facility)
router.put("/mark-all-paid/:userId", authorization, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, id: admin_id } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    // Get admin facility
    const adminRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [admin_id]
    );
    const adminFacility = adminRes.rows[0]?.facility;

    // Check if target user belongs to same facility
    const userRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (userRes.rows[0].facility !== adminFacility) {
      return res.status(403).json({ error: "You can only mark paid for users in your facility." });
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

    res.json({ message: `All borrowed items for user ID ${userId} marked as paid.` });
  } catch (err) {
    console.error("Error marking all as paid:", err.message);
    res.status(500).json({ error: "Failed to mark all as paid" });
  }
});

module.exports = router;
