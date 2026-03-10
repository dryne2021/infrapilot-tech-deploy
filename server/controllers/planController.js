// server/controllers/planController.js

const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");

// GET /api/v1/admin/plans
exports.getPlans = async (req, res, next) => {
  try {
    // ✅ PostgreSQL version - return array directly (matches admin UI style)
    const result = await pool.query(`
      SELECT *
      FROM plans
      ORDER BY created_at ASC
    `);

    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/plans
exports.createPlan = async (req, res, next) => {
  try {
    const { planId, name, price, duration, features, description, color, status } = req.body;

    if (!planId || !name) {
      return next(new ErrorResponse("planId and name are required", 400));
    }

    // ✅ Check if planId already exists
    const exists = await pool.query(
      `SELECT id FROM plans WHERE plan_id = $1`,
      [String(planId).trim()]
    );

    if (exists.rows.length > 0) {
      return next(new ErrorResponse("planId already exists", 400));
    }

    // Process features array
    const featuresArray = Array.isArray(features)
      ? features.map((f) => String(f).trim()).filter(Boolean)
      : String(features || "")
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);

    // ✅ PostgreSQL INSERT
    const result = await pool.query(
      `
      INSERT INTO plans
      (plan_id, name, price, duration, features, description, color, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
      `,
      [
        String(planId).trim(),
        String(name).trim(),
        Number(price || 0),
        Number(duration || 30),
        JSON.stringify(featuresArray),
        String(description || "").trim(),
        String(color || "blue").trim(),
        status === "inactive" ? "inactive" : "active"
      ]
    );

    const created = result.rows[0];

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/plans/:id
exports.updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic UPDATE query based on provided fields
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setFields.push(`name = $${paramIndex}`);
      values.push(String(updates.name).trim());
      paramIndex++;
    }

    if (updates.price !== undefined) {
      setFields.push(`price = $${paramIndex}`);
      values.push(Number(updates.price));
      paramIndex++;
    }

    if (updates.duration !== undefined) {
      setFields.push(`duration = $${paramIndex}`);
      values.push(Number(updates.duration));
      paramIndex++;
    }

    if (updates.features !== undefined) {
      // Process features array
      const featuresArray = Array.isArray(updates.features)
        ? updates.features.map((f) => String(f).trim()).filter(Boolean)
        : String(updates.features || "")
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
      
      setFields.push(`features = $${paramIndex}`);
      values.push(JSON.stringify(featuresArray));
      paramIndex++;
    }

    if (updates.description !== undefined) {
      setFields.push(`description = $${paramIndex}`);
      values.push(String(updates.description).trim());
      paramIndex++;
    }

    if (updates.color !== undefined) {
      setFields.push(`color = $${paramIndex}`);
      values.push(String(updates.color).trim());
      paramIndex++;
    }

    if (updates.status !== undefined) {
      setFields.push(`status = $${paramIndex}`);
      values.push(updates.status === "inactive" ? "inactive" : "active");
      paramIndex++;
    }

    if (updates.planId !== undefined) {
      // Check if new planId already exists (excluding current plan)
      const exists = await pool.query(
        `SELECT id FROM plans WHERE plan_id = $1 AND id != $2`,
        [String(updates.planId).trim(), id]
      );

      if (exists.rows.length > 0) {
        return next(new ErrorResponse("planId already exists", 400));
      }

      setFields.push(`plan_id = $${paramIndex}`);
      values.push(String(updates.planId).trim());
      paramIndex++;
    }

    if (setFields.length === 0) {
      return next(new ErrorResponse("No valid fields to update", 400));
    }

    // Always update the timestamp
    setFields.push(`updated_at = NOW()`);

    // Add the ID as the last parameter
    values.push(id);

    const query = `
      UPDATE plans
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const updated = result.rows[0];

    if (!updated) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/plans/:id
exports.deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ PostgreSQL DELETE with RETURNING
    const result = await pool.query(
      `DELETE FROM plans WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ✅ Additional helper endpoints
// ============================================================

// GET /api/v1/admin/plans/:id
exports.getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM plans WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/plans/active
exports.getActivePlans = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM plans
      WHERE status = 'active'
      ORDER BY price ASC, created_at ASC
    `);

    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/plans/:id/status
exports.togglePlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return next(new ErrorResponse("Valid status (active/inactive) is required", 400));
    }

    const result = await pool.query(
      `UPDATE plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Plan not found", 404));
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};