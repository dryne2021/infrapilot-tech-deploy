// server/routes/resumeRoutes.js

const express = require("express");
const router = express.Router();

console.log("✅ resumeRoutes.js loaded");

// Import controller functions
const {
  generateResume,
  downloadResumeAsWord,
  generateResumeAsWord,
} = require("../controllers/resumeController");

// Generate resume (returns JSON)
router.post("/generate", (req, res, next) => {
  console.log("✅ /api/v1/resume/generate hit");
  return generateResume(req, res, next);
});

// ✅ Download resume as Word document
// - GET kept for backward compatibility
// - POST added (recommended) to avoid URL length issues that cause .txt fallback / failures
router.get("/download", (req, res, next) => {
  console.log("📥 /api/v1/resume/download hit (GET)");
  return downloadResumeAsWord(req, res, next);
});

router.post("/download", (req, res, next) => {
  console.log("📥 /api/v1/resume/download hit (POST)");
  return downloadResumeAsWord(req, res, next);
});

// Generate resume and return as Word directly
router.post("/generate-word", (req, res, next) => {
  console.log("📄 /api/v1/resume/generate-word hit");
  return generateResumeAsWord(req, res, next);
});

module.exports = router;
