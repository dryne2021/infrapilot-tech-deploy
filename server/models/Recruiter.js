// server/models/Recruiter.js

const pool = require("../config/db");

/* =========================================================
CREATE RECRUITER PROFILE
========================================================= */
async function createRecruiter(data) {
  const result = await pool.query(
    `INSERT INTO recruiters
     (
       user_id,
       name,
       email,
       phone,
       department,
       specialization,
       status,
       max_candidates,
       bio,
       experience
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      data.userId,
      data.name,
      data.email?.toLowerCase(),
      data.phone || "",
      data.department || "Recruitment",
      data.specialization || "General",
      data.status || "active",
      data.maxCandidates || 10,
      data.bio || "",
      data.experience || "",
    ]
  );

  return result.rows[0];
}

/* =========================================================
GET RECRUITER BY USER ID
========================================================= */
async function findRecruiterByUserId(userId) {
  const result = await pool.query(
    `SELECT * FROM recruiters
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

/* =========================================================
GET RECRUITER BY ID
========================================================= */
async function getRecruiterById(id) {
  const result = await pool.query(
    `SELECT * FROM recruiters
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

/* =========================================================
GET ALL RECRUITERS (ADMIN VIEW)
========================================================= */
async function getAllRecruiters() {
  const result = await pool.query(
    `SELECT *
     FROM recruiters
     ORDER BY created_at DESC`
  );

  return result.rows;
}

/* =========================================================
UPDATE RECRUITER PROFILE
========================================================= */
async function updateRecruiter(id, data) {
  const result = await pool.query(
    `UPDATE recruiters
     SET name=$1,
         phone=$2,
         department=$3,
         specialization=$4,
         status=$5,
         max_candidates=$6,
         bio=$7,
         experience=$8,
         updated_at = NOW()
     WHERE id=$9
     RETURNING *`,
    [
      data.name,
      data.phone,
      data.department,
      data.specialization,
      data.status,
      data.maxCandidates,
      data.bio,
      data.experience,
      id,
    ]
  );

  return result.rows[0];
}

/* =========================================================
DELETE RECRUITER
========================================================= */
async function deleteRecruiter(id) {
  await pool.query(
    `DELETE FROM recruiters
     WHERE id = $1`,
    [id]
  );

  return true;
}

/* =========================================================
GET CANDIDATES ASSIGNED TO RECRUITER
========================================================= */
async function getAssignedCandidates(recruiterId) {
  const result = await pool.query(
    `SELECT *
     FROM candidates
     WHERE assigned_recruiter_id = $1
     ORDER BY created_at DESC`,
    [recruiterId]
  );

  return result.rows;
}

/* =========================================================
ASSIGN CANDIDATE TO RECRUITER
========================================================= */
async function assignCandidate(recruiterId, candidateId) {
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
EXPORT
========================================================= */
module.exports = {
  createRecruiter,
  findRecruiterByUserId,
  getRecruiterById,
  getAllRecruiters,
  updateRecruiter,
  deleteRecruiter,
  getAssignedCandidates,
  assignCandidate,
};