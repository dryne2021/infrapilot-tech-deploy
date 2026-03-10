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

  // ✅ FIX 1: Improved cookie settings for both dev and production
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
      "SELECT id FROM users WHERE email = $1",
      [emailNorm]
    );

    if (existingEmail.rows.length > 0) {
      return next(new ErrorResponse("Email already registered", 400));
    }

    // Check duplicate username
    if (usernameNorm) {
      const existingUsername = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [usernameNorm]
      );

      if (existingUsername.rows.length > 0) {
        return next(new ErrorResponse("Username already registered", 400));
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, username, password, role, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,name,email,username,role`,
      [nameNorm, emailNorm, usernameNorm, hashedPassword, role || "candidate", "active"]
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

    // ✅ FIX 2: Improved query - only select needed columns
    const result = await pool.query(
      isEmail
        ? "SELECT id,name,email,username,password,role,status FROM users WHERE email = $1"
        : "SELECT id,name,email,username,password,role,status FROM users WHERE username = $1",
      [isEmail ? emailNorm : usernameNorm]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const user = result.rows[0];

    // ✅ FIX 4: Account status check
    if (user.status && user.status !== "active") {
      return next(new ErrorResponse("Account is not active. Please contact support.", 403));
    }

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
      "SELECT id,name,email,username,role,status,created_at FROM users WHERE id = $1",
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
// @route   GET /api/v1/auth/logout
// ======================================================
exports.logout = (req, res) => {
  // ✅ FIX 5: Improved logout cookie
  res.cookie("token", "none", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
};

// ======================================================
// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// ======================================================
exports.updateDetails = async (req, res, next) => {
  try {
    const fields = {};
    
    if (req.body.name) {
      fields.name = normalizeName(req.body.name);
    }
    
    // ✅ FIX 3: Email duplicate check
    if (req.body.email) {
      const emailNorm = normalizeEmail(req.body.email);
      
      const check = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [emailNorm, req.user.id]
      );

      if (check.rows.length > 0) {
        return next(new ErrorResponse("Email already in use", 400));
      }

      fields.email = emailNorm;
    }
    
    if (req.body.username) {
      const usernameNorm = normalizeUsername(req.body.username);
      
      const check = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [usernameNorm, req.user.id]
      );

      if (check.rows.length > 0) {
        return next(new ErrorResponse("Username already in use", 400));
      }

      fields.username = usernameNorm;
    }

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
// @route   PUT /api/v1/auth/updatepassword
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

// ======================================================
// @desc    Check auth status
// @route   GET /api/v1/auth/status
// ======================================================
exports.checkAuthStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(200).json({
        success: true,
        isAuthenticated: false,
        user: null
      });
    }

    const result = await pool.query(
      "SELECT id,name,email,username,role,status FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        isAuthenticated: false,
        user: null
      });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(200).json({
        success: true,
        isAuthenticated: false,
        user: null,
        message: "Account is not active"
      });
    }

    res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    next(error);
  }
};