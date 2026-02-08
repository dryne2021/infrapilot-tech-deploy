const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { getCandidateById } = require('../controllers/candidateController');

// This endpoint is for Admin/Recruiter (Option A needs server-side fetch)
router.get('/:id', protect, authorize('admin', 'recruiter'), getCandidateById);

module.exports = router;
