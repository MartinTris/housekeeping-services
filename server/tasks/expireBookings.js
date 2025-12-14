const pool = require("../db");
const cron = require("node-cron");
const { getIo } = require("../realtime");
const { createNotification } = require("../utils/notifications");

const expireBookings = async () => {
  console.log("\n=== 🔍 EXPIRE BOOKINGS TASK STARTED ===");
  console.log("Time:", new Date().toISOString());
  
  try {
    // First, find all bookings that have reached checkout time
    const expiredBookings = await pool.query(
      `
      SELECT rb.*, u.id as guest_id, u.email as guest_email,
             CONCAT_WS(' ', u.first_name, u.last_name) as guest_name,
             r. room_number, r.facility
      FROM room_bookings rb
      JOIN users u ON rb.guest_id = u.id
      JOIN rooms r ON rb.room_id = r.id
      WHERE rb.time_out IS NOT NULL
        AND rb.time_out <= NOW()
      `
    );

    if (expiredBookings.rows.length === 0) {
      console.log("=== ✅ NO EXPIRED BOOKINGS ===\n");
      return;
    }

    console.log(`📋 Found ${expiredBookings.rows.length} bookings at checkout time`);

    const successfulCheckouts = [];
    const blockedCheckouts = [];

    for (const booking of expiredBookings.rows) {
      console.log(`\n--- Checking:  ${booking.guest_name} (Room ${booking.room_number}) ---`);
      
      // Check for unpaid items
      const unpaidItems = await pool.query(
        `
        SELECT COUNT(*) as unpaid_count, 
               COALESCE(SUM(charge_amount), 0) as total_unpaid
        FROM borrowed_items
        WHERE user_id = $1 AND is_paid = FALSE
        `,
        [booking.guest_id]
      );

      const unpaidCount = parseInt(unpaidItems.rows[0].unpaid_count);
      const totalUnpaid = parseFloat(unpaidItems.rows[0].total_unpaid || 0);

      console.log(`💰 Unpaid check - Count: ${unpaidCount}, Total: ₱${totalUnpaid.toFixed(2)}`);

      if (unpaidCount > 0) {
        // ❌ Guest has pending payments - BLOCK CHECKOUT
        console.log(`\n🚫 ==========================================`);
        console.log(`🚫 BLOCKING AUTO-CHECKOUT`);
        console.log(`🚫 Guest: ${booking. guest_name}`);
        console.log(`🚫 Room: ${booking.room_number}`);
        console.log(`🚫 Unpaid:  ${unpaidCount} items, ₱${totalUnpaid.toFixed(2)}`);
        console.log(`🚫 Booking ID: ${booking.id} - PRESERVED`);
        console.log(`🚫 ==========================================\n`);
        
        blockedCheckouts. push({
          guest_id:  booking.guest_id,
          guest_name: booking.guest_name,
          room_number:  booking.room_number,
          facility: booking.facility,
          unpaid_count: unpaidCount,
          total_unpaid:  totalUnpaid
        });

        // Notify the guest
        const guestMessage = `Your checkout time has passed, but you have ${unpaidCount} unpaid item(s) totaling ₱${totalUnpaid.toFixed(2)}. Please settle your payment before checkout.`;
        
        try {
          await createNotification(booking.guest_id, guestMessage);
          console.log(`✓ Guest notification saved to database`);
        } catch (notifErr) {
          console.error(`✗ Failed to create guest notification:`, notifErr.message);
        }

        try {
          const io = getIo();
          if (io) {
            io.to(`user:${booking.guest_id}`).emit("checkoutBlocked", {
              message: guestMessage,
              unpaid_count:  unpaidCount,
              total_amount: totalUnpaid.toFixed(2),
              room_number: booking.room_number
            });
            console.log(`✓ Socket notification sent to guest`);
          }
        } catch (ioError) {
          console.error(`✗ Socket.IO error (guest):`, ioError.message);
        }

        // Notify admins in the facility
        const adminQuery = await pool.query(
          `SELECT id FROM users 
           WHERE role IN ('admin', 'superadmin') 
           AND LOWER(facility) = LOWER($1)`,
          [booking.facility]
        );

        console.log(`👥 Notifying ${adminQuery.rows.length} admin(s)`);

        // ✅ FIXED: Correct message - "cannot be auto-checked out"
        const adminMessage = `Guest ${booking.guest_name} in Room ${booking.room_number} cannot be auto-checked out due to ${unpaidCount} pending payment(s) totaling ₱${totalUnpaid.toFixed(2)}.`;

        for (const admin of adminQuery.rows) {
          try {
            await createNotification(admin.id, adminMessage);
            
            const io = getIo();
            if (io) {
              io.to(`user:${admin.id}`).emit("checkoutBlocked", {
                message: adminMessage,
                guest_id:  booking.guest_id,
                guest_name: booking.guest_name,
                room_number:  booking.room_number,
                unpaid_count: unpaidCount,
                total_amount: totalUnpaid.toFixed(2),
                facility: booking.facility
              });
            }
          } catch (adminErr) {
            console.error(`✗ Failed to notify admin ${admin.id}:`, adminErr.message);
          }
        }
        console.log(`✓ Admin notifications complete`);

        // ⚠️ CRITICAL:  SKIP TO NEXT BOOKING - DO NOT DELETE THIS BOOKING
        console.log(`⚠️ Skipping to next booking (${booking.id} remains active)\n`);
        continue;

      } else {
        // ✅ No pending payments - PROCEED WITH CHECKOUT
        console. log(`\n✅ ==========================================`);
        console.log(`✅ PROCEEDING WITH AUTO-CHECKOUT`);
        console.log(`✅ Guest: ${booking.guest_name}`);
        console.log(`✅ Room: ${booking. room_number}`);
        console.log(`✅ No unpaid items`);
        console.log(`✅ ==========================================\n`);
        
        try {
          // Move to history
          await pool.query(
            `
            INSERT INTO booking_history (room_id, guest_id, time_in, time_out, checked_out_at, moved_from_booking)
            VALUES ($1, $2, $3, $4, NOW(), $5)
            `,
            [booking.room_id, booking.guest_id, booking.time_in, booking.time_out, booking. id]
          );
          console.log(`✓ Moved to booking_history`);

          // Delete from active bookings
          await pool.query(
            `DELETE FROM room_bookings WHERE id = $1`,
            [booking.id]
          );
          console.log(`✓ Deleted from room_bookings`);

          // Clear user facility
          await pool.query(
            `UPDATE users SET facility = NULL WHERE id = $1`,
            [booking.guest_id]
          );
          console.log(`✓ User facility cleared`);

          successfulCheckouts.push({
            guest_id: booking.guest_id,
            guest_name:  booking.guest_name,
            room_number: booking.room_number,
            facility: booking. facility
          });

          // Notify guest
          const checkoutMessage = "You have been automatically checked out.";
          await createNotification(booking.guest_id, checkoutMessage);

          const io = getIo();
          if (io) {
            io.to(`user:${booking.guest_id}`).emit("booking:removed", {
              message:  checkoutMessage,
            });
          }
          
          console.log(`✓ Auto-checkout complete for ${booking.guest_name}\n`);
          
        } catch (checkoutErr) {
          console.error(`✗ Checkout failed for ${booking.guest_name}: `, checkoutErr.message);
          console.error(checkoutErr.stack);
        }
      }
    }

    // Summary
    if (successfulCheckouts.length > 0) {
      console.log(`\n✅ Successfully auto-checked out ${successfulCheckouts.length} guest(s)`);
      
      try {
        getIo().emit("booking:autoCheckout", {
          count: successfulCheckouts.length,
          checkouts: successfulCheckouts,
        });
      } catch (ioError) {
        console.log("Socket. IO not available for autoCheckout summary");
      }
    }

    if (blockedCheckouts. length > 0) {
      console.log(`\n🚫 Blocked ${blockedCheckouts.length} checkout(s) due to pending payments:`);
      blockedCheckouts.forEach(b => {
        console.log(`   - ${b.guest_name} (Room ${b.room_number}): ${b.unpaid_count} items, ₱${b.total_unpaid.toFixed(2)}`);
      });
      
      try {
        getIo().emit("booking:checkoutBlocked", {
          count: blockedCheckouts.length,
          blocked: blockedCheckouts,
        });
      } catch (ioError) {
        console.log("Socket.IO not available for checkoutBlocked summary");
      }
    }

    console. log("\n=== ✅ EXPIRE BOOKINGS TASK COMPLETE ===\n");

  } catch (err) {
    console.error("\n❌ ERROR in expireBookings task:", err. message);
    console.error(err.stack);
  }
};

cron. schedule("* * * * *", () => {
  console.log("\n⏰ Cron trigger at:", new Date().toLocaleString());
  expireBookings();
});

module.exports = expireBookings;