const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { days, housekeeper_id } = req.query;
    const validDays = [7, 14, 30];
    const range = validDays.includes(Number(days)) ? Number(days) : 7;

    const facilityRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1 AND role = 'admin'",
      [adminId]
    );

    if (facilityRes.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or invalid admin." });
    }

    const adminFacility = facilityRes.rows[0].facility;

    let housekeeperFilter = "";
    const params = [adminFacility];
    if (housekeeper_id) {
      params.push(housekeeper_id);
      housekeeperFilter = `AND sh.housekeeper_id = $${params.length}`;
    }

    const reportQuery = `
      SELECT 
        CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
        st.name AS service_type,
        CONCAT(hk.first_name, ' ', hk.last_name) AS housekeeper_name,
        r.room_number,
        r.facility,
        TO_CHAR(sh.preferred_date, 'YYYY-MM-DD') AS date,
        TO_CHAR(sh.preferred_time, 'HH12:MI AM') AS time,
        sh.status
      FROM service_history sh
      LEFT JOIN users g ON sh.guest_id = g.id AND g.role = 'guest'
      LEFT JOIN users hk ON sh.housekeeper_id = hk.id AND hk.role = 'housekeeper'
      LEFT JOIN rooms r ON sh.room_id = r.id
      LEFT JOIN service_types st ON sh.service_type_id = st.id
      WHERE sh.created_at >= NOW() - INTERVAL '${range} days'
        AND sh.facility = $1
        ${housekeeperFilter}
      ORDER BY sh.preferred_date DESC, sh.preferred_time DESC;
    `;

    const { rows } = await pool.query(reportQuery, params);

    res.json({
      facility: adminFacility,
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
    const adminId = req.user.id;

    const facilityRes = await pool.query(
      "SELECT facility FROM users WHERE id = $1 AND role = 'admin'",
      [adminId]
    );

    if (facilityRes.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or invalid admin." });
    }

    const adminFacility = facilityRes.rows[0].facility;

    const hkRes = await pool.query(
      `SELECT id, CONCAT(first_name, ' ', last_name) AS name
       FROM users
       WHERE role = 'housekeeper' AND facility = $1 AND is_active = true
       ORDER BY name ASC`,
      [adminFacility]
    );

    res.json(hkRes.rows);
  } catch (err) {
    console.error("Error fetching housekeepers:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get borrowed items report
router.get("/borrowed-items", authorization, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { days } = req.query;
    const validDays = [7, 14, 30];
    const range = validDays.includes(Number(days)) ? Number(days) : 7;

    const adminResult = await pool.query(
      "SELECT facility FROM users WHERE id = $1 AND role = 'admin'", 
      [adminId]
    );
    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: "Admin not found" });
    }
    const facility = adminResult.rows[0].facility;

    const borrowedItems = await pool.query(
      `
      SELECT 
        bi.item_name,
        bi.quantity,
        CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
        TO_CHAR(bi.created_at, 'YYYY-MM-DD') AS borrowed_date,
        bi.charge_amount AS total_amount
      FROM borrowed_items bi
      JOIN users u ON bi.user_id = u.id
      WHERE bi.is_paid = TRUE
        AND u.facility = $1
        AND bi.created_at >= NOW() - INTERVAL '${range} days'
      ORDER BY bi.created_at DESC
      `,
      [facility]
    );

    res.json({
      facility,
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