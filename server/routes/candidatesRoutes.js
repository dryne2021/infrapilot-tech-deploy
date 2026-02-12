const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const candidateController = require('../controllers/candidateController');

// ======================================================
// CANDIDATE SELF ROUTES
// Base route: /api/v1/candidates
// ======================================================

// Get own profile
router.get('/profile', protect, candidateController.getProfile);

// Update own profile
router.put('/profile', protect, candidateController.updateProfile);

// Resume routes
router.post('/resume', protect, candidateController.uploadResume);
router.get('/resumes', protect, candidateController.getResumes);
router.delete('/resumes/:resumeId', protect, candidateController.deleteResume);
router.put('/resumes/:resumeId/active', protect, candidateController.setActiveResume);

// Job applications
router.get('/applications', protect, candidateController.getApplications);
router.get('/applications/:id', protect, candidateController.getApplication);

module.exports = router;
