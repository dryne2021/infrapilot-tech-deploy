// server/routes/admin.js

const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router(); // ✅ MUST come before any router usage

// 🔐 All admin routes require auth + admin role
router.use(protect);
router.use(authorize("admin"));

// ✅ Debug logger (AFTER router is defined)
router.use((req, res, next) => {
  console.log("🔥 ADMIN ROUTE HIT:", req.originalUrl);
  next();
});

/* =========================================================
   Guard: fail fast if any controller handler is missing
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

router.get(
  "/candidates/unassigned",
  adminController.getUnassignedCandidates
);

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
   ASSIGNMENTS
======================= */
router.put("/assignments", adminController.assignCandidate);
router.post("/assignments/bulk", adminController.bulkAssignCandidates);
router.post("/assignments/auto-assign", adminController.autoAssignCandidates);

/* =======================
   CREDENTIALS
======================= */
router.post("/credentials", adminController.setCandidateCredentials);

router.delete("/credentials/:candidateId", (req, res, next) => {
  req.body.candidateId = req.params.candidateId;
  return adminController.resetCandidateCredentials(req, res, next);
});

/* =======================
   ACTIVITY
======================= */
router.get("/activity", adminController.getRecentActivity);

module.exports = router;
