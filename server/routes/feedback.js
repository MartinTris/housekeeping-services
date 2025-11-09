const express = require("express");
const pool = require("../db");
const authorization = require("../middleware/authorization");

const router = express.Router();

// Create feedback
router.post("/", authorization, async (req, res) => {
  try {
    const { rating, comment, request_id } = req.body;
    const user_id = req.user.id;

    let validRequestId = null;

    if (request_id) {
      // First, check housekeeping_requests
      const requestCheck = await pool.query(
        "SELECT id FROM housekeeping_requests WHERE id = $1",
        [request_id]
      );

      if (requestCheck.rows.length > 0) {
        validRequestId = request_id;
      } else {
        // Then check service_history
        const historyCheck = await pool.query(
          "SELECT request_id FROM service_history WHERE request_id = $1",
          [request_id]
        );
        if (historyCheck.rows.length > 0) {
          validRequestId = request_id;
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO feedback (user_id, rating, comment, type, request_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, rating, comment, "service", validRequestId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding feedback:", err);
    res.status(500).json({ error: "Server error adding feedback" });
  }
});

// Get current user's feedback
router.get("/my", authorization, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user feedback:", err);
    res.status(500).json({ error: "Server error fetching user feedback" });
  }
});

/**
 * @route GET /feedback/recent
 * @desc Get recently completed housekeeping requests without feedback yet (for logged-in user)
 */
router.get("/recent", authorization, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        sh.id,
        sh.request_id,
        r.room_number,
        sh.service_type,
        sh.preferred_date,
        sh.preferred_time
      FROM service_history sh
      JOIN rooms r ON r.id = sh.room_id
      WHERE sh.guest_id = $1
        AND sh.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM feedback f WHERE f.request_id = sh.request_id
        )
      ORDER BY sh.preferred_date DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching recent completed requests:", err);
    res.status(500).json({
      error: "Server error fetching recent completed requests",
    });
  }
});

// GET /feedback/admin
router.get("/admin", authorization, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const sql = `
      SELECT
        f.id,
        f.rating,
        f.comment,
        f.created_at,
        -- Guest name: prefer first_name + last_name, else email, else 'Guest'
        COALESCE(
          NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''),
          u.email,
          'Guest'
        ) AS guest_name,
        -- Facility: prefer room.facility, else user.facility, else 'N/A'
        COALESCE(r.facility, u.facility, 'N/A') AS facility,
        COALESCE(r.room_number, 'N/A') AS room_number,
        COALESCE(hr.service_type, sh.service_type, 'N/A') AS service_type
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id
      LEFT JOIN service_history sh ON sh.request_id = f.request_id
      LEFT JOIN rooms r ON r.id = COALESCE(hr.room_id, sh.room_id)
      WHERE f.type = 'service'
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(sql);

    // If admin has facility assigned, prefer rows that match that facility,
    // but still include rows that have facility 'N/A' or don't match if no matches exist
    let rows = result.rows;
    if (req.user.facility) {
      const matched = rows.filter(
        (row) =>
          row.facility &&
          row.facility.toString().toLowerCase() === req.user.facility.toString().toLowerCase()
      );

      // If there are matches for the admin's facility, return only those;
      // otherwise return all rows (so admin sees feedback even when linkage is missing).
      if (matched.length > 0) rows = matched;
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching admin feedback:", err);
    res.status(500).json({ error: "Server error fetching feedback" });
  }
});

module.exports = router;
