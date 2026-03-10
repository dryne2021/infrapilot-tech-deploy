// server/models/Candidate.js

const pool = require("../config/db");

/* =========================================================
   CREATE CANDIDATE PROFILE
========================================================= */
async function createCandidate(data) {
  const result = await pool.query(
    `INSERT INTO candidates (
        user_id,
        full_name,
        email,
        phone,
        location,
        target_role,
        summary,
        skills,
        experience_level,
        subscription_plan,
        subscription_status,
        payment_status
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.userId,
      data.fullName,
      data.email?.toLowerCase(),
      data.phone,
      data.location,
      data.targetRole,
      data.summary,
      data.skills,
      data.experienceLevel || "entry",
      data.subscriptionPlan || "free",
      data.subscriptionStatus || "inactive",
      data.paymentStatus || "none",
    ]
  );

  return result.rows[0];
}

/* =========================================================
   GET CANDIDATE BY USER ID
========================================================= */
async function findCandidateByUserId(userId) {
  const result = await pool.query(
    `SELECT * FROM candidates WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

/* =========================================================
   GET CANDIDATE PROFILE
========================================================= */
async function getCandidateProfile(candidateId) {
  const candidate = await pool.query(
    `SELECT * FROM candidates WHERE id = $1`,
    [candidateId]
  );

  const education = await pool.query(
    `SELECT * FROM candidate_education WHERE candidate_id = $1`,
    [candidateId]
  );

  const experience = await pool.query(
    `SELECT * FROM candidate_experience WHERE candidate_id = $1`,
    [candidateId]
  );

  const resumes = await pool.query(
    `SELECT * FROM candidate_resumes WHERE candidate_id = $1`,
    [candidateId]
  );

  return {
    ...candidate.rows[0],
    education: education.rows,
    experience: experience.rows,
    resumes: resumes.rows,
  };
}

/* =========================================================
   ADD EDUCATION
========================================================= */
async function addEducation(candidateId, edu) {
  const result = await pool.query(
    `INSERT INTO candidate_education
    (candidate_id, school, degree, field, start_year, end_year)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [
      candidateId,
      edu.school,
      edu.degree,
      edu.field,
      edu.startYear,
      edu.endYear,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   ADD EXPERIENCE
========================================================= */
async function addExperience(candidateId, exp) {
  const result = await pool.query(
    `INSERT INTO candidate_experience
    (candidate_id, company, title, start_date, end_date, location)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [
      candidateId,
      exp.company,
      exp.title,
      exp.startDate,
      exp.endDate,
      exp.location,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   ADD EXPERIENCE BULLET
========================================================= */
async function addExperienceBullet(experienceId, bullet) {
  const result = await pool.query(
    `INSERT INTO experience_bullets
     (experience_id, bullet)
     VALUES ($1,$2)
     RETURNING *`,
    [experienceId, bullet]
  );

  return result.rows[0];
}

/* =========================================================
   ADD RESUME
========================================================= */
async function addResume(candidateId, resume) {
  const result = await pool.query(
    `INSERT INTO candidate_resumes
    (candidate_id, file_name, file_url, is_active)
    VALUES ($1,$2,$3,$4)
    RETURNING *`,
    [
      candidateId,
      resume.fileName,
      resume.fileUrl,
      resume.isActive ?? true,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   ASSIGN RECRUITER
========================================================= */
async function assignRecruiter(candidateId, recruiterId) {
  const result = await pool.query(
    `UPDATE candidates
     SET assigned_recruiter_id = $1,
         assigned_date = NOW()
     WHERE id = $2
     RETURNING *`,
    [recruiterId, candidateId]
  );

  return result.rows[0];
}

/* =========================================================
   UPDATE CANDIDATE PROFILE
========================================================= */
async function updateCandidate(candidateId, data) {
  const result = await pool.query(
    `UPDATE candidates
     SET full_name=$1,
         phone=$2,
         location=$3,
         target_role=$4,
         summary=$5
     WHERE id=$6
     RETURNING *`,
    [
      data.fullName,
      data.phone,
      data.location,
      data.targetRole,
      data.summary,
      candidateId,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   GET ALL CANDIDATES
========================================================= */
async function getAllCandidates() {
  const result = await pool.query(
    `SELECT *
     FROM candidates
     ORDER BY created_at DESC`
  );

  return result.rows;
}

/* =========================================================
   EXPORT
========================================================= */
module.exports = {
  createCandidate,
  findCandidateByUserId,
  getCandidateProfile,
  addEducation,
  addExperience,
  addExperienceBullet,
  addResume,
  assignRecruiter,
  updateCandidate,
  getAllCandidates,
};