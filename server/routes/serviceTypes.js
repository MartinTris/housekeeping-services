const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    const { facility, role } = req.user;

    let query;
    let params;

    // For guests, exclude "Checkout" service type
    // For admin/superadmin/housekeeper, show all service types
    const excludeCheckout = role === "guest" || (!role || role === "user");

    if (role === "superadmin") {
      query = excludeCheckout
        ? `
          SELECT * FROM service_types 
          WHERE facility IN ('RCC', 'Hotel Rafael') 
          AND LOWER(name) != 'checkout'
          ORDER BY facility, created_at DESC
        `
        : `
          SELECT * FROM service_types 
          WHERE facility IN ('RCC', 'Hotel Rafael') 
          ORDER BY facility, created_at DESC
        `;
      params = [];
    } else {
      query = excludeCheckout
        ? `
          SELECT * FROM service_types 
          WHERE facility = $1 
          AND LOWER(name) != 'checkout'
          ORDER BY created_at DESC
        `
        : `
          SELECT * FROM service_types 
          WHERE facility = $1 
          ORDER BY created_at DESC
        `;
      params = [facility];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin/Superadmin creates service type
router.post("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin" && role !== "superadmin")
      return res.status(403).json({ error: "Unauthorized" });

    const { name, duration, facility: targetFacility } = req.body;

    // For superadmin, use the selected facility from the form
    // For admin, use their own facility
    const serviceTypeFacility = role === 'superadmin' && targetFacility 
      ? targetFacility 
      : facility;

    // Validate facility for superadmin
    if (role === 'superadmin' && !targetFacility) {
      return res.status(400).json({ error: "Facility selection is required for superadmin" });
    }

    const result = await pool.query(
      `INSERT INTO service_types (facility, name, duration)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [serviceTypeFacility, name, duration]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin edits service type (Superadmin cannot edit)
router.put("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Unauthorized. Only facility admins can edit service types." });

    const { id } = req.params;
    const { name, duration } = req.body;

    const result = await pool.query(
      `
      UPDATE service_types
      SET name = $1, duration = $2
      WHERE id = $3 AND facility = $4
      RETURNING *
      `,
      [name, duration, id, facility]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Service type not found or unauthorized" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin deletes service type (Superadmin cannot delete)
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Unauthorized. Only facility admins can delete service types." });

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM service_types
      WHERE id = $1 AND facility = $2
      RETURNING *
      `,
      [id, facility]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Service type not found or unauthorized" });

    res.json({ message: "Service type deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;