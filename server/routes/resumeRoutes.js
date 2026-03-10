const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

const {
  generateResume,
  downloadResumeAsWord,
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

module.exports = router;