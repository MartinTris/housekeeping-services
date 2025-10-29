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
router.get("/", authorization, async (req, res) => {
  try {
    const { facility } = req.user;
    const result = await pool.query(
      `SELECT * FROM borrowable_items WHERE facility = $1 ORDER BY created_at DESC`,
      [facility]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
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
    const { id: user_id, facility, role } = req.user;
    const { item_id, quantity } = req.body;

    if (role !== "guest") {
      return res.status(403).json({ error: "Only guests can borrow items." });
    }

    if (!facility) {
      return res
        .status(400)
        .json({ error: "You are not assigned to a facility." });
    }

    if (!item_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Invalid item or quantity." });
    }

    // Fetch item
    const itemRes = await pool.query(
      "SELECT * FROM borrowable_items WHERE id = $1 AND facility = $2",
      [item_id, facility]
    );
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: "Item not found." });

    if (item.quantity < quantity) {
      return res.status(400).json({ error: "Not enough stock available." });
    }

    const userRes = await pool.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [user_id]
    );
    const guestName =
      userRes.rows.length > 0
        ? `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`
        : "A guest";

    // Update item quantity
    await pool.query(
      "UPDATE borrowable_items SET quantity = quantity - $1 WHERE id = $2",
      [quantity, item_id]
    );

    // Record borrowed item
    const borrowed = await pool.query(
      `INSERT INTO borrowed_items (user_id, item_name, quantity, charge_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, item.name, quantity, item.price * quantity]
    );

    // Notify all admins of same facility
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
