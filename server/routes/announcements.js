const express = require("express");
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

const router = express.Router();

// POST - Create announcement (can target multiple facilities)
router.post("/", authorization, async (req, res) => {
  try {
    const {
      title,
      message,
      target_guests,
      target_housekeepers,
      target_admins, // NEW
      facilities, // Array of facilities
    } = req.body;

    const { id: user_id, role, facility: userFacility } = req.user;
    const toBool = (val) => val === true || val === "true";

    // Determine which facilities to post to
    let targetFacilities;
    if (role === 'superadmin' && facilities && Array.isArray(facilities) && facilities.length > 0) {
      targetFacilities = facilities;
    } else {
      targetFacilities = [userFacility];
    }

    console.log("Creating announcement(s) for facilities:", targetFacilities);

    // Create an announcement for each selected facility
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

// GET - Get announcements based on user role and facility
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
      // Superadmin sees ALL announcements from both facilities (regardless of target)
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
      // Regular admin sees announcements for their facility where target_admins = true
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

// PUT - Update announcement
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

// DELETE - Delete announcement
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Superadmin can delete any announcement, others can only delete their own
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

// GET /admin - Admin's own announcements
router.get("/admin", authorization, async (req, res) => {
  try {
    const { role: userRole, facility: userFacility, id: userId } = req.user;

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    if (!userFacility || userFacility.trim() === "") {
      return res.json([]);
    }

    let query;
    let params;

    if (userRole === 'superadmin') {
      // Superadmin sees all announcements they posted across all facilities
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
        ORDER BY a.facility, a.created_at DESC
      `;
      params = [userId];
    } else {
      // Regular admin sees only their own facility's announcements that they posted
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

    res.json(result.rows);
    
  } catch (err) {
    console.error("Error fetching admin announcements:", err.message);
    res.status(500).json({ error: "Error fetching admin announcements" });
  }
});

module.exports = router;