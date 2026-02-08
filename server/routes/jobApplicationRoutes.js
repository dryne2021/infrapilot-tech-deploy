const express = require("express");
const router = express.Router();

const {
  createJobApplication,
  getJobsByCandidate,
  getJobsByRecruiter,
  updateJobApplication,
  deleteJobApplication,
} = require("../controllers/jobApplicationController");

// POST create job
router.post("/", createJobApplication);

// GET jobs for a candidate
router.get("/candidate/:candidateId", getJobsByCandidate);

// GET jobs for a recruiter
router.get("/recruiter/:recruiterId", getJobsByRecruiter);

// PUT update job
router.put("/:id", updateJobApplication);

// DELETE job
router.delete("/:id", deleteJobApplication);

module.exports = router;
