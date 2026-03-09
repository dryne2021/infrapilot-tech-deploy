const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");

// -----------------------------
// Helper: ensure recruiter exists
// -----------------------------
async function getRecruiterOrThrow(userId, next) {

  const result = await pool.query(
    `SELECT * FROM recruiters WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    next(new ErrorResponse("Recruiter profile not found", 404));
    return null;
  }

  return result.rows[0];
}

// -----------------------------
// Helper: ensure candidate assigned
// -----------------------------
function ensureCandidateAssigned(recruiter, candidate, next) {

  if (!candidate.assigned_recruiter_id ||
      String(candidate.assigned_recruiter_id) !== String(recruiter.id)) {

    next(new ErrorResponse("Not authorized for this candidate", 403));
    return false;
  }

  return true;
}


// ======================================================
// GET ASSIGNED CANDIDATES
// ======================================================
exports.getCandidates = async (req, res, next) => {

  try {

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const candidates = await pool.query(
      `SELECT c.*, u.name, u.email
       FROM candidates c
       JOIN users u ON u.id = c.user_id
       WHERE c.assigned_recruiter_id = $1
       ORDER BY c.created_at DESC`,
      [recruiter.id]
    );

    res.status(200).json(candidates.rows);

  } catch (error) {
    next(error);
  }

};


// ======================================================
// GET SINGLE CANDIDATE
// ======================================================
exports.getCandidate = async (req, res, next) => {

  try {

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const candidate = await pool.query(
      `SELECT c.*, u.name, u.email
       FROM candidates c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate not found", 404));
    }

    const ok = ensureCandidateAssigned(recruiter, candidate.rows[0], next);
    if (!ok) return;

    const applications = await pool.query(
      `SELECT * FROM job_applications
       WHERE candidate_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        candidate: candidate.rows[0],
        applications: applications.rows
      }
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// UPDATE CANDIDATE STATUS
// ======================================================
exports.updateCandidateStatus = async (req, res, next) => {

  try {

    const { status } = req.body;

    const allowed = [
      "new",
      "contacted",
      "screening",
      "interview",
      "shortlisted",
      "rejected",
      "hired"
    ];

    if (!allowed.includes(status)) {
      return next(new ErrorResponse("Invalid recruiter status", 400));
    }

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const candidate = await pool.query(
      `SELECT * FROM candidates WHERE id = $1`,
      [req.params.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate not found", 404));
    }

    const ok = ensureCandidateAssigned(recruiter, candidate.rows[0], next);
    if (!ok) return;

    await pool.query(
      `UPDATE candidates
       SET recruiter_status = $1
       WHERE id = $2`,
      [status, req.params.id]
    );

    res.status(200).json({
      success: true,
      data: {
        candidateId: req.params.id,
        recruiterStatus: status
      }
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// CREATE JOB APPLICATION
// ======================================================
exports.createApplication = async (req, res, next) => {

  try {

    const {
      candidateId,
      jobTitle,
      companyName,
      jobLink,
      jobDescription,
      notes
    } = req.body;

    if (!candidateId || !jobTitle || !companyName) {
      return next(
        new ErrorResponse(
          "candidateId, jobTitle and companyName are required",
          400
        )
      );
    }

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await pool.query(
      `INSERT INTO job_applications
       (candidate_id, recruiter_id, job_title, company, job_link, job_description)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        candidateId,
        recruiter.id,
        jobTitle,
        companyName,
        jobLink || null,
        jobDescription || null
      ]
    );

    res.status(201).json({
      success: true,
      data: application.rows[0]
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// GET ALL JOB APPLICATIONS
// ======================================================
exports.getApplications = async (req, res, next) => {

  try {

    const { page = 1, limit = 10 } = req.query;

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const offset = (page - 1) * limit;

    const applications = await pool.query(
      `SELECT *
       FROM job_applications
       WHERE recruiter_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [recruiter.id, limit, offset]
    );

    res.status(200).json({
      success: true,
      count: applications.rows.length,
      data: applications.rows
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// GET SINGLE JOB APPLICATION
// ======================================================
exports.getApplication = async (req, res, next) => {

  try {

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await pool.query(
      `SELECT *
       FROM job_applications
       WHERE id = $1 AND recruiter_id = $2`,
      [req.params.id, recruiter.id]
    );

    if (application.rows.length === 0) {
      return next(new ErrorResponse("Application not found", 404));
    }

    res.status(200).json({
      success: true,
      data: application.rows[0]
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// UPDATE APPLICATION STATUS
// ======================================================
exports.updateApplicationStatus = async (req, res, next) => {

  try {

    const { status } = req.body;

    const allowed = [
      "pending",
      "applied",
      "interview",
      "rejected",
      "offer"
    ];

    if (!allowed.includes(status)) {
      return next(new ErrorResponse("Invalid status", 400));
    }

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await pool.query(
      `UPDATE job_applications
       SET status = $1
       WHERE id = $2 AND recruiter_id = $3
       RETURNING *`,
      [status, req.params.id, recruiter.id]
    );

    if (application.rows.length === 0) {
      return next(new ErrorResponse("Application not found", 404));
    }

    res.status(200).json({
      success: true,
      data: application.rows[0]
    });

  } catch (error) {
    next(error);
  }

};


// ======================================================
// DASHBOARD STATS
// ======================================================
exports.getDashboardStats = async (req, res, next) => {

  try {

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const totalCandidates = await pool.query(
      `SELECT COUNT(*) FROM candidates WHERE assigned_recruiter_id = $1`,
      [recruiter.id]
    );

    const totalApplications = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id = $1`,
      [recruiter.id]
    );

    const pending = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id=$1 AND status='pending'`,
      [recruiter.id]
    );

    const applied = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id=$1 AND status='applied'`,
      [recruiter.id]
    );

    const interview = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id=$1 AND status='interview'`,
      [recruiter.id]
    );

    const rejected = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id=$1 AND status='rejected'`,
      [recruiter.id]
    );

    const offer = await pool.query(
      `SELECT COUNT(*) FROM job_applications WHERE recruiter_id=$1 AND status='offer'`,
      [recruiter.id]
    );

    res.status(200).json({
      success: true,
      data: {
        totalCandidates: Number(totalCandidates.rows[0].count),
        totalApplications: Number(totalApplications.rows[0].count),
        applicationsByStatus: {
          pending: Number(pending.rows[0].count),
          applied: Number(applied.rows[0].count),
          interview: Number(interview.rows[0].count),
          rejected: Number(rejected.rows[0].count),
          offer: Number(offer.rows[0].count)
        }
      }
    });

  } catch (error) {
    next(error);
  }

};