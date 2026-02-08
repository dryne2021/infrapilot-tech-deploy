const Plan = require("../models/Plan");
const ErrorResponse = require("../utils/ErrorResponse");

// GET /api/v1/admin/plans
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ createdAt: 1 }).lean();
    return res.status(200).json(plans); // ✅ return array (matches your admin UI style)
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

    const exists = await Plan.findOne({ planId: String(planId).trim() });
    if (exists) return next(new ErrorResponse("planId already exists", 400));

    const created = await Plan.create({
      planId: String(planId).trim(),
      name: String(name).trim(),
      price: Number(price || 0),
      duration: Number(duration || 30),
      features: Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : String(features || "")
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
      description: String(description || "").trim(),
      color: String(color || "blue").trim(),
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/admin/plans/:id
exports.updatePlan = async (req, res, next) => {
  try {
    const updated = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return next(new ErrorResponse("Plan not found", 404));
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/plans/:id
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return next(new ErrorResponse("Plan not found", 404));

    await plan.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
