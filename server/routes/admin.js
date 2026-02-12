// server/routes/admin.js
router.use((req, res, next) => {
  console.log("🔥 ADMIN ROUTE HIT:", req.originalUrl);
  next();
});

const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const adminController = require("../controllers/adminController");

const router = express.Router();

// 🔐 All admin routes require auth + admin role
router.use(protect);
router.use(authorize("admin"));

/* =========================================================
   Guard: fail fast if any controller handler is missing
   (Prevents: Route.get() got Undefined)
========================================================= */
const requiredHandlers = [
  // Dashboard
  "getDashboardStats",

  // Candidates
  "getCandidates",
  "createCandidate",
  "updateCandidate",
  "deleteCandidate",
  "getUnassignedCandidates",

  // Recruiters
  "getRecruiters",
  "createRecruiter",
  "updateRecruiter",
  "deleteRecruiter",
  "getRecruiterCandidates",
  "assignCandidateToRecruiter",
  "unassignCandidateFromRecruiter",
  "resetRecruiterPassword",

  // Assignments
  "assignCandidate",
  "bulkAssignCandidates",
  "autoAssignCandidates",

  // Credentials
  "setCandidateCredentials",
  "resetCandidateCredentials",

  // Activity
  "getRecentActivity",
];

for (const name of requiredHandlers) {
  if (typeof adminController[name] !== "function") {
    // This will show clearly in Render logs which handler is missing.
    throw new Error(
      `[admin routes] Missing controller export: ${name}. ` +
        `Check server/controllers/adminController.js -> exports.${name} = ...`
    );
  }
}

/* =======================
   DASHBOARD
======================= */
router.get("/dashboard", adminController.getDashboardStats);

/* =======================
   CANDIDATES
======================= */
router
  .route("/candidates")
  .get(adminController.getCandidates)
  .post(adminController.createCandidate);

// ✅ REQUIRED by frontend: /api/v1/admin/candidates/unassigned
router.get("/candidates/unassigned", adminController.getUnassignedCandidates);

router
  .route("/candidates/:id")
  .put(adminController.updateCandidate)
  .delete(adminController.deleteCandidate);

/* =======================
   RECRUITERS
======================= */
router
  .route("/recruiters")
  .get(adminController.getRecruiters)
  .post(adminController.createRecruiter);

router
  .route("/recruiters/:id")
  .put(adminController.updateRecruiter)
  .delete(adminController.deleteRecruiter);

// ✅ REQUIRED by RecruiterManagement.jsx
router.get(
  "/recruiters/:id/candidates",
  adminController.getRecruiterCandidates
);
router.post(
  "/recruiters/:id/assign",
  adminController.assignCandidateToRecruiter
);
router.post(
  "/recruiters/:id/unassign",
  adminController.unassignCandidateFromRecruiter
);
router.post(
  "/recruiters/:id/reset-password",
  adminController.resetRecruiterPassword
);

/* =======================
   ASSIGNMENTS (MATCH FRONTEND)
======================= */
router.put("/assignments", adminController.assignCandidate);
router.post("/assignments/bulk", adminController.bulkAssignCandidates);
router.post("/assignments/auto-assign", adminController.autoAssignCandidates);

/* =======================
   CREDENTIALS (MATCH FRONTEND)
======================= */
router.post("/credentials", adminController.setCandidateCredentials);

// ✅ bridge params -> body so controller works without changes
router.delete("/credentials/:candidateId", (req, res, next) => {
  req.body.candidateId = req.params.candidateId;
  return adminController.resetCandidateCredentials(req, res, next);
});

/* =======================
   ACTIVITY (MATCH FRONTEND)
======================= */
router.get("/activity", adminController.getRecentActivity);

module.exports = router;
