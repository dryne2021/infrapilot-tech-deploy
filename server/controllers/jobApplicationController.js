const JobApplication = require("../models/JobApplication");

// ✅ Create a job application (recruiter adds a job for a candidate)
exports.createJobApplication = async (req, res) => {
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
      appliedDate,
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
      jobId,
      jobTitle,
      company: company || companyName,
      companyName: companyName || company,
      description: description || "",
      jobLink: jobLink || "",
      status: status || "Applied",
      resumeStatus: resumeStatus || "Pending",
      matchScore: typeof matchScore === "number" ? matchScore : 0,
      salaryRange: salaryRange || "",
      appliedDate: appliedDate ? new Date(appliedDate) : new Date(),
      jobDescriptionFull: jobDescriptionFull || "",
      resumeText: resumeText || "",
      resumeDocxUrl: resumeDocxUrl || "",
    });

    return res.status(201).json({ success: true, job: created });
  } catch (error) {
    console.error("createJobApplication error:", error);
    return res.status(500).json({ message: "Server error creating job" });
  }
};

// ✅ Get jobs for a candidate (used by recruiter/candidate dashboard)
exports.getJobsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const jobs = await JobApplication.find({ candidateId })
      .sort({ appliedDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error("getJobsByCandidate error:", error);
    return res.status(500).json({ message: "Server error loading jobs" });
  }
};

// ✅ Get jobs for a recruiter (all jobs they created)
exports.getJobsByRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const jobs = await JobApplication.find({ recruiterId })
      .sort({ appliedDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error("getJobsByRecruiter error:", error);
    return res.status(500).json({ message: "Server error loading recruiter jobs" });
  }
};

// ✅ Update a job (edit status/description/resume info)
exports.updateJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await JobApplication.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.status(200).json({ success: true, job: updated });
  } catch (error) {
    console.error("updateJobApplication error:", error);
    return res.status(500).json({ message: "Server error updating job" });
  }
};

// ✅ Delete a job
exports.deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await JobApplication.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.status(200).json({ success: true, message: "Job deleted" });
  } catch (error) {
    console.error("deleteJobApplication error:", error);
    return res.status(500).json({ message: "Server error deleting job" });
  }
};
