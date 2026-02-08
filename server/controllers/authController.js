// server/controllers/authController.js

const User = require("../models/User");
const Candidate = require("../models/Candidate");
const Recruiter = require("../models/Recruiter");
const ErrorResponse = require("../utils/ErrorResponse");
const { sendTokenResponse } = require("../utils/generateToken");

// helpers
const normalizeEmail = (v) => (v || "").toString().trim().toLowerCase();
const normalizeName = (v) => (v || "").toString().trim();

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    let { name, email, password, role, skills, experienceLevel } = req.body;

    const nameNorm = normalizeName(name);
    const emailNorm = normalizeEmail(email);

    if (!nameNorm || !emailNorm || !password) {
      return next(new ErrorResponse("Name, email and password are required", 400));
    }

    // Prevent duplicate accounts
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return next(new ErrorResponse("Email already registered", 400));
    }

    // Create user
    const user = await User.create({
      name: nameNorm,
      email: emailNorm,
      password,
      role: role || "candidate",
      status: "active", // harmless even if schema ignores it
    });

    // Create profile based on role
    if (user.role === "candidate") {
      await Candidate.create({
        userId: user._id,
        experienceLevel: experienceLevel || "entry",
        skills: Array.isArray(skills) ? skills : [],
        fullName: nameNorm,
        email: emailNorm,
      });
    } else if (user.role === "recruiter") {
      await Recruiter.create({
        userId: user._id,
        name: nameNorm,
        email: emailNorm,
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
    // Accept both payloads:
    // Old: { email, password }
    // New: { emailOrUsername, password, role }
    const emailOrUsernameRaw = req.body.emailOrUsername || req.body.email;
    const password = req.body.password;
    const role = req.body.role;

    const emailNorm = normalizeEmail(emailOrUsernameRaw);

    if (!emailNorm || !password) {
      return next(new ErrorResponse("Please provide an email and password", 400));
    }

    // Safe logs for Render debugging (NO password)
    console.log("✅ LOGIN ATTEMPT:", { email: emailNorm, role, keys: Object.keys(req.body) });

    // IMPORTANT: select password if schema uses select:false
    const user = await User.findOne({ email: emailNorm }).select("+password");

    if (!user) {
      console.log("❌ LOGIN FAIL: user not found in Users collection:", emailNorm);
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // TEMP: Disable role enforcement while testing
    // (re-enable after login works)
    // if (role && user.role && user.role !== role) {
    //   console.log("❌ LOGIN FAIL: role mismatch:", { dbRole: user.role, reqRole: role });
    //   return next(new ErrorResponse("Invalid role for this account", 401));
    // }

    // Check if user is active (only if status exists)
    if (user.status && user.status !== "active") {
      console.log("❌ LOGIN FAIL: account inactive:", { email: emailNorm, status: user.status });
      return next(new ErrorResponse("Your account has been deactivated", 401));
    }

    // Check password
    if (typeof user.comparePassword !== "function") {
      console.log("❌ LOGIN FAIL: comparePassword is not defined on User model");
      return next(new ErrorResponse("Login misconfiguration. Contact admin.", 500));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("❌ LOGIN FAIL: password mismatch for:", emailNorm);
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    console.log("✅ LOGIN OK:", { email: emailNorm, role: user.role });

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
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    let profile = null;

    if (user.role === "candidate") {
      profile = await Candidate.findOne({ userId: user._id })
        .populate(
          "assignedRecruiterId",
          "name email department specialization status phone bio experience"
        )
        .lean();
    } else if (user.role === "recruiter") {
      profile = await Recruiter.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      user,
      profile,
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
    const fieldsToUpdate = {};

    if (req.body.name !== undefined) fieldsToUpdate.name = normalizeName(req.body.name);
    if (req.body.email !== undefined) fieldsToUpdate.email = normalizeEmail(req.body.email);

    // Optional: avoid empty updates
    if (Object.keys(fieldsToUpdate).length === 0) {
      return next(new ErrorResponse("No fields provided to update", 400));
    }

    // Optional: prevent duplicate email change
    if (fieldsToUpdate.email) {
      const existing = await User.findOne({ email: fieldsToUpdate.email, _id: { $ne: req.user.id } });
      if (existing) {
        return next(new ErrorResponse("Email already in use", 400));
      }
    }

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

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (!req.body.currentPassword || !req.body.newPassword) {
      return next(new ErrorResponse("Current password and new password are required", 400));
    }

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
