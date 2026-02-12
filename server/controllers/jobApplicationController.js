// server/controllers/jobApplicationController.js
const JobApplication = require("../models/JobApplication");

// 🔥 Allowed status values (must match schema enum)
const ALLOWED_STATUSES = [
  "pending",
  "applied",
  "interview",
  "offer",
  "rejected",
];

// ============================================================
// ✅ Create a job application (OPTION A FLOW)
// ============================================================
exports.createJobApplication = async (req, res) => {
  try {
    let {
      candidateId,
      recruiterId,
      jobId,
      jobTitle,
      company,
      companyName,
      description,
      jobLink,
      status,
      matchScore,
      salaryRange,
      jobDescriptionFull,
    } = req.body;

    if (!candidateId || !recruiterId || !jobTitle || !(company || companyName)) {
      return res.status(400).json({
        message:
          "candidateId, recruiterId, jobTitle and company/companyName are required",
      });
    }

    // 🔥 Normalize status
    status = (status || "applied").toString().toLowerCase().trim();

    if (!ALLOWED_STATUSES.includes(status)) {
      status = "applied";
    }

    const doc = await JobApplication.create({
      candidateId,
      recruiterId,
      jobId: jobId || "",
      jobTitle,
      company: company || companyName,
      companyName: companyName || company,
      description: description || "",
      jobLink: jobLink || "",
      status,
      resumeStatus: "Pending", // 🔥 starts pending
      matchScore: typeof matchScore === "number" ? matchScore : 0,
      salaryRange: salaryRange || "",
      jobDescriptionFull: jobDescriptionFull || "",
      resumeText: "",
      resumeDocxUrl: "",
      resumeUsed: {
        resumeId: null,
        fileName: "",
        fileUrl: "",
      },
      appliedDate: new Date(),
    });

    return res.status(201).json({ success: true, job: doc });
  } catch (err) {
    console.error("❌ createJobApplication error:", err);
    return res
      .status(500)
      .json({ message: "Server error creating job application" });
  }
};

// ============================================================
// ✅ Get jobs by candidate (and optionally recruiter)
// ============================================================
exports.getJobsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { recruiterId } = req.query;

    const filter = { candidateId };
    if (recruiterId) filter.recruiterId = recruiterId;

    const jobs = await JobApplication.find(filter).sort({
      appliedDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({ success: true, jobs });
  } catch (err) {
    console.error("❌ getJobsByCandidate error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching job applications" });
  }
};

// ============================================================
// ✅ Update job by id (Used to attach resume later)
// ============================================================
exports.updateJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const updates = { ...req.body, updatedAt: Date.now() };

    // 🔥 Normalize status if being updated
    if (updates.status) {
      updates.status = updates.status.toString().toLowerCase().trim();

      if (!ALLOWED_STATUSES.includes(updates.status)) {
        updates.status = "pending";
      }
    }

    // Keep compatibility for company/companyName
    if (updates.company && !updates.companyName) {
      updates.companyName = updates.company;
    }

    if (updates.companyName && !updates.company) {
      updates.company = updates.companyName;
    }

    // 🔥 If resumeDocxUrl is being attached, auto-update resumeStatus
    if (updates.resumeDocxUrl) {
      updates.resumeStatus = "Submitted";

      updates.resumeUsed = {
        resumeId: null,
        fileName: updates.resumeFileName || "Resume.docx",
        fileUrl: updates.resumeDocxUrl,
      };
    }

    const job = await JobApplication.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("❌ updateJobApplication error:", err);
    return res
      .status(500)
      .json({ message: "Server error updating job application" });
  }
};

// ============================================================
// ✅ Delete job by id
// ============================================================
exports.deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobApplication.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job application deleted",
    });
  } catch (err) {
    console.error("❌ deleteJobApplication error:", err);
    return res
      .status(500)
      .json({ message: "Server error deleting job application" });
  }
};
