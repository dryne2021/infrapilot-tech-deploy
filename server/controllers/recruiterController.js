const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const JobApplication = require('../models/JobApplication');
const ErrorResponse = require('../utils/ErrorResponse');

// -----------------------------
// Helper: ensure recruiter exists
// -----------------------------
async function getRecruiterOrThrow(userId, next) {
  const recruiter = await Recruiter.findOne({ userId }).lean();
  if (!recruiter) {
    next(new ErrorResponse('Recruiter profile not found', 404));
    return null;
  }
  return recruiter;
}

// -----------------------------
// Helper: ensure candidate assigned (DB truth = Candidate.assignedRecruiterId)
// -----------------------------
function ensureCandidateAssigned(recruiter, candidate, next) {
  const assignedRecruiterId = candidate?.assignedRecruiterId;

  if (!assignedRecruiterId || String(assignedRecruiterId) !== String(recruiter._id)) {
    next(new ErrorResponse('Not authorized for this candidate', 403));
    return false;
  }
  return true;
}

// @desc    Get assigned candidates
// @route   GET /api/v1/recruiter/candidates
// @access  Private/Recruiter
exports.getCandidates = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user.id }).lean();
    if (!recruiter) {
      return next(new ErrorResponse('Recruiter profile not found', 404));
    }

    // ✅ DB truth: admin assigns by setting Candidate.assignedRecruiterId = recruiter._id
    const candidates = await Candidate.find({ assignedRecruiterId: recruiter._id })
      .sort({ assignedDate: -1, createdAt: -1 })
      .populate('userId', 'name email status')
      .lean();

    return res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single candidate (with recent applications)
// @route   GET /api/v1/recruiter/candidates/:id
// @access  Private/Recruiter
exports.getCandidate = async (req, res, next) => {
  try {
    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const candidate = await Candidate.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedRecruiterId', 'name email');

    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    const ok = ensureCandidateAssigned(recruiter, candidate, next);
    if (!ok) return;

    const applications = await JobApplication.find({ candidateId: candidate._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: { candidate, applications },
    });
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Update recruiterStatus for an assigned candidate
// @desc    Update candidate recruiter status
// @route   PUT /api/v1/recruiter/candidates/:id/status
// @access  Private/Recruiter
exports.updateCandidateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    // keep your UI options; allow safe values only
    const allowed = ['new', 'contacted', 'screening', 'interview', 'shortlisted', 'rejected', 'hired'];
    if (!allowed.includes(String(status || ''))) {
      return next(new ErrorResponse('Invalid recruiter status', 400));
    }

    const recruiter = await Recruiter.findOne({ userId: req.user.id }).lean();
    if (!recruiter) {
      return next(new ErrorResponse('Recruiter profile not found', 404));
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    const ok = ensureCandidateAssigned(recruiter, candidate, next);
    if (!ok) return;

    candidate.recruiterStatus = status;
    await candidate.save();

    return res.status(200).json({
      success: true,
      data: { candidateId: candidate._id, recruiterStatus: candidate.recruiterStatus },
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
    const {
      candidateId,
      jobTitle,
      companyName,
      jobLink,
      jobDescription, // ✅ store full JD
      resumeUsed, // can be { resumeId, fileUrl, fileName } OR omitted
      notes,
    } = req.body;

    if (!candidateId || !jobTitle || !companyName) {
      return next(
        new ErrorResponse('candidateId, jobTitle and companyName are required', 400)
      );
    }

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    const ok = ensureCandidateAssigned(recruiter, candidate, next);
    if (!ok) return;

    // ✅ Normalize resumeUsed
    let resolvedResumeUsed = null;

    if (resumeUsed && (resumeUsed.resumeId || resumeUsed.fileUrl)) {
      resolvedResumeUsed = {
        resumeId: resumeUsed.resumeId || null,
        fileUrl: resumeUsed.fileUrl || null,
        fileName: resumeUsed.fileName || null,
      };
    } else if (Array.isArray(candidate.resumes) && candidate.resumes.length > 0) {
      const active = candidate.resumes.find((r) => r.isActive) || candidate.resumes[0];
      resolvedResumeUsed = {
        resumeId: active._id || null,
        fileUrl: active.fileUrl || null,
        fileName: active.fileName || null,
      };
    }

    // ✅ recruiterId should be recruiter._id
    const application = await JobApplication.create({
      candidateId,
      recruiterId: recruiter._id,
      jobTitle,
      companyName,
      jobLink: jobLink || null,
      jobDescription: jobDescription || null,
      resumeUsed: resolvedResumeUsed,
      notes: notes ? [{ content: notes, addedBy: req.user.id }] : [],
    });

    return res.status(201).json({
      success: true,
      data: application,
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

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const query = { recruiterId: recruiter._id };
    if (status) query.status = status;
    if (candidateId) query.candidateId = candidateId;

    const total = await JobApplication.countDocuments(query);

    const applications = await JobApplication.find(query)
      .populate({
        path: 'candidateId',
        populate: { path: 'userId', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitInt);

    return res.status(200).json({
      success: true,
      count: applications.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: applications,
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
    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await JobApplication.findOne({
      _id: req.params.id,
      recruiterId: recruiter._id,
    }).populate({
      path: 'candidateId',
      populate: { path: 'userId', select: 'name email' },
    });

    if (!application) {
      return next(new ErrorResponse('Application not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: application,
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

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, recruiterId: recruiter._id },
      {
        status,
        ...(status === 'applied' ? { appliedDate: new Date() } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!application) {
      return next(new ErrorResponse('Application not found', 404));
    }

    return res.status(200).json({ success: true, data: application });
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

    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const application = await JobApplication.findOne({
      _id: req.params.id,
      recruiterId: recruiter._id,
    });

    if (!application) {
      return next(new ErrorResponse('Application not found', 404));
    }

    application.notes.push({ content, addedBy: req.user.id });
    await application.save();

    return res.status(200).json({
      success: true,
      data: application.notes[application.notes.length - 1],
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
    const recruiter = await getRecruiterOrThrow(req.user.id, next);
    if (!recruiter) return;

    const [
      totalCandidates,
      totalApplications,
      pendingApplications,
      appliedApplications,
      interviewApplications,
      rejectedApplications,
      offerApplications,
    ] = await Promise.all([
      // ✅ FIX: correct DB field
      Candidate.countDocuments({ assignedRecruiterId: recruiter._id }),

      JobApplication.countDocuments({ recruiterId: recruiter._id }),
      JobApplication.countDocuments({ recruiterId: recruiter._id, status: 'pending' }),
      JobApplication.countDocuments({ recruiterId: recruiter._id, status: 'applied' }),
      JobApplication.countDocuments({ recruiterId: recruiter._id, status: 'interview' }),
      JobApplication.countDocuments({ recruiterId: recruiter._id, status: 'rejected' }),
      JobApplication.countDocuments({ recruiterId: recruiter._id, status: 'offer' }),
    ]);

    const successRate =
      appliedApplications > 0
        ? ((offerApplications / appliedApplications) * 100).toFixed(2)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        totalApplications,
        applicationsByStatus: {
          pending: pendingApplications,
          applied: appliedApplications,
          interview: interviewApplications,
          rejected: rejectedApplications,
          offer: offerApplications,
        },
        successRate: parseFloat(successRate),
      },
    });
  } catch (error) {
    next(error);
  }
};
