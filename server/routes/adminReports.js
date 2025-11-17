const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    const { facility: adminFacility, role } = req.user;
    const { days, housekeeper_id } = req.query;
    const validDays = [7, 14, 30];
    const range = validDays.includes(Number(days)) ? Number(days) : 7;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Unauthorized." });
    }

    let facilityFilter;
    let params = [];
    let paramIndex = 1;

    if (role === 'superadmin') {
      facilityFilter = `(r.facility IN ('RCC', 'Hotel Rafael') OR hk.facility IN ('RCC', 'Hotel Rafael'))`;
    } else {
      facilityFilter = `(r.facility = $${paramIndex} OR hk.facility = $${paramIndex})`;
      params.push(adminFacility);
      paramIndex++;
    }

    let housekeeperFilter = "";
    if (housekeeper_id) {
      params.push(housekeeper_id);
      housekeeperFilter = `AND sh.assigned_to = $${paramIndex}`;
      paramIndex++;
    }

    const reportQuery = `
      SELECT 
        CASE 
          WHEN requester.role = 'guest' THEN CONCAT(requester.first_name, ' ', requester.last_name)
          WHEN requester.role IN ('admin', 'superadmin') THEN CONCAT(requester.first_name, ' ', requester.last_name, ' (Admin)')
          ELSE 'N/A'
        END AS guest_name,
        st.name AS service_type,
        CONCAT(hk.first_name, ' ', hk.last_name) AS housekeeper_name,
        r.room_number,
        r.facility,
        TO_CHAR(sh.preferred_date, 'YYYY-MM-DD') AS date,
        TO_CHAR(sh.preferred_time, 'HH12:MI AM') AS time,
        sh.status
      FROM housekeeping_requests sh
      LEFT JOIN users requester ON sh.user_id = requester.id
      LEFT JOIN users hk ON sh.assigned_to = hk.id AND hk.role = 'housekeeper'
      LEFT JOIN rooms r ON sh.room_id = r.id
      LEFT JOIN service_types st ON sh.service_type_id = st.id
      WHERE sh.created_at >= NOW() - INTERVAL '${range} days'
        AND ${facilityFilter}
        ${housekeeperFilter}
      ORDER BY r.facility, sh.preferred_date DESC, sh.preferred_time DESC;
    `;

    const { rows } = await pool.query(reportQuery, params);

    res.json({
      facility: role === 'superadmin' ? 'All Facilities' : adminFacility,
      range_days: range,
      total_records: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching reports:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get housekeepers per facility
router.get("/housekeepers", authorization, async (req, res) => {
  try {
    const { facility: adminFacility, role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Unauthorized." });
    }

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT id, CONCAT(first_name, ' ', last_name) AS name, facility
        FROM users
        WHERE role = 'housekeeper' AND facility IN ('RCC', 'Hotel Rafael') AND is_active = true
        ORDER BY facility, name ASC
      `;
      params = [];
    } else {
      query = `
        SELECT id, CONCAT(first_name, ' ', last_name) AS name
        FROM users
        WHERE role = 'housekeeper' AND facility = $1 AND is_active = true
        ORDER BY name ASC
      `;
      params = [adminFacility];
    }

    const hkRes = await pool.query(query, params);

    res.json(hkRes.rows);
  } catch (err) {
    console.error("Error fetching housekeepers:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get borrowed items report - FIXED TO SHOW INDIVIDUAL TRANSACTIONS
router.get("/borrowed-items", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;
    const { days } = req.query;
    const validDays = [7, 14, 30];
    const range = validDays.includes(Number(days)) ? Number(days) : 7;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: "Unauthorized." });
    }

    let query;
    let params;

    if (role === 'superadmin') {
      query = `
        SELECT 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          bi.item_name,
          bi.quantity,
          bi.charge_amount AS total_amount,
          TO_CHAR(bi.created_at, 'YYYY-MM-DD') AS borrowed_date,
          u.facility
        FROM borrowed_items bi
        JOIN users u ON bi.user_id = u.id
        WHERE bi.created_at >= NOW() - INTERVAL '${range} days'
          AND u.facility IN ('RCC', 'Hotel Rafael')
        ORDER BY u.facility, bi.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT 
          CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
          bi.item_name,
          bi.quantity,
          bi.charge_amount AS total_amount,
          TO_CHAR(bi.created_at, 'YYYY-MM-DD') AS borrowed_date
        FROM borrowed_items bi
        JOIN users u ON bi.user_id = u.id
        WHERE bi.created_at >= NOW() - INTERVAL '${range} days'
          AND u.facility = $1
        ORDER BY bi.created_at DESC
      `;
      params = [facility];
    }

    const borrowedItems = await pool.query(query, params);

    res.json({
      facility: role === 'superadmin' ? 'All Facilities' : facility,
      range_days: range,
      total_records: borrowedItems.rows.length,
      data: borrowedItems.rows,
    });
  } catch (err) {
    console.error("Error fetching borrowed items report:", err.message);
    res.status(500).json({ error: "Server error fetching borrowed items report" });
  }
});

module.exports = router;