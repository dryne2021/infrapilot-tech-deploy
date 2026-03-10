const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");

// helpers
const normalizeEmail = (v) => (v || "").toString().trim().toLowerCase();
const normalizeName = (v) => (v || "").toString().trim();
const normalizeUsername = (v) => (v || "").toString().trim().toLowerCase();

const looksLikeEmail = (v) => {
  const s = (v || "").toString().trim();
  return s.includes("@");
};

// 🔐 Generate token + send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
};

// ======================================================
// @desc    Register user
// @route   POST /api/v1/auth/register
// ======================================================
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
       RETURNING id,name,email,username,role`,
      [nameNorm, emailNorm, usernameNorm, hashedPassword, role || "candidate"]
    );

    const user = newUser.rows[0];

    sendTokenResponse(user, 201, res);

  } catch (error) {
    next(error);
  }
};

// ======================================================
// @desc    Login user
// @route   POST /api/v1/auth/login
// ======================================================
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

    sendTokenResponse(user, 200, res);

  } catch (error) {
    next(error);
  }
};

// ======================================================
// @desc    Get current user
// @route   GET /api/v1/auth/me
// ======================================================
exports.getMe = async (req, res, next) => {
  try {

    const result = await pool.query(
      "SELECT id,name,email,username,role,created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// @desc    Logout user
// ======================================================
exports.logout = (req, res) => {

  res.cookie("token", "none", {
    expires: new Date(Date.now() + 1000 * 10),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
  });

};

// ======================================================
// @desc    Update user details
// ======================================================
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
      user: result.rows[0],
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================
// @desc    Update password
// ======================================================
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