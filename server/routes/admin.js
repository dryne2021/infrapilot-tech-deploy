const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const {
  // Dashboard
  getDashboardStats,

  // Candidates
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,

  // ✅ NEW: Unassigned candidates (for RecruiterManagement.jsx)
  getUnassignedCandidates,

  // Recruiters
  getRecruiters,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,

  // ✅ NEW: Recruiter candidate endpoints (for RecruiterManagement.jsx)
  getRecruiterCandidates,
  assignCandidateToRecruiter,
  unassignCandidateFromRecruiter,
  resetRecruiterPassword,

  // Assignments (old admin assignments flow)
  assignCandidate,
  bulkAssignCandidates,
  autoAssignCandidates,

  // Credentials
  setCandidateCredentials,
  resetCandidateCredentials,

  // Activity
  getRecentActivity,
} = require("../controllers/adminController");

const router = express.Router();

// 🔐 All admin routes require auth + admin role
router.use(protect);
router.use(authorize("admin"));

/* =======================
   DASHBOARD
======================= */
router.get("/dashboard", getDashboardStats);

/* =======================
   CANDIDATES
======================= */
router.route("/candidates").get(getCandidates).post(createCandidate);

// ✅ REQUIRED by frontend: /api/v1/admin/candidates/unassigned
router.get("/candidates/unassigned", getUnassignedCandidates);

router.route("/candidates/:id").put(updateCandidate).delete(deleteCandidate);

/* =======================
   RECRUITERS
======================= */
router.route("/recruiters").get(getRecruiters).post(createRecruiter);

router.route("/recruiters/:id").put(updateRecruiter).delete(deleteRecruiter);

// ✅ REQUIRED by RecruiterManagement.jsx:
// GET  /api/v1/admin/recruiters/:id/candidates
// POST /api/v1/admin/recruiters/:id/assign      body: { candidateId }
// POST /api/v1/admin/recruiters/:id/unassign    body: { candidateId }
// POST /api/v1/admin/recruiters/:id/reset-password
router.get("/recruiters/:id/candidates", getRecruiterCandidates);
router.post("/recruiters/:id/assign", assignCandidateToRecruiter);
router.post("/recruiters/:id/unassign", unassignCandidateFromRecruiter);
router.post("/recruiters/:id/reset-password", resetRecruiterPassword);

/* =======================
   ASSIGNMENTS (MATCH FRONTEND)
   Frontend calls:
   - PUT  /api/v1/admin/assignments
   - POST /api/v1/admin/assignments/bulk
   - POST /api/v1/admin/assignments/auto-assign
======================= */
router.put("/assignments", assignCandidate);
router.post("/assignments/bulk", bulkAssignCandidates);
router.post("/assignments/auto-assign", autoAssignCandidates);

/* =======================
   CREDENTIALS (MATCH FRONTEND)
   Frontend calls:
   - POST   /api/v1/admin/credentials
   - DELETE /api/v1/admin/credentials/:candidateId
======================= */
router.post("/credentials", setCandidateCredentials);

// ✅ bridge params -> body so controller works without changes
router.delete("/credentials/:candidateId", (req, res, next) => {
  req.body.candidateId = req.params.candidateId;
  return resetCandidateCredentials(req, res, next);
});

/* =======================
   ACTIVITY (MATCH FRONTEND)
   Frontend calls:
   - GET /api/v1/admin/activity
======================= */
router.get("/activity", getRecentActivity);

module.exports = router;
