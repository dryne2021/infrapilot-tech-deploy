const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadResume,
  getResumes,
  deleteResume,
  setActiveResume,
  getApplications,
  getApplication
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and candidate role
router.use(protect);
router.use(authorize('candidate'));

// Profile routes
router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// Resume routes
router.route('/resumes')
  .get(getResumes)
  .post(uploadResume);

router.route('/resumes/:resumeId')
  .delete(deleteResume);

router.put('/resumes/:resumeId/set-active', setActiveResume);

// Application routes
router.route('/applications')
  .get(getApplications);

router.route('/applications/:id')
  .get(getApplication);

module.exports = router;