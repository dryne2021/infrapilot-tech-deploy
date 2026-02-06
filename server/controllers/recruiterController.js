const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const JobApplication = require('../models/JobApplication');
const User = require('../models/User');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get assigned candidates
// @route   GET /api/v1/recruiter/candidates
// @access  Private/Recruiter
exports.getCandidates = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user.id })
      .populate({
        path: 'assignedCandidates',
        populate: {
          path: 'userId',
          select: 'name email status'
        }
      });

    if (!recruiter) {
      return next(new ErrorResponse('Recruiter profile not found', 404));
    }

    res.status(200).json({
      success: true,
      count: recruiter.assignedCandidates.length,
      data: recruiter.assignedCandidates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single candidate
// @route   GET /api/v1/recruiter/candidates/:id
// @access  Private/Recruiter
exports.getCandidate = async (req, res, next) => {
  try {
    // First check if recruiter has access to this candidate
    const recruiter = await Recruiter.findOne({ userId: req.user.id });

    if (!recruiter) {
      return next(new ErrorResponse('Recruiter profile not found', 404));
    }

    const candidate = await Candidate.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedRecruiterId', 'name email');

    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    // Check if candidate is assigned to this recruiter
    if (!recruiter.assignedCandidates.includes(candidate._id)) {
      return next(new ErrorResponse('Not authorized to access this candidate', 403));
    }

    // Get candidate's job applications
    const applications = await JobApplication.find({ candidateId: candidate._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        candidate,
        applications
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create job application for candidate
// @route   POST /api/v1/recruiter/applications
// @access  Private/Recruiter
exports.createApplication = async (req, res, next) => {
  try {
    const { candidateId, jobTitle, companyName, jobLink, resumeUsed, notes } = req.body;

    // Check if candidate exists and is assigned to this recruiter
    const recruiter = await Recruiter.findOne({ userId: req.user.id });
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    if (!recruiter.assignedCandidates.includes(candidateId)) {
      return next(new ErrorResponse('Not authorized to create application for this candidate', 403));
    }

    // Create job application
    const application = await JobApplication.create({
      candidateId,
      recruiterId: req.user.id,
      jobTitle,
      companyName,
      jobLink,
      resumeUsed: resumeUsed || candidate.resumes.find(r => r.isActive),
      notes: notes ? [{ content: notes, addedBy: req.user.id }] : []
    });

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all job applications
// @route   GET /api/v1/recruiter/applications
// @access  Private/Recruiter
exports.getApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, candidateId } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const startIndex = (pageInt - 1) * limitInt;

    // Build query
    const query = { recruiterId: req.user.id };
    if (status) query.status = status;
    if (candidateId) query.candidateId = candidateId;

    const total = await JobApplication.countDocuments(query);
    
    const applications = await JobApplication.find(query)
      .populate({
        path: 'candidateId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
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
// @route   GET /api/v1/recruiter/applications/:id
// @access  Private/Recruiter
exports.getApplication = async (req, res, next) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    }).populate({
      path: 'candidateId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
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

// @desc    Update job application status
// @route   PUT /api/v1/recruiter/applications/:id/status
// @access  Private/Recruiter
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'applied', 'interview', 'rejected', 'offer'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    const application = await JobApplication.findOneAndUpdate(
      {
        _id: req.params.id,
        recruiterId: req.user.id
      },
      { 
        status,
        ...(status === 'applied' ? { appliedAt: new Date() } : {})
      },
      {
        new: true,
        runValidators: true
      }
    );

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

// @desc    Add note to job application
// @route   POST /api/v1/recruiter/applications/:id/notes
// @access  Private/Recruiter
exports.addApplicationNote = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return next(new ErrorResponse('Please provide note content', 400));
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    });

    if (!application) {
      return next(new ErrorResponse('Application not found', 404));
    }

    // Add new note
    application.notes.push({
      content,
      addedBy: req.user.id
    });

    await application.save();

    res.status(200).json({
      success: true,
      data: application.notes[application.notes.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter dashboard stats
// @route   GET /api/v1/recruiter/dashboard
// @access  Private/Recruiter
exports.getDashboardStats = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user.id });

    if (!recruiter) {
      return next(new ErrorResponse('Recruiter profile not found', 404));
    }

    const [
      totalCandidates,
      totalApplications,
      pendingApplications,
      appliedApplications,
      interviewApplications,
      rejectedApplications,
      offerApplications
    ] = await Promise.all([
      Candidate.countDocuments({ _id: { $in: recruiter.assignedCandidates } }),
      JobApplication.countDocuments({ recruiterId: req.user.id }),
      JobApplication.countDocuments({ recruiterId: req.user.id, status: 'pending' }),
      JobApplication.countDocuments({ recruiterId: req.user.id, status: 'applied' }),
      JobApplication.countDocuments({ recruiterId: req.user.id, status: 'interview' }),
      JobApplication.countDocuments({ recruiterId: req.user.id, status: 'rejected' }),
      JobApplication.countDocuments({ recruiterId: req.user.id, status: 'offer' })
    ]);

    // Calculate success rate
    const successRate = appliedApplications > 0 
      ? (offerApplications / appliedApplications * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        totalApplications,
        applicationsByStatus: {
          pending: pendingApplications,
          applied: appliedApplications,
          interview: interviewApplications,
          rejected: rejectedApplications,
          offer: offerApplications
        },
        successRate: parseFloat(successRate)
      }
    });
  } catch (error) {
    next(error);
  }
};