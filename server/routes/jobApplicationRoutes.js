// server/routes/jobApplicationRoutes.js
const express = require("express");
const router = express.Router();

const {
  createJobApplication,
  getJobsByCandidate,
  updateJobApplication,
  deleteJobApplication,
} = require("../controllers/jobApplicationController");

// POST   /api/v1/job-applications
router.post("/", createJobApplication);

// GET    /api/v1/job-applications/candidate/:candidateId?recruiterId=...
router.get("/candidate/:candidateId", getJobsByCandidate);

// PUT    /api/v1/job-applications/:id
router.put("/:id", updateJobApplication);

// DELETE /api/v1/job-applications/:id
router.delete("/:id", deleteJobApplication);

module.exports = router;
