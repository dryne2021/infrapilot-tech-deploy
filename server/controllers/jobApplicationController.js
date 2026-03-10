// server/controllers/jobApplicationController.js

const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");

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

    // ✅ PostgreSQL INSERT
    const result = await pool.query(
      `
      INSERT INTO job_applications
      (
        candidate_id,
        recruiter_id,
        job_id,
        job_title,
        company,
        company_name,
        description,
        job_link,
        status,
        resume_status,
        match_score,
        salary_range,
        job_description_full,
        resume_text,
        resume_docx_url,
        applied_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
      `,
      [
        candidateId,
        recruiterId,
        jobId || "",
        jobTitle,
        company || companyName,
        companyName || company,
        description || "",
        jobLink || "",
        status,
        "Pending",
        typeof matchScore === "number" ? matchScore : 0,
        salaryRange || "",
        jobDescriptionFull || "",
        "", // resume_text
        "", // resume_docx_url
      ]
    );

    const doc = result.rows[0];

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

    // ✅ PostgreSQL SELECT with dynamic WHERE clause
    let query = `
      SELECT *
      FROM job_applications
      WHERE candidate_id = $1
    `;

    const values = [candidateId];

    if (recruiterId) {
      query += ` AND recruiter_id = $2`;
      values.push(recruiterId);
    }

    query += ` ORDER BY applied_date DESC`;

    const result = await pool.query(query, values);

    const jobs = result.rows;

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

    const updates = { ...req.body };

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
    }

    // ✅ PostgreSQL UPDATE with dynamic fields
    // Build the SET clause dynamically based on what's provided
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.company !== undefined) {
      setFields.push(`company = $${paramIndex}`);
      values.push(updates.company);
      paramIndex++;
    }

    if (updates.companyName !== undefined) {
      setFields.push(`company_name = $${paramIndex}`);
      values.push(updates.companyName);
      paramIndex++;
    }

    if (updates.jobTitle !== undefined) {
      setFields.push(`job_title = $${paramIndex}`);
      values.push(updates.jobTitle);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      setFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.jobLink !== undefined) {
      setFields.push(`job_link = $${paramIndex}`);
      values.push(updates.jobLink);
      paramIndex++;
    }

    if (updates.resumeDocxUrl !== undefined) {
      setFields.push(`resume_docx_url = $${paramIndex}`);
      values.push(updates.resumeDocxUrl);
      paramIndex++;
    }

    if (updates.resumeStatus !== undefined) {
      setFields.push(`resume_status = $${paramIndex}`);
      values.push(updates.resumeStatus);
      paramIndex++;
    }

    if (updates.matchScore !== undefined) {
      setFields.push(`match_score = $${paramIndex}`);
      values.push(updates.matchScore);
      paramIndex++;
    }

    if (updates.salaryRange !== undefined) {
      setFields.push(`salary_range = $${paramIndex}`);
      values.push(updates.salaryRange);
      paramIndex++;
    }

    if (updates.jobDescriptionFull !== undefined) {
      setFields.push(`job_description_full = $${paramIndex}`);
      values.push(updates.jobDescriptionFull);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    setFields.push(`updated_at = NOW()`);

    if (setFields.length === 1) {
      // Only updated_at was added (no actual updates)
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Add the ID as the last parameter
    values.push(id);

    const query = `
      UPDATE job_applications
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const job = result.rows[0];

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
// ✅ Simplified update for resume attachment (convenience method)
// ============================================================
exports.attachResumeToApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { resumeDocxUrl, resumeFileName } = req.body;

    if (!resumeDocxUrl) {
      return res.status(400).json({ message: "resumeDocxUrl is required" });
    }

    const result = await pool.query(
      `
      UPDATE job_applications
      SET 
        resume_docx_url = $1,
        resume_status = 'Submitted',
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [resumeDocxUrl, id]
    );

    const job = result.rows[0];

    if (!job) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("❌ attachResumeToApplication error:", err);
    return res
      .status(500)
      .json({ message: "Server error attaching resume" });
  }
};

// ============================================================
// ✅ Delete job by id
// ============================================================
exports.deleteJobApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ PostgreSQL DELETE
    const result = await pool.query(
      `DELETE FROM job_applications WHERE id = $1 RETURNING *`,
      [id]
    );

    const job = result.rows[0];

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

// ============================================================
// ✅ Get job application by ID
// ============================================================
exports.getJobApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM job_applications WHERE id = $1`,
      [id]
    );

    const job = result.rows[0];

    if (!job) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("❌ getJobApplicationById error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching job application" });
  }
};

// ============================================================
// ✅ Get all jobs for a recruiter
// ============================================================
exports.getJobsByRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const result = await pool.query(
      `
      SELECT ja.*, c.full_name as candidate_name, c.email as candidate_email
      FROM job_applications ja
      LEFT JOIN candidates c ON ja.candidate_id = c.id
      WHERE ja.recruiter_id = $1
      ORDER BY ja.applied_date DESC
      `,
      [recruiterId]
    );

    return res.status(200).json({ success: true, jobs: result.rows });
  } catch (err) {
    console.error("❌ getJobsByRecruiter error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching job applications" });
  }
};

// ============================================================
// ✅ Update job status
// ============================================================
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const normalizedStatus = status.toString().toLowerCase().trim();

    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ 
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` 
      });
    }

    const result = await pool.query(
      `
      UPDATE job_applications
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [normalizedStatus, id]
    );

    const job = result.rows[0];

    if (!job) {
      return res.status(404).json({ message: "Job application not found" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    console.error("❌ updateJobStatus error:", err);
    return res
      .status(500)
      .json({ message: "Server error updating job status" });
  }
};