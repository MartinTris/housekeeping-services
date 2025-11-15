const express = require("express");
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

const router = express.Router();

router.post("/", authorization, async (req, res) => {
  try {
    const {
      title,
      message,
      target_guests,
      target_housekeepers,
      facility,
    } = req.body;

    const user_id = req.user.id;
    const toBool = (val) => val === true || val === "true";

    const newAnnouncement = await pool.query(
      `INSERT INTO announcements 
       (title, message, target_guests, target_housekeepers, posted_by, facility) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title || "Announcement",
        message,
        toBool(target_guests),
        toBool(target_housekeepers),
        user_id,
        facility,
      ]
    );

    res.json(newAnnouncement.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error posting announcement" });
  }
});

// Get announcements based on user role and facility
router.get("/", authorization, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userFacility = req.user.facility;

    if (!userFacility || userFacility.trim() === "") {
      return res.json([]);
    }

    let query = `
      SELECT a.*,
             COALESCE(
               NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
               u.email,
               'Unknown Admin'
             ) AS admin_name
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      WHERE a.facility = $1
      ORDER BY a.created_at DESC
    `;
    let params = [userFacility];

    if (userRole === "guest") {
      query = `
        SELECT a.*,
               COALESCE(
                 NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
                 u.email,
                 'Unknown Admin'
               ) AS admin_name
        FROM announcements a
        LEFT JOIN users u ON a.posted_by = u.id
        WHERE a.target_guests = true AND a.facility = $1
        ORDER BY a.created_at DESC
      `;
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
        WHERE a.target_housekeepers = true AND a.facility = $1
        ORDER BY a.created_at DESC
      `;
    }

    const results = await pool.query(query, params);
    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching announcements:", err.message);
    res.status(500).json({ error: "Error fetching announcements" });
  }
});

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
    const userId = req.user.id;

    const deleted = await pool.query(
      `DELETE FROM announcements
       WHERE id = $1 AND posted_by = $2
       RETURNING *`,
      [id, userId]
    );

    if (deleted.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err.message);
    res.status(500).json({ error: "Server error deleting announcement" });
  }
});

// Admin announcements
router.get("/admin", authorization, async (req, res) => {
  try {
    const adminId = req.user.id;

    const results = await pool.query(
      `
      SELECT a.*,
             COALESCE(
               NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''),
               u.email,
               'Unknown Admin'
             ) AS admin_name
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      WHERE a.posted_by = $1
      ORDER BY a.created_at DESC
      `,
      [adminId]
    );

    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching admin announcements:", err.message);
    res.status(500).json({ error: "Error fetching admin announcements" });
  }
});

module.exports = router;
