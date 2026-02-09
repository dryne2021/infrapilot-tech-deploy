const express = require('express');
const {
  getCandidates,
  getCandidate,
  updateCandidateStatus, // ✅ ADD THIS
  createApplication,
  getApplications,
  getApplication,
  updateApplicationStatus,
  addApplicationNote,
  getDashboardStats
} = require('../controllers/recruiterController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and recruiter role
router.use(protect);
router.use(authorize('recruiter'));

// Candidate routes
router.route('/candidates')
  .get(getCandidates);

router.route('/candidates/:id')
  .get(getCandidate);

// ✅ NEW: update recruiterStatus (used by recruiter dashboard)
router.route('/candidates/:id/status')
  .put(updateCandidateStatus);

// Application routes
router.route('/applications')
  .get(getApplications)
  .post(createApplication);

router.route('/applications/:id')
  .get(getApplication);

router.route('/applications/:id/status')
  .put(updateApplicationStatus);

router.route('/applications/:id/notes')
  .post(addApplicationNote);

// Dashboard routes
router.get('/dashboard', getDashboardStats);

module.exports = router;
