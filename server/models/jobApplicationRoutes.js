const express = require("express");
const router = express.Router();

const JobApplication = require("../models/JobApplication");

// ✅ Create a job application (save jobId, description, resumeText, etc.)
router.post("/", async (req, res, next) => {
  try {
    const {
      candidateId,
      recruiterId,
      jobId,
      jobTitle,
      company,
      companyName,
      description,
      jobLink,
      status,
      resumeStatus,
      matchScore,
      salaryRange,
      jobDescriptionFull,
      resumeText,
      resumeDocxUrl,
    } = req.body;

    if (!candidateId || !recruiterId || !jobTitle) {
      return res.status(400).json({
        message: "candidateId, recruiterId, and jobTitle are required",
      });
    }

    const created = await JobApplication.create({
      candidateId,
      recruiterId,
      jobId: jobId || "",
      jobTitle,
      company: company || companyName || "",
      companyName: companyName || company || "",
      description: description || "",
      jobLink: jobLink || "",
      status: status || "Applied",
      resumeStatus: resumeStatus || "Pending",
      matchScore: typeof matchScore === "number" ? matchScore : 0,
      salaryRange: salaryRange || "",
      jobDescriptionFull: jobDescriptionFull || "",
      resumeText: resumeText || "",
      resumeDocxUrl: resumeDocxUrl || "",
      appliedDate: new Date(),
    });

    return res.status(201).json({ success: true, job: created });
  } catch (err) {
    next(err);
  }
});

// ✅ Get jobs by candidateId
router.get("/candidate/:candidateId", async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const jobs = await JobApplication.find({ candidateId })
      .sort({ appliedDate: -1 })
      .lean();

    return res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
});

// ✅ Get jobs by recruiterId
router.get("/recruiter/:recruiterId", async (req, res, next) => {
  try {
    const { recruiterId } = req.params;
    const jobs = await JobApplication.find({ recruiterId })
      .sort({ appliedDate: -1 })
      .lean();

    return res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
});

// ✅ Update a job application (edit job description/status/resume)
router.put("/:id", async (req, res, next) => {
  try {
    const updated = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});

// ✅ Delete a job application
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await JobApplication.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
