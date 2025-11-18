const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

// Get all permissions (optionally filtered by facility and role)
router.get("/", authorization, async (req, res) => {
  try {
    const { role: userRole } = req.user;
    const { facility, role } = req.query;

    // Only superadmin can view permissions
    if (userRole !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    let query = `
      SELECT id, facility, role, page_key, page_name, is_enabled, updated_at
      FROM page_permissions
    `;
    const conditions = [];
    const params = [];

    if (facility) {
      conditions.push(`facility = $${params.length + 1}`);
      params.push(facility);
    }

    if (role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY facility, role, page_key`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get permissions for a specific user (based on their role and facility)
router.get("/my-permissions", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;

    // Superadmin has access to everything, no restrictions
    if (role === "superadmin") {
      return res.json({ all_access: true, permissions: [] });
    }

    if (!facility) {
      return res.json({ permissions: [] });
    }

    const result = await pool.query(
      `SELECT page_key, page_name, is_enabled
       FROM page_permissions
       WHERE facility = $1 AND role = $2 AND is_enabled = TRUE
       ORDER BY page_key`,
      [facility, role]
    );

    res.json({ 
      all_access: false,
      permissions: result.rows 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Update a single permission (toggle enabled/disabled)
router.put("/:id", authorization, async (req, res) => {
  try {
    const { role: userRole, id: userId } = req.user;
    const { id } = req.params;
    const { is_enabled } = req.body;

    // Only superadmin can update permissions
    if (userRole !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    if (typeof is_enabled !== "boolean") {
      return res.status(400).json({ error: "is_enabled must be a boolean" });
    }

    const result = await pool.query(
      `UPDATE page_permissions
       SET is_enabled = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [is_enabled, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Permission not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Bulk update permissions (enable/disable multiple pages at once)
router.put("/bulk/update", authorization, async (req, res) => {
  try {
    const { role: userRole, id: userId } = req.user;
    const { permission_ids, is_enabled } = req.body;

    // Only superadmin can update permissions
    if (userRole !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    if (!Array.isArray(permission_ids) || permission_ids.length === 0) {
      return res.status(400).json({ error: "permission_ids must be a non-empty array" });
    }

    if (typeof is_enabled !== "boolean") {
      return res.status(400).json({ error: "is_enabled must be a boolean" });
    }

    const result = await pool.query(
      `UPDATE page_permissions
       SET is_enabled = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($3::uuid[])
       RETURNING *`,
      [is_enabled, userId, permission_ids]
    );

    res.json({
      message: `${result.rows.length} permissions updated`,
      updated: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Enable/disable all pages for a specific role at a facility
router.put("/bulk/facility-role", authorization, async (req, res) => {
  try {
    const { role: userRole, id: userId } = req.user;
    const { facility, role, is_enabled } = req.body;

    // Only superadmin can update permissions
    if (userRole !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    if (!facility || !role) {
      return res.status(400).json({ error: "facility and role are required" });
    }

    if (typeof is_enabled !== "boolean") {
      return res.status(400).json({ error: "is_enabled must be a boolean" });
    }

    const result = await pool.query(
      `UPDATE page_permissions
       SET is_enabled = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE facility = $3 AND role = $4
       RETURNING *`,
      [is_enabled, userId, facility, role]
    );

    res.json({
      message: `${result.rows.length} permissions updated for ${role} at ${facility}`,
      updated: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;