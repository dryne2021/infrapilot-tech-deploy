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

  // Recruiters
  getRecruiters,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,

  // Assignments
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

router.route("/candidates/:id").put(updateCandidate).delete(deleteCandidate);

/* =======================
   RECRUITERS
======================= */
router.route("/recruiters").get(getRecruiters).post(createRecruiter);

router.route("/recruiters/:id").put(updateRecruiter).delete(deleteRecruiter);

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
