// server/models/JobApplication.js

const pool = require("../config/db");

/* =========================================================
CREATE JOB APPLICATION
========================================================= */
async function createJobApplication(data) {
  const result = await pool.query(
    `INSERT INTO job_applications
    (
      candidate_id,
      recruiter_id,
      job_title,
      company_name,
      description,
      job_link,
      status,
      match_score,
      salary_range
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      data.candidateId,
      data.recruiterId,
      data.jobTitle,
      data.companyName,
      data.description || "",
      data.jobLink || "",
      data.status || "pending",
      data.matchScore || 0,
      data.salaryRange || "",
    ]
  );

  return result.rows[0];
}

/* =========================================================
GET JOB APPLICATION BY ID
========================================================= */
async function getJobApplicationById(id) {
  const result = await pool.query(
    `SELECT * FROM job_applications
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

/* =========================================================
GET JOBS FOR CANDIDATE
========================================================= */
async function getCandidateJobs(candidateId) {
  const result = await pool.query(
    `SELECT *
     FROM job_applications
     WHERE candidate_id = $1
     ORDER BY created_at DESC`,
    [candidateId]
  );

  return result.rows;
}

/* =========================================================
GET JOBS FOR RECRUITER
========================================================= */
async function getRecruiterJobs(recruiterId) {
  const result = await pool.query(
    `SELECT *
     FROM job_applications
     WHERE recruiter_id = $1
     ORDER BY created_at DESC`,
    [recruiterId]
  );

  return result.rows;
}

/* =========================================================
UPDATE JOB STATUS
========================================================= */
async function updateJobStatus(jobId, status) {
  const result = await pool.query(
    `UPDATE job_applications
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, jobId]
  );

  return result.rows[0];
}

/* =========================================================
UPDATE JOB APPLICATION
========================================================= */
async function updateJobApplication(jobId, data) {
  const result = await pool.query(
    `UPDATE job_applications
     SET job_title = $1,
         company_name = $2,
         description = $3,
         job_link = $4,
         salary_range = $5,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      data.jobTitle,
      data.companyName,
      data.description,
      data.jobLink,
      data.salaryRange,
      jobId,
    ]
  );

  return result.rows[0];
}

/* =========================================================
DELETE JOB APPLICATION
========================================================= */
async function deleteJobApplication(jobId) {
  await pool.query(
    `DELETE FROM job_applications
     WHERE id = $1`,
    [jobId]
  );

  return true;
}

/* =========================================================
EXPORT
========================================================= */
module.exports = {
  createJobApplication,
  getJobApplicationById,
  getCandidateJobs,
  getRecruiterJobs,
  updateJobStatus,
  updateJobApplication,
  deleteJobApplication,
};