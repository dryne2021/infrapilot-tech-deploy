const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

const {
  generateResume,
  downloadResumeAsWord,
} = require("../controllers/resumeController");

// DEBUG
console.log("protect:", protect);
console.log("authorize:", authorize);
console.log("generateResume:", generateResume);
console.log("downloadResumeAsWord:", downloadResumeAsWord);

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