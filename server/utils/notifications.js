const pool = require("../db");

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
