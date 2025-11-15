const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authorization } = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    const { facility } = req.user;

    const result = await pool.query(
      "SELECT * FROM service_types WHERE facility = $1 ORDER BY created_at DESC",
      [facility]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin creates service type
router.post("/", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Unauthorized" });

    const { name, duration } = req.body;

    const result = await pool.query(
      `
      INSERT INTO service_types (facility, name, duration)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [facility, name, duration]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin edits service type
router.put("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Unauthorized" });

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
      return res.status(404).json({ error: "Service type not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin deletes service type
router.delete("/:id", authorization, async (req, res) => {
  try {
    const { role, facility } = req.user;
    if (role !== "admin")
      return res.status(403).json({ error: "Unauthorized" });

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
      return res.status(404).json({ error: "Service type not found" });

    res.json({ message: "Service type deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
