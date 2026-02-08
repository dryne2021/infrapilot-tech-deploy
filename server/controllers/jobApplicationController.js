// server/controllers/jobApplicationController.js
const JobApplication = require("../models/JobApplication");

// ✅ Create a job application
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
      jobDescriptionFull,
      resumeText,
      resumeDocxUrl,
    } = req.body;

    if (!candidateId || !recruiterId || !jobTitle || !(company || companyName)) {
      return res.status(400).json({
        message: "candidateId, recruiterId, jobTitle and company/companyName are required",
      });
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
      status: status || "Applied",
      resumeStatus: resumeStatus || "Pending",
      matchScore: typeof matchScore === "number" ? matchScore : 0,
      salaryRange: salaryRange || "",
      jobDescriptionFull: jobDescriptionFull || "",
      resumeText: resumeText || "",
      resumeDocxUrl: resumeDocxUrl || "",
      appliedDate: new Date(),
    });

    return res.status(201).json({ success: true, job: doc });
  } catch (err) {
    console.error("❌ createJobApplication error:", err);
    return res.status(500).json({ message: "Server error creating job application" });
  }
};

// ✅ Get jobs by candidate (and optionally recruiter)
exports.getJobsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { recruiterId } = req.query;

    const filter = { candidateId };
    if (recruiterId) filter.recruiterId = recruiterId;

    const jobs = await JobApplication.find(filter).sort({ appliedDate: -1, createdAt: -1 });

    return res.status(200).json({ success: true, jobs });
  } catch (err) {
    console.error("❌ getJobsByCandidate error:", err);
    return res.status(500).json({ message: "Server error fetching job applications" });
  }
};

// ✅ Update job by id
exports.updateJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // allow partial updates
    const updates = { ...req.body, updatedAt: Date.now() };

    // keep compatibility for company/companyName
    if (updates.company && !updates.companyName) updates.companyName = updates.company;
    if (updates.companyName && !updates.company) updates.company = updates.companyName;

    const job = await JobApplication.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!job) return res.status(404).json({ message: "Job application not found" });

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("❌ updateJobApplication error:", err);
    return res.status(500).json({ message: "Server error updating job application" });
  }
};

// ✅ Delete job by id
exports.deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobApplication.findByIdAndDelete(id);
    if (!job) return res.status(404).json({ message: "Job application not found" });

    return res.status(200).json({ success: true, message: "Job application deleted" });
  } catch (err) {
    console.error("❌ deleteJobApplication error:", err);
    return res.status(500).json({ message: "Server error deleting job application" });
  }
};
