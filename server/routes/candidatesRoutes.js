const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const {
  getCandidateById,
} = require('../controllers/candidateController');

// -------------------------------------------------
// GET candidate by ID
// Route: /api/v1/candidates/:id
// Used by recruiter or admin viewing candidate
// -------------------------------------------------
router.get(
  '/:id',
  protect,
  authorize('admin', 'recruiter'),
  getCandidateById
);

module.exports = router;
