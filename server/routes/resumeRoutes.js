const express = require("express");
const router = express.Router();

console.log("✅ resumeRoutes.js loaded");

// Import all functions
const { generateResume, downloadResumeAsWord, generateResumeAsWord } = require("../controllers/resumeController");

// Generate resume (returns JSON)
router.post("/generate", (req, res, next) => {
  console.log("✅ /api/v1/resume/generate hit");
  return generateResume(req, res, next);
});

// Download resume as Word document
router.get("/download", (req, res, next) => {
  console.log("📥 /api/v1/resume/download hit");
  return downloadResumeAsWord(req, res, next);
});

// Generate resume and return as Word directly
router.post("/generate-word", (req, res, next) => {
  console.log("📄 /api/v1/resume/generate-word hit");
  return generateResumeAsWord(req, res, next);
});

module.exports = router;