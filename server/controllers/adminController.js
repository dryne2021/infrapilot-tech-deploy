const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const JobApplication = require('../models/JobApplication');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;

    // Pagination
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const startIndex = (pageInt - 1) * limitInt;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitInt);

    // Get profiles for each user
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profile = null;
        if (user.role === 'candidate') {
          profile = await Candidate.findOne({ userId: user._id });
        } else if (user.role === 'recruiter') {
          profile = await Recruiter.findOne({ userId: user._id });
        }
        return {
          ...user.toObject(),
          profile
        };
      })
    );

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: usersWithProfiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    let profile = null;
    let relatedData = null;

    // Get profile and related data based on role
    if (user.role === 'candidate') {
      profile = await Candidate.findOne({ userId: user._id }).populate('assignedRecruiterId', 'name email');
      relatedData = {
        jobApplications: await JobApplication.find({ candidateId: profile._id })
          .populate('recruiterId', 'name email')
          .sort({ createdAt: -1 })
      };
    } else if (user.role === 'recruiter') {
      profile = await Recruiter.findOne({ userId: user._id })
        .populate({
          path: 'assignedCandidates',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        });
      relatedData = {
        jobApplications: await JobApplication.find({ recruiterId: user._id })
          .populate('candidateId', 'userId')
          .populate({
            path: 'candidateId',
            populate: {
              path: 'userId',
              select: 'name email'
            }
          })
          .sort({ createdAt: -1 })
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile,
        relatedData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/v1/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, skills, experience } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('User already exists with this email', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'candidate'
    });

    // Create profile based on role
    if (user.role === 'candidate') {
      await Candidate.create({
        userId: user._id,
        skills: skills || [],
        experience: experience || 'entry'
      });
    } else if (user.role === 'recruiter') {
      await Recruiter.create({
        userId: user._id,
        assignedCandidates: []
      });
    }

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // If role changed, update profile
    if (req.body.role) {
      // Remove existing profiles
      await Candidate.findOneAndDelete({ userId: user._id });
      await Recruiter.findOneAndDelete({ userId: user._id });

      // Create new profile based on role
      if (req.body.role === 'candidate') {
        await Candidate.create({
          userId: user._id,
          skills: req.body.skills || [],
          experience: req.body.experience || 'entry'
        });
      } else if (req.body.role === 'recruiter') {
        await Recruiter.create({
          userId: user._id,
          assignedCandidates: []
        });
      }
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // Remove associated profiles
    await Candidate.findOneAndDelete({ userId: user._id });
    await Recruiter.findOneAndDelete({ userId: user._id });

    // Remove user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign recruiter to candidate
// @route   PUT /api/v1/admin/assign-recruiter
// @access  Private/Admin
exports.assignRecruiter = async (req, res, next) => {
  try {
    const { candidateId, recruiterId } = req.body;

    // Check if candidate exists
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return next(new ErrorResponse('Candidate not found', 404));
    }

    // Check if recruiter exists and is actually a recruiter
    const recruiterUser = await User.findById(recruiterId);
    if (!recruiterUser || recruiterUser.role !== 'recruiter') {
      return next(new ErrorResponse('Recruiter not found or invalid role', 404));
    }

    const recruiter = await Recruiter.findOne({ userId: recruiterId });

    // Update candidate's assigned recruiter
    candidate.assignedRecruiterId = recruiterId;
    await candidate.save();

    // Add candidate to recruiter's assigned candidates if not already there
    if (!recruiter.assignedCandidates.includes(candidate._id)) {
      recruiter.assignedCandidates.push(candidate._id);
      await recruiter.save();
    }

    res.status(200).json({
      success: true,
      data: {
        candidate,
        recruiter
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCandidates,
      totalRecruiters,
      totalAdmins,
      totalJobApplications,
      pendingApplications,
      appliedApplications,
      interviewApplications,
      rejectedApplications,
      offerApplications
    ] = await Promise.all([
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ role: 'admin' }),
      JobApplication.countDocuments(),
      JobApplication.countDocuments({ status: 'pending' }),
      JobApplication.countDocuments({ status: 'applied' }),
      JobApplication.countDocuments({ status: 'interview' }),
      JobApplication.countDocuments({ status: 'rejected' }),
      JobApplication.countDocuments({ status: 'offer' })
    ]);

    // Calculate success rate (offer / applied)
    const successRate = appliedApplications > 0 
      ? (offerApplications / appliedApplications * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        totalRecruiters,
        totalAdmins,
        totalJobApplications,
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