const router = require("express").Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.get("/housekeeping-trends", authorization, async (req, res) => {
  try {
    const { granularity } = req.query;
    const { facility: adminFacility, role } = req.user;

    const validGranularity = ["daily", "weekly", "monthly", "yearly"];
    if (!validGranularity.includes(granularity)) {
      return res.status(400).json({ error: "Invalid granularity" });
    }

    if (!adminFacility) {
      return res.status(403).json({ error: "Admin facility not defined" });
    }

    let facilityFilter;
    let params;

    if (role === 'superadmin') {
      facilityFilter = `sh.facility IN ('RCC', 'Hotel Rafael')`;
      params = [];
    } else {
      facilityFilter = `sh.facility = $1`;
      params = [adminFacility];
    }

    let query;
    
    if (granularity === "weekly") {
      query = `
        SELECT 
          to_char(DATE_TRUNC('week', sh.preferred_date), 'YYYY-MM-DD') AS period,
          st.name AS service_type,
          sh.facility,
          COUNT(*) AS quantity
        FROM service_history sh
        LEFT JOIN service_types st ON sh.service_type_id = st.id
        WHERE ${facilityFilter}
        GROUP BY period, st.name, sh.facility
        ORDER BY period ASC, sh.facility
      `;
    } else if (granularity === "monthly") {
      query = `
        SELECT 
          to_char(sh.preferred_date, 'YYYY-MM') AS period,
          st.name AS service_type,
          sh.facility,
          COUNT(*) AS quantity
        FROM service_history sh
        LEFT JOIN service_types st ON sh.service_type_id = st.id
        WHERE ${facilityFilter}
        GROUP BY period, st.name, sh.facility
        ORDER BY period ASC, sh.facility
      `;
    } else if (granularity === "yearly") {
      query = `
        SELECT 
          to_char(sh.preferred_date, 'YYYY') AS period,
          st.name AS service_type,
          sh.facility,
          COUNT(*) AS quantity
        FROM service_history sh
        LEFT JOIN service_types st ON sh.service_type_id = st.id
        WHERE ${facilityFilter}
        GROUP BY period, st.name, sh.facility
        ORDER BY period ASC, sh.facility
      `;
    } else {
      // daily
      query = `
        SELECT 
          to_char(sh.preferred_date, 'YYYY-MM-DD') AS period,
          st.name AS service_type,
          sh.facility,
          COUNT(*) AS quantity
        FROM service_history sh
        LEFT JOIN service_types st ON sh.service_type_id = st.id
        WHERE ${facilityFilter}
        GROUP BY period, st.name, sh.facility
        ORDER BY period ASC, sh.facility
      `;
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;