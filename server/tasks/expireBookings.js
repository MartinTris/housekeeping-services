const pool = require("../db");
const cron = require("node-cron");
const { getIo } = require("../realtime");

const expireBookings = async () => {
  try {
    const expired = await pool.query(
      `
      DELETE FROM room_bookings
      WHERE time_out IS NOT NULL
        AND time_out <= NOW()
      RETURNING *
      `
    );

    if (expired.rows.length > 0) {
      for (const b of expired.rows) {
        await pool.query(
          `
          INSERT INTO booking_history (room_id, guest_id, time_in, time_out, checked_out_at, moved_from_booking)
          VALUES ($1, $2, $3, $4, NOW(), $5)
          `,
          [b.room_id, b.guest_id, b.time_in, b.time_out, b.id]
        );

        await pool.query(`UPDATE users SET facility = NULL WHERE id = $1`, [
          b.guest_id,
        ]);
      }

      console.log(`Moved ${expired.rows.length} expired bookings to history`);

      getIo().emit("booking:autoCheckout", {
        count: expired.rows.length,
        expired: expired.rows,
      });
    }
  } catch (err) {
    console.error("Error expiring bookings:", err.message);
  }
};

// run every minute (adjust to your needs)
cron.schedule("* * * * *", () => {
  console.log("Running expireBookings task...");
  expireBookings();
});

module.exports = expireBookings;
