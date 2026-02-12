// server/controllers/authController.js

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Candidate = require("../models/Candidate");
const Recruiter = require("../models/Recruiter");
const ErrorResponse = require("../utils/ErrorResponse");
const { sendTokenResponse } = require("../utils/generateToken");

// helpers
const normalizeEmail = (v) => (v || "").toString().trim().toLowerCase();
const normalizeName = (v) => (v || "").toString().trim();
// ✅ IMPORTANT: normalize username same way as schema (lowercase + trim)
const normalizeUsername = (v) => (v || "").toString().trim().toLowerCase();

const looksLikeEmail = (v) => {
  const s = (v || "").toString().trim();
  return s.includes("@");
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    let { name, email, username, password, role, skills, experienceLevel } = req.body;

    const nameNorm = normalizeName(name);
    const emailNorm = normalizeEmail(email);
    const usernameNorm = username ? normalizeUsername(username) : undefined;

    if (!nameNorm || !emailNorm || !password) {
      return next(new ErrorResponse("Name, email and password are required", 400));
    }

    // Prevent duplicate accounts
    const existingEmail = await User.findOne({ email: emailNorm });
    if (existingEmail) {
      return next(new ErrorResponse("Email already registered", 400));
    }

    if (usernameNorm) {
      const existingUsername = await User.findOne({ username: usernameNorm });
      if (existingUsername) {
        return next(new ErrorResponse("Username already registered", 400));
      }
    }

    // Create user
    const user = await User.create({
      name: nameNorm,
      email: emailNorm,
      username: usernameNorm, // only works if your User schema includes it
      password,
      role: role || "candidate",
      status: "active",
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
    const identifierRaw =
      req.body.emailOrUsername || req.body.email || req.body.username;

    const password = req.body.password;
    const identifier = (identifierRaw || "").toString().trim();

    if (!identifier || !password) {
      return next(
        new ErrorResponse("Please provide email/username and password", 400)
      );
    }

    const isEmail = looksLikeEmail(identifier);
    const emailNorm = isEmail ? normalizeEmail(identifier) : null;
    const usernameNorm = !isEmail ? normalizeUsername(identifier) : null;

    const userQuery = isEmail
      ? { email: emailNorm }
      : { username: usernameNorm };

    let user = await User.findOne(userQuery).select("+password");

    // =============================
    // 1️⃣ Normal User Login
    // =============================
    if (user) {
      if (user.status && user.status !== "active") {
        return next(
          new ErrorResponse("Your account has been deactivated", 401)
        );
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(new ErrorResponse("Invalid credentials", 401));
      }

      // ✅ USE EXISTING TOKEN HANDLER
      return sendTokenResponse(user, 200, res);
    }

    // =============================
    // 2️⃣ Candidate Fallback Login
    // =============================
    const candidateQuery = isEmail
      ? { email: normalizeEmail(identifier) }
      : { username: normalizeUsername(identifier) };

    const candidate = await Candidate.findOne(candidateQuery).select(
      "+passwordHash"
    );

    if (!candidate) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const ok = await bcrypt.compare(password, candidate.passwordHash);
    if (!ok) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const linkedUser = await User.findById(candidate.userId).select(
      "-password"
    );

    if (!linkedUser) {
      return next(
        new ErrorResponse("Login misconfiguration. Contact admin.", 500)
      );
    }

    // ✅ USE EXISTING TOKEN HANDLER
    return sendTokenResponse(linkedUser, 200, res);
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
        .populate("assignedRecruiter", "name email department specialization status phone bio experience")
        .populate("assignedRecruiterId", "name email department specialization status phone bio experience")
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
    if (req.body.username !== undefined) fieldsToUpdate.username = normalizeUsername(req.body.username);

    if (Object.keys(fieldsToUpdate).length === 0) {
      return next(new ErrorResponse("No fields provided to update", 400));
    }

    if (fieldsToUpdate.email) {
      const existing = await User.findOne({
        email: fieldsToUpdate.email,
        _id: { $ne: req.user.id },
      });
      if (existing) return next(new ErrorResponse("Email already in use", 400));
    }

    if (fieldsToUpdate.username) {
      const existingU = await User.findOne({
        username: fieldsToUpdate.username,
        _id: { $ne: req.user.id },
      });
      if (existingU) return next(new ErrorResponse("Username already in use", 400));
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

    if (typeof user.comparePassword !== "function") {
      return next(new ErrorResponse("Login misconfiguration. Contact admin.", 500));
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