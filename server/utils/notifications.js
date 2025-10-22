const pool = require("../db");

// Create a notification for a specific user
async function createNotification(userId, message) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
      [userId, message]
    );
  } catch (err) {
    console.error("Error creating notification:", err.message);
  }
}

module.exports = { createNotification };
