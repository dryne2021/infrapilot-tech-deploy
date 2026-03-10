const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

const {
  generateResume,
  downloadResumeAsWord,
  generateResumeAsWord,
} = require("../controllers/resumeController");

// Generate resume
router.post(
  "/generate",
  protect,
  authorize("recruiter", "admin"),
  generateResume
);

// Download resume
router.post(
  "/download",
  protect,
  authorize("recruiter", "admin"),
  downloadResumeAsWord
);

// Generate resume and download Word directly
router.post(
  "/generate-word",
  protect,
  authorize("recruiter", "admin"),
  generateResumeAsWord
);

module.exports = router;