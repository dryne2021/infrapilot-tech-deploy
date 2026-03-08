// server/routes/resumeRoutes.js

const express = require("express");
const router = express.Router();

console.log("✅ resumeRoutes.js loaded");
const ResumeLog = require("../models/ResumeLog");

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

// ==========================================================
// DAILY RESUME REPORT (Recruiter + Candidate + Count)
// ==========================================================
router.get("/logs", async (req, res) => {
  try {

    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    const logs = await ResumeLog.aggregate([
      {
        $match: {
          generatedAt: { $gte: startOfDay }
        }
      },

      {
        $group: {
          _id: {
            recruiterId: "$recruiterId",
            candidateId: "$candidateId"
          },
          totalResumes: { $sum: 1 },
          lastGenerated: { $max: "$generatedAt" }
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "_id.recruiterId",
          foreignField: "_id",
          as: "recruiter"
        }
      },

      {
        $lookup: {
          from: "candidates",
          localField: "_id.candidateId",
          foreignField: "_id",
          as: "candidate"
        }
      },

      { $unwind: "$recruiter" },
      { $unwind: "$candidate" },

      {
        $project: {
          recruiter: {
            $concat: ["$recruiter.firstName"," ","$recruiter.lastName"]
          },
          candidate: "$candidate.fullName",
          totalResumes: 1,
          generatedAt: "$lastGenerated"
        }
      },

      { $sort: { generatedAt: -1 } }
    ]);

    // ---------- Analytics ----------
    const totalResumes = logs.reduce((sum,l)=>sum+l.totalResumes,0)

    let topRecruiter = "-"
    let topCandidate = "-"

    if(logs.length){
      topRecruiter = logs.reduce((a,b)=>a.totalResumes>b.totalResumes?a:b).recruiter
      topCandidate = logs.reduce((a,b)=>a.totalResumes>b.totalResumes?a:b).candidate
    }

    res.json({
      totalResumes,
      topRecruiter,
      topCandidate,
      logs
    });

  } catch (error) {
    console.error("❌ Failed to fetch resume logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});
module.exports = router;
