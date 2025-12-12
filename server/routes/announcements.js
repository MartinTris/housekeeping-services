const express = require("express");
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

const router = express.Router();

// Helper function to create notifications for targeted users
async function createNotificationsForAnnouncement(announcement) {
  try {
    const { id: announcementId, title, message, target_guests, target_housekeepers, target_admins, facility } = announcement;
    
    // Build WHERE clause based on targets
    const roles = [];
    
    if (target_guests) roles.push('guest');
    if (target_housekeepers) roles.push('housekeeper');
    if (target_admins) roles.push('admin');
    
    if (roles.length === 0) return; // No one to notify
    
    // Get all users matching the criteria FOR THIS ANNOUNCEMENT'S FACILITY ONLY
    const userQuery = `
      SELECT id, role, facility 
      FROM users 
      WHERE role = ANY($1::text[])
      AND LOWER(facility) = LOWER($2)
    `;
    
    const users = await pool.query(userQuery, [roles, facility]);
    
    console.log(`Found ${users.rows.length} users to notify in ${facility}:`, users.rows.map(u => ({ id: u.id, role: u.role, facility: u.facility })));
    
    // Create notifications for each user
    const notificationPromises = users.rows.map(user => 
      pool.query(
        `INSERT INTO notifications (user_id, message, read, created_at)
         VALUES ($1, $2, FALSE, NOW())`,
        [
          user.id,
          `📢 New announcement: ${title}`
        ]
      )
    );
    
    await Promise.all(notificationPromises);
    console.log(`✓ Created ${users.rows.length} notifications for announcement: "${title}" in ${facility}`);
    
  } catch (err) {
    console.error("Error creating notifications:", err.message);
    // Don't throw - we don't want to fail the announcement creation if notifications fail
  }
}

router.post("/", authorization, async (req, res) => {
  try {
    const {
      title,
      message,
      target_guests,
      target_housekeepers,
      target_admins,
      facilities,
    } = req.body;

    const { id: user_id, role, facility: userFacility } = req.user;
    const toBool = (val) => val === true || val === "true";

    let targetFacilities;
    if (role === 'superadmin' && facilities && Array.isArray(facilities) && facilities.length > 0) {
      targetFacilities = facilities;
    } else {
      targetFacilities = [userFacility];
    }

    console.log("Creating announcement(s) for facilities:", targetFacilities);

    const insertPromises = targetFacilities.map(facility =>
      pool.query(
        `INSERT INTO announcements 
         (title, message, target_guests, target_housekeepers, target_admins, posted_by, facility) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          title || "Announcement",
          message,
          toBool(target_guests),
          toBool(target_housekeepers),
          toBool(target_admins),
          user_id,
          facility,
        ]
      )
    );

    const results = await Promise.all(insertPromises);
    const createdAnnouncements = results.map(r => r.rows[0]);

    // Create notifications for each announcement
    for (const announcement of createdAnnouncements) {
      await createNotificationsForAnnouncement(announcement);
    }

    res.json({
      success: true,
      count: createdAnnouncements.length,
      announcements: createdAnnouncements
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error posting announcement" });
  }
});

// Get announcements based on user role and facility
router.get("/", authorization, async (req, res) => {
  try {
    const { role: userRole, facility: userFacility } = req.user;

    console.log("Fetching announcements for:", { userRole, userFacility });

    if (!userFacility || userFacility.trim() === "") {
      return res.json([]);
    }

    let query;
    let params;

    if (userRole === 'superadmin') {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE LOWER(a.facility) IN (LOWER('RCC'), LOWER('Hotel Rafael'))
        ORDER BY a.facility, a.created_at DESC
      `;
      params = [];
    } else if (userRole === "admin") {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE LOWER(a.facility) = LOWER($1)
          AND a.target_admins = TRUE
        ORDER BY a.created_at DESC
      `;
      params = [userFacility];
    } else if (userRole === "guest") {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE LOWER(a.facility) = LOWER($1)
          AND a.target_guests = TRUE
        ORDER BY a.created_at DESC
      `;
      params = [userFacility];
    } else if (userRole === "housekeeper") {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE LOWER(a.facility) = LOWER($1)
          AND a.target_housekeepers = TRUE
        ORDER BY a.created_at DESC
      `;
      params = [userFacility];
    } else {
      return res.json([]);
    }

    const results = await pool.query(query, params);
    
    console.log(`Found ${results.rows.length} announcements for ${userRole} at ${userFacility}`);
    
    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching announcements:", err.message);
    res.status(500).json({ error: "Error fetching announcements" });
  }
});

// Update announcement
router.put("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;
    const userId = req.user.id;

    const updated = await pool.query(
      `UPDATE announcements
       SET title = $1, message = $2
       WHERE id = $3 AND posted_by = $4
       RETURNING *`,
      [title, message, id, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or announcement not found" });
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating announcement:", err.message);
    res.status(500).json({ error: "Server error updating announcement" });
  }
});

router.delete("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    let deleteQuery;
    let deleteParams;

    if (role === 'superadmin') {
      deleteQuery = `DELETE FROM announcements WHERE id = $1 RETURNING *`;
      deleteParams = [id];
    } else {
      deleteQuery = `DELETE FROM announcements WHERE id = $1 AND posted_by = $2 RETURNING *`;
      deleteParams = [id, userId];
    }

    const deleted = await pool.query(deleteQuery, deleteParams);

    if (deleted.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err.message);
    res.status(500).json({ error: "Server error deleting announcement" });
  }
});

// Admin's own announcements
router.get("/admin", authorization, async (req, res) => {
  try {
    const { role: userRole, facility: userFacility, id: userId } = req.user;

    console.log("=== /admin route hit ===");
    console.log("User ID:", userId, "Type:", typeof userId);
    console.log("Role:", userRole);
    console.log("Facility:", userFacility);

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Only check facility for regular admins, not superadmins
    if (userRole !== 'superadmin' && (!userFacility || userFacility.trim() === "")) {
      return res.json([]);
    }

    let query;
    let params;

    if (userRole === 'superadmin') {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE a.posted_by = $1
        ORDER BY a.created_at DESC, a.facility
      `;
      params = [userId];
    } else {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE LOWER(a.facility) = LOWER($1) AND a.posted_by = $2
        ORDER BY a.created_at DESC
      `;
      params = [userFacility, userId];
    }

    const result = await pool.query(query, params);
    console.log(`Found ${result.rows.length} announcements for user ${userId}`);

    res.json(result.rows);
    
  } catch (err) {
    console.error("Error fetching admin announcements:", err.message);
    res.status(500).json({ error: "Error fetching admin announcements" });
  }
});

module.exports = router;