const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { getCandidateById } = require('../controllers/candidateController');
const { setCandidateCredentials } = require('../controllers/adminController');

// -----------------------------
// Existing: Get candidate by ID
// -----------------------------
router.get(
  '/:id',
  protect,
  authorize('admin', 'recruiter'),
  getCandidateById
);

// --------------------------------------
// ✅ NEW: Create / Reset candidate credentials
// --------------------------------------
router.post(
  '/:id/credentials',
  protect,
  authorize('admin'),
  setCandidateCredentials
);

module.exports = router;
