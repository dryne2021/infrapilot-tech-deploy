const Candidate = require('../models/Candidate');
const JobApplication = require('../models/JobApplication');
const ErrorResponse = require('../utils/ErrorResponse');
const { upload, getFileUrl } = require('../utils/fileUpload');
const path = require('path');
const fs = require('fs');


// ======================================================
// GET CANDIDATE PROFILE
// ======================================================
exports.getProfile = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user.id })
      .populate('assignedRecruiterId', 'name email');

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    res.status(200).json({
      success: true,
      data: candidate
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
        ? (typeof skills === 'string' ? JSON.parse(skills) : skills)
        : undefined;

    const incomingWorkHistory = workHistory ?? experience;

    const parsedWorkHistory =
      incomingWorkHistory !== undefined
        ? (typeof incomingWorkHistory === 'string'
            ? JSON.parse(incomingWorkHistory)
            : incomingWorkHistory)
        : undefined;

    const update = {};
    if (parsedSkills !== undefined) update.skills = parsedSkills;
    if (parsedWorkHistory !== undefined) update.workHistory = parsedWorkHistory;

    const candidate = await Candidate.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { new: true, runValidators: true }
    ).populate('assignedRecruiterId', 'name email');

    res.status(200).json({
      success: true,
      data: candidate
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
    const uploadSingle = upload.single('resume');

    uploadSingle(req, res, async function (err) {
      if (err) {
        return next(new ErrorResponse(err.message, 400));
      }

      if (!req.file) {
        return next(new ErrorResponse('Please upload a file', 400));
      }

      const candidate = await Candidate.findOne({ userId: req.user.id });

      if (!candidate) {
        return next(new ErrorResponse('Candidate profile not found', 404));
      }

      const newResume = {
        fileName: req.file.originalname,
        fileUrl: getFileUrl(req, req.file.filename),
        uploadedAt: new Date(),
        isActive: true
      };

      candidate.resumes.forEach(resume => {
        resume.isActive = false;
      });

      candidate.resumes.push(newResume);
      await candidate.save();

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
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    res.status(200).json({
      success: true,
      count: candidate.resumes.length,
      data: candidate.resumes
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
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    const resumeIndex = candidate.resumes.findIndex(
      resume => resume._id.toString() === req.params.resumeId
    );

    if (resumeIndex === -1) {
      return next(new ErrorResponse('Resume not found', 404));
    }

    const resumeToDelete = candidate.resumes[resumeIndex];

    const filename = path.basename(resumeToDelete.fileUrl);
    const filePath = path.join(
      process.env.UPLOAD_PATH || './uploads',
      'resumes',
      req.user.id,
      filename
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    candidate.resumes.splice(resumeIndex, 1);

    if (resumeToDelete.isActive && candidate.resumes.length > 0) {
      candidate.resumes[candidate.resumes.length - 1].isActive = true;
    }

    await candidate.save();

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
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    candidate.resumes.forEach(resume => {
      resume.isActive = false;
    });

    const resume = candidate.resumes.find(
      r => r._id.toString() === req.params.resumeId
    );

    if (!resume) {
      return next(new ErrorResponse('Resume not found', 404));
    }

    resume.isActive = true;
    await candidate.save();

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// 🔥 UPDATED: GET JOB APPLICATIONS (CLEAN RESPONSE)
// ======================================================
exports.getApplications = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    const { page = 1, limit = 10, status } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const startIndex = (pageInt - 1) * limitInt;

    const query = { candidateId: candidate._id };
    if (status) query.status = status;

    const total = await JobApplication.countDocuments(query);

    const applications = await JobApplication.find(query)
      .select(
        'jobId jobTitle companyName jobDescription resumeUsed resumeDocxUrl status appliedDate'
      )
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitInt);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: applications.map(app => ({
        _id: app._id,
        jobId: app.jobId,
        jobTitle: app.jobTitle,
        companyName: app.companyName,
        jobDescription: app.jobDescription,
        status: app.status,
        appliedDate: app.appliedDate,
        resumeUrl:
          app.resumeUsed?.fileUrl ||
          app.resumeDocxUrl ||
          null
      }))
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
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      candidateId: candidate._id
    });

    if (!application) {
      return next(new ErrorResponse('Application not found', 404));
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};
