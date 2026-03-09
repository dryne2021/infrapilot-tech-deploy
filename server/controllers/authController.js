// server/controllers/authController.js

const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");
const { sendTokenResponse } = require("../utils/generateToken");

// helpers
const normalizeEmail = (v) => (v || "").toString().trim().toLowerCase();
const normalizeName = (v) => (v || "").toString().trim();
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
    let { name, email, username, password, role } = req.body;

    const nameNorm = normalizeName(name);
    const emailNorm = normalizeEmail(email);
    const usernameNorm = username ? normalizeUsername(username) : null;

    if (!nameNorm || !emailNorm || !password) {
      return next(new ErrorResponse("Name, email and password are required", 400));
    }

    // Check duplicate email
    const existingEmail = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [emailNorm]
    );

    if (existingEmail.rows.length > 0) {
      return next(new ErrorResponse("Email already registered", 400));
    }

    // Check duplicate username
    if (usernameNorm) {
      const existingUsername = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [usernameNorm]
      );

      if (existingUsername.rows.length > 0) {
        return next(new ErrorResponse("Username already registered", 400));
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, username, password, role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [nameNorm, emailNorm, usernameNorm, hashedPassword, role || "candidate"]
    );

    const user = newUser.rows[0];

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

    const result = await pool.query(
      isEmail
        ? "SELECT * FROM users WHERE email = $1"
        : "SELECT * FROM users WHERE username = $1",
      [isEmail ? emailNorm : usernameNorm]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    return sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {

    const result = await pool.query(
      "SELECT id,name,email,username,role,created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("User not found", 404));
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
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

    const fields = {};
    if (req.body.name) fields.name = normalizeName(req.body.name);
    if (req.body.email) fields.email = normalizeEmail(req.body.email);
    if (req.body.username) fields.username = normalizeUsername(req.body.username);

    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return next(new ErrorResponse("No fields provided to update", 400));
    }

    const values = Object.values(fields);
    const setString = keys.map((k, i) => `${k}=$${i + 1}`).join(",");

    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${setString} WHERE id=$${values.length} RETURNING id,name,email,username,role`,
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

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {

  try {

    const result = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("User not found", 404));
    }

    const user = result.rows[0];

    if (!req.body.currentPassword || !req.body.newPassword) {
      return next(
        new ErrorResponse(
          "Current password and new password are required",
          400
        )
      );
    }

    const isMatch = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    if (!isMatch) {
      return next(new ErrorResponse("Password is incorrect", 401));
    }

    const newHash = await bcrypt.hash(req.body.newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [newHash, req.user.id]
    );

    const updatedUser = await pool.query(
      "SELECT id,name,email,username,role FROM users WHERE id=$1",
      [req.user.id]
    );

    sendTokenResponse(updatedUser.rows[0], 200, res);

  } catch (error) {
    next(error);
  }

};