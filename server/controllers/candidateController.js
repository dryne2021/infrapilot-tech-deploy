const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");
const { upload, getFileUrl } = require("../utils/fileUpload");
const path = require("path");
const fs = require("fs");


// ======================================================
// GET CANDIDATE PROFILE
// ======================================================
exports.getProfile = async (req, res, next) => {
  try {

    const result = await pool.query(
      `SELECT * FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// UPDATE CANDIDATE PROFILE
// ======================================================
exports.updateProfile = async (req, res, next) => {
  try {

    const { skills, workHistory, experience } = req.body;

    const parsedSkills =
      skills !== undefined
        ? (typeof skills === "string" ? JSON.parse(skills) : skills)
        : undefined;

    const incomingWorkHistory = workHistory ?? experience;

    const parsedWorkHistory =
      incomingWorkHistory !== undefined
        ? typeof incomingWorkHistory === "string"
          ? JSON.parse(incomingWorkHistory)
          : incomingWorkHistory
        : undefined;

    const updates = [];
    const values = [];
    let index = 1;

    if (parsedSkills !== undefined) {
      updates.push(`skills = $${index++}`);
      values.push(JSON.stringify(parsedSkills));
    }

    if (parsedWorkHistory !== undefined) {
      updates.push(`work_history = $${index++}`);
      values.push(JSON.stringify(parsedWorkHistory));
    }

    if (updates.length === 0) {
      return next(new ErrorResponse("Nothing to update", 400));
    }

    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE candidates 
       SET ${updates.join(",")}
       WHERE user_id = $${values.length}
       RETURNING *`,
      values
    );

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// UPLOAD RESUME
// ======================================================
exports.uploadResume = async (req, res, next) => {
  try {

    const uploadSingle = upload.single("resume");

    uploadSingle(req, res, async function (err) {

      if (err) {
        return next(new ErrorResponse(err.message, 400));
      }

      if (!req.file) {
        return next(new ErrorResponse("Please upload a file", 400));
      }

      const candidate = await pool.query(
        `SELECT * FROM candidates WHERE user_id = $1`,
        [req.user.id]
      );

      if (candidate.rows.length === 0) {
        return next(new ErrorResponse("Candidate profile not found", 404));
      }

      const newResume = {
        fileName: req.file.originalname,
        fileUrl: getFileUrl(req, req.file.filename),
        uploadedAt: new Date(),
        isActive: true
      };

      await pool.query(
        `INSERT INTO resumes 
        (candidate_id, file_name, file_url, uploaded_at, is_active)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          candidate.rows[0].id,
          newResume.fileName,
          newResume.fileUrl,
          newResume.uploadedAt,
          true
        ]
      );

      res.status(200).json({
        success: true,
        data: newResume
      });

    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET ALL RESUMES
// ======================================================
exports.getResumes = async (req, res, next) => {
  try {

    const candidate = await pool.query(
      `SELECT id FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    const resumes = await pool.query(
      `SELECT * FROM resumes WHERE candidate_id = $1 ORDER BY uploaded_at DESC`,
      [candidate.rows[0].id]
    );

    res.status(200).json({
      success: true,
      count: resumes.rows.length,
      data: resumes.rows
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// DELETE RESUME
// ======================================================
exports.deleteResume = async (req, res, next) => {
  try {

    const candidate = await pool.query(
      `SELECT id FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    const resume = await pool.query(
      `SELECT * FROM resumes WHERE id = $1`,
      [req.params.resumeId]
    );

    if (resume.rows.length === 0) {
      return next(new ErrorResponse("Resume not found", 404));
    }

    const filename = path.basename(resume.rows[0].file_url);

    const filePath = path.join(
      process.env.UPLOAD_PATH || "./uploads",
      "resumes",
      req.user.id,
      filename
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query(
      `DELETE FROM resumes WHERE id = $1`,
      [req.params.resumeId]
    );

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// SET ACTIVE RESUME
// ======================================================
exports.setActiveResume = async (req, res, next) => {
  try {

    const candidate = await pool.query(
      `SELECT id FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    await pool.query(
      `UPDATE resumes SET is_active = false WHERE candidate_id = $1`,
      [candidate.rows[0].id]
    );

    const resume = await pool.query(
      `UPDATE resumes
       SET is_active = true
       WHERE id = $1
       RETURNING *`,
      [req.params.resumeId]
    );

    if (resume.rows.length === 0) {
      return next(new ErrorResponse("Resume not found", 404));
    }

    res.status(200).json({
      success: true,
      data: resume.rows[0]
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET JOB APPLICATIONS
// ======================================================
exports.getApplications = async (req, res, next) => {
  try {

    const candidate = await pool.query(
      `SELECT id FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const apps = await pool.query(
      `SELECT * FROM job_applications
       WHERE candidate_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [candidate.rows[0].id, limit, offset]
    );

    res.status(200).json({
      success: true,
      count: apps.rows.length,
      data: apps.rows
    });

  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET SINGLE APPLICATION
// ======================================================
exports.getApplication = async (req, res, next) => {
  try {

    const candidate = await pool.query(
      `SELECT id FROM candidates WHERE user_id = $1`,
      [req.user.id]
    );

    if (candidate.rows.length === 0) {
      return next(new ErrorResponse("Candidate profile not found", 404));
    }

    const application = await pool.query(
      `SELECT * FROM job_applications
       WHERE id = $1 AND candidate_id = $2`,
      [req.params.id, candidate.rows[0].id]
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