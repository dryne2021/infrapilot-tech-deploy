const User = require("../models/User");
const Candidate = require("../models/Candidate");
const Recruiter = require("../models/Recruiter");
const ErrorResponse = require("../utils/ErrorResponse");
const { sendTokenResponse } = require("../utils/generateToken");

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, skills, experienceLevel } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "candidate",
    });

    // Create profile based on role
    if (user.role === "candidate") {
      await Candidate.create({
        userId: user._id,
        // Candidate model uses experienceLevel (not experience)
        experienceLevel: experienceLevel || "entry",
        skills: Array.isArray(skills) ? skills : [],
        // Keep these empty by default; can be filled from candidate onboarding form later
        fullName: name,
        email,
      });
    } else if (user.role === "recruiter") {
      // Recruiter model no longer stores assignedCandidates[]
      await Recruiter.create({
        userId: user._id,
        name,
        email,
        status: "active",
      });
    }

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse("Please provide an email and password", 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check if user is active
    if (user.status && user.status !== "active") {
      return next(new ErrorResponse("Your account has been deactivated", 401));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // Never return password
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    let profile = null;

    // Get profile based on role
    if (user.role === "candidate") {
      profile = await Candidate.findOne({ userId: user._id })
        .populate("assignedRecruiterId", "name email department specialization status phone bio experience")
        .lean();
    } else if (user.role === "recruiter") {
      profile = await Recruiter.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      user,     // ✅ easier for frontend: res.user.role
      profile,  // ✅ candidate/recruiter profile if exists
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return next(new ErrorResponse("Password is incorrect", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
