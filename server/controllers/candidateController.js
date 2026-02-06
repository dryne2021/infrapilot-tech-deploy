const Candidate = require('../models/Candidate');
const JobApplication = require('../models/JobApplication');
const ErrorResponse = require('../utils/ErrorResponse');
const { upload, getFileUrl, deleteFile } = require('../utils/fileUpload');
const path = require('path');
const fs = require('fs');

// @desc    Get candidate profile
// @route   GET /api/v1/candidate/profile
// @access  Private/Candidate
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

// @desc    Update candidate profile
// @route   PUT /api/v1/candidate/profile
// @access  Private/Candidate
exports.updateProfile = async (req, res, next) => {
  try {
    const { skills, experience } = req.body;

    const candidate = await Candidate.findOneAndUpdate(
      { userId: req.user.id },
      { 
        skills: skills ? JSON.parse(skills) : undefined,
        experience
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('assignedRecruiterId', 'name email');

    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload resume
// @route   POST /api/v1/candidate/resumes
// @access  Private/Candidate
exports.uploadResume = async (req, res, next) => {
  try {
    // Use multer upload middleware
    const uploadSingle = upload.single('resume');
    
    uploadSingle(req, res, async function(err) {
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

      // Add new resume to candidate's resumes array
      const newResume = {
        fileName: req.file.originalname,
        fileUrl: getFileUrl(req, req.file.filename),
        uploadedAt: new Date()
      };

      // Set all other resumes as inactive
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

// @desc    Get all resumes
// @route   GET /api/v1/candidate/resumes
// @access  Private/Candidate
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

// @desc    Delete resume
// @route   DELETE /api/v1/candidate/resumes/:resumeId
// @access  Private/Candidate
exports.deleteResume = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    // Find the resume to delete
    const resumeIndex = candidate.resumes.findIndex(
      resume => resume._id.toString() === req.params.resumeId
    );

    if (resumeIndex === -1) {
      return next(new ErrorResponse('Resume not found', 404));
    }

    const resumeToDelete = candidate.resumes[resumeIndex];

    // Extract filename from URL to delete physical file
    const filename = path.basename(resumeToDelete.fileUrl);
    const filePath = path.join(
      process.env.UPLOAD_PATH || './uploads',
      'resumes',
      req.user.id,
      filename
    );

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove resume from array
    candidate.resumes.splice(resumeIndex, 1);

    // If we deleted the active resume and there are other resumes, activate the most recent one
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

// @desc    Set active resume
// @route   PUT /api/v1/candidate/resumes/:resumeId/set-active
// @access  Private/Candidate
exports.setActiveResume = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    // Set all resumes as inactive
    candidate.resumes.forEach(resume => {
      resume.isActive = false;
    });

    // Find and set the specified resume as active
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

// @desc    Get job applications
// @route   GET /api/v1/candidate/applications
// @access  Private/Candidate
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

    // Build query
    const query = { candidateId: candidate._id };
    if (status) query.status = status;

    const total = await JobApplication.countDocuments(query);
    
    const applications = await JobApplication.find(query)
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitInt);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job application
// @route   GET /api/v1/candidate/applications/:id
// @access  Private/Candidate
exports.getApplication = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user.id });

    if (!candidate) {
      return next(new ErrorResponse('Candidate profile not found', 404));
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      candidateId: candidate._id
    }).populate('recruiterId', 'name email');

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