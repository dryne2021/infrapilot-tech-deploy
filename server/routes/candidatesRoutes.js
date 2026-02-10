const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const {
  getCandidates,      // ✅ NEW: list candidates
  getCandidateById,
} = require('../controllers/candidateController');
const { setCandidateCredentials } = require('../controllers/adminController');

// --------------------------------------
// ✅ NEW: List candidates
// GET /api/v1/admin/candidates
// --------------------------------------
router.get(
  '/',
  protect,
  authorize('admin', 'recruiter'),
  getCandidates
);

// -----------------------------
// Existing: Get candidate by ID
// GET /api/v1/admin/candidates/:id
// -----------------------------
router.get(
  '/:id',
  protect,
  authorize('admin', 'recruiter'),
  getCandidateById
);

// --------------------------------------
// Existing: Create / Reset candidate credentials
// POST /api/v1/admin/candidates/:id/credentials
// --------------------------------------
router.post(
  '/:id/credentials',
  protect,
  authorize('admin'),
  setCandidateCredentials
);

module.exports = router;
