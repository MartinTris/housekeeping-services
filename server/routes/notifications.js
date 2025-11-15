const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get all notifications for a user
router.get("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const notifications = await pool.query(
      `
      SELECT n.*, 
             u.first_name || ' ' || u.last_name AS full_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.user_id = $1 
      ORDER BY n.created_at DESC
      `,
      [user_id]
    );
    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark all notifications as read for a user
router.put("/user/:user_id/read-all", async (req, res) => {
  try {
    const { user_id } = req.params;
    await pool.query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [user_id]);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
