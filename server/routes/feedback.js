const express = require("express");
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

const router = express.Router();

router.post("/", authorization, async (req, res) => {
  try {
    const { rating, comment, request_id, type } = req.body;
    const user_id = req.user.id;

    let validRequestId = null;

    if (request_id) {
      const historyCheck = await pool.query(
        "SELECT id FROM service_history WHERE id = $1",
        [request_id]
      );

      if (historyCheck.rows.length > 0) {
        validRequestId = request_id;
      } else {
        const requestCheck = await pool.query(
          "SELECT id FROM housekeeping_requests WHERE id = $1",
          [request_id]
        );
        if (requestCheck.rows.length > 0) {
          validRequestId = request_id;
        }
      }
    }

    const feedbackType = type === "system" ? "system" : "service";

    const result = await pool.query(
      `INSERT INTO feedback (user_id, rating, comment, type, request_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *, created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' as created_at_manila`,
      [user_id, rating, comment, feedbackType, validRequestId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding feedback:", err);
    res.status(500).json({ error: "Server error adding feedback" });
  }
});

router.get("/recent", authorization, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        sh.id,
        r.room_number,
        st.name AS service_type,
        sh.preferred_date,
        sh.preferred_time
      FROM service_history sh
      JOIN rooms r ON r.id = sh.room_id
      LEFT JOIN service_types st ON sh.service_type_id = st.id
      WHERE sh.guest_id = $1
        AND sh.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM feedback f WHERE f.request_id = sh.id
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

// Service feedback endpoint
router.get("/admin", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    let sql;
    let params;

    if (role === 'superadmin') {
      // Superadmin sees ALL service feedback from ALL facilities
      sql = `
        SELECT
          f.id,
          f.rating,
          f.comment,
          f.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' as created_at,
          f.type,
          COALESCE(
            NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''),
            u.email,
            'Guest'
          ) AS guest_name,
          r.room_number,
          COALESCE(r.facility, u.facility, 'Unknown') AS facility,
          COALESCE(st_sh.name, st_hr.name, 'N/A') AS service_type,
          COALESCE(
            hk_sh.first_name || ' ' || hk_sh.last_name,
            hk_hr.first_name || ' ' || hk_hr.last_name,
            'N/A'
          ) AS housekeeper_name
        FROM feedback f
        LEFT JOIN users u ON u.id = f.user_id
        LEFT JOIN service_history sh ON sh.id = f.request_id AND f.type = 'service'
        LEFT JOIN service_types st_sh ON sh.service_type_id = st_sh.id
        LEFT JOIN users hk_sh ON sh.housekeeper_id = hk_sh.id
        LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id AND sh.id IS NULL AND f.type = 'service'
        LEFT JOIN service_types st_hr ON hr.service_type_id = st_hr.id
        LEFT JOIN users hk_hr ON hr.assigned_to = hk_hr.id
        LEFT JOIN rooms r ON r.id = COALESCE(sh.room_id, hr.room_id)
        WHERE f.type = 'service'
        ORDER BY COALESCE(r.facility, u.facility), f.created_at DESC
      `;
      params = [];
    } else {
      // Regular admin sees only their facility
      sql = `
        SELECT
          f.id,
          f.rating,
          f.comment,
          f.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' as created_at,
          COALESCE(
            NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''),
            u.email,
            'Guest'
          ) AS guest_name,
          r.room_number,
          COALESCE(st_sh.name, st_hr.name, 'N/A') AS service_type,
          COALESCE(
            hk_sh.first_name || ' ' || hk_sh.last_name,
            hk_hr.first_name || ' ' || hk_hr.last_name,
            'N/A'
          ) AS housekeeper_name
        FROM feedback f
        LEFT JOIN users u ON u.id = f.user_id
        LEFT JOIN service_history sh ON sh.id = f.request_id
        LEFT JOIN service_types st_sh ON sh.service_type_id = st_sh.id
        LEFT JOIN users hk_sh ON sh.housekeeper_id = hk_sh.id
        LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id AND sh.id IS NULL
        LEFT JOIN service_types st_hr ON hr.service_type_id = st_hr.id
        LEFT JOIN users hk_hr ON hr.assigned_to = hk_hr.id
        LEFT JOIN rooms r ON r.id = COALESCE(sh.room_id, hr.room_id)
        WHERE f.type = 'service'
        AND LOWER(r.facility) = $1
        ORDER BY f.created_at DESC
      `;
      params = [facility.toLowerCase()];
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin feedback:", err);
    res.status(500).json({ error: "Server error fetching feedback" });
  }
});

// System feedback endpoint (superadmin only)
router.get("/admin/system", authorization, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "superadmin") {
      return res.status(403).json({ error: "Superadmin access required" });
    }

    const sql = `
      SELECT
        f.id,
        f.rating,
        f.comment,
        f.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' as created_at,
        COALESCE(
          NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''),
          u.email,
          'Guest'
        ) AS guest_name,
        COALESCE(u.facility, 'Unknown') AS facility
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      WHERE f.type = 'system'
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching system feedback:", err);
    res.status(500).json({ error: "Server error fetching system feedback" });
  }
});

router.get("/housekeeper", authorization, async (req, res) => {
  try {
    if (req.user.role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    const sql = `
      SELECT
        f.id,
        f.rating,
        f.comment,
        f.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' as created_at,
        COALESCE(
          NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''),
          u.email,
          'Guest'
        ) AS guest_name,
        r.room_number,
        COALESCE(st_sh.name, st_hr.name, 'N/A') AS service_type
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN service_history sh ON sh.id = f.request_id
      LEFT JOIN service_types st_sh ON sh.service_type_id = st_sh.id
      LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id AND sh.id IS NULL
      LEFT JOIN service_types st_hr ON hr.service_type_id = st_hr.id
      LEFT JOIN rooms r ON r.id = COALESCE(sh.room_id, hr.room_id)
      WHERE f.type = 'service'
        AND (sh.housekeeper_id = $1 OR hr.assigned_to = $1)
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(sql, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching housekeeper feedback:", err);
    res.status(500).json({ error: "Server error fetching feedback" });
  }
});

router.get("/housekeeper/average", authorization, async (req, res) => {
  try {
    if (req.user.role !== "housekeeper") {
      return res.status(403).json({ error: "Access denied" });
    }

    const sql = `
      SELECT
        COALESCE(ROUND(AVG(f.rating)::numeric, 2), 0) AS average_rating,
        COUNT(f.id) AS total_feedbacks
      FROM feedback f
      LEFT JOIN service_history sh ON sh.id = f.request_id
      LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id AND sh.id IS NULL
      WHERE f.type = 'service'
        AND (sh.housekeeper_id = $1 OR hr.assigned_to = $1)
    `;

    const result = await pool.query(sql, [req.user.id]);

    res.json({
      averageRating: parseFloat(result.rows[0].average_rating) || 0,
      totalFeedbacks: parseInt(result.rows[0].total_feedbacks, 10) || 0,
    });
  } catch (err) {
    console.error("Error fetching housekeeper average feedback:", err);
    res.status(500).json({ error: "Server error fetching average feedback" });
  }
});

// Get average rating per housekeeper
router.get("/admin/housekeeper-ratings", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    // Allow both admin and superadmin
    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    let sql;
    let params;

    if (role === 'superadmin') {
      // Superadmin sees all housekeepers from both facilities
      sql = `
        SELECT 
          hk.id AS housekeeper_id,
          hk.first_name || ' ' || hk.last_name AS housekeeper_name,
          COALESCE(hk.facility, 'Unknown') AS facility,
          COALESCE(ROUND(AVG(f.rating)::numeric, 2), 0) AS average_rating,
          COUNT(f.id) AS total_feedbacks
        FROM users hk
        LEFT JOIN service_history sh ON sh.housekeeper_id = hk.id
        LEFT JOIN housekeeping_requests hr ON hr.assigned_to = hk.id
        LEFT JOIN feedback f ON (f.request_id = sh.id OR f.request_id = hr.id) AND f.type = 'service'
        WHERE hk.role = 'housekeeper'
        GROUP BY hk.id, hk.first_name, hk.last_name, hk.facility
        HAVING COUNT(f.id) > 0
        ORDER BY hk.facility, average_rating DESC, total_feedbacks DESC
      `;
      params = [];
    } else {
      // Regular admin sees only their facility
      sql = `
        SELECT 
          hk.id AS housekeeper_id,
          hk.first_name || ' ' || hk.last_name AS housekeeper_name,
          COALESCE(ROUND(AVG(f.rating)::numeric, 2), 0) AS average_rating,
          COUNT(f.id) AS total_feedbacks
        FROM feedback f
        LEFT JOIN service_history sh ON sh.id = f.request_id
        LEFT JOIN housekeeping_requests hr ON hr.id = f.request_id AND sh.id IS NULL
        LEFT JOIN users hk ON hk.id = COALESCE(sh.housekeeper_id, hr.assigned_to)
        WHERE f.type = 'service'
          AND hk.role = 'housekeeper'
          AND LOWER(COALESCE(sh.facility, hk.facility, '')) = $1
        GROUP BY hk.id, hk.first_name, hk.last_name
        ORDER BY average_rating DESC, total_feedbacks DESC
      `;
      params = [facility.toLowerCase()];
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching housekeeper ratings:", err);
    res.status(500).json({ error: "Server error fetching housekeeper ratings" });
  }
});

module.exports = router;