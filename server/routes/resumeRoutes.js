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
console.log("📄 Resume download route registered");

// Generate resume
router.post(
  "/generate",
  protect,
  authorize("recruiter", "admin"),
  generateResume
);

// Download resume - temporarily removed authorize for testing
router.post(
  "/download",
  protect,
  downloadResumeAsWord
);

router.get(
  "/download",
  protect,
  downloadResumeAsWord
);

module.exports = router;