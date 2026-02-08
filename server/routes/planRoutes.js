const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { getPlans, createPlan, updatePlan, deletePlan } = require("../controllers/planController");

// /api/v1/admin/plans
router.get("/", protect, authorize("admin"), getPlans);
router.post("/", protect, authorize("admin"), createPlan);
router.put("/:id", protect, authorize("admin"), updatePlan);
router.delete("/:id", protect, authorize("admin"), deletePlan);

module.exports = router;
