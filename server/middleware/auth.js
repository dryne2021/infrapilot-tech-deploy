const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const ErrorResponse = require("../utils/ErrorResponse");

// Helper: safely read cookie value
function getCookie(req, name) {
  if (req.cookies && req.cookies[name]) return req.cookies[name];

  const raw = req.headers.cookie;
  if (!raw) return null;

  const parts = raw.split(";").map((p) => p.trim());
  const found = parts.find((p) => p.startsWith(`${name}=`));
  if (!found) return null;

  const value = found.substring(name.length + 1);

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Protect routes
exports.protect = async (req, res, next) => {
  let token = null;

  // 1️⃣ Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1].trim();
  }

  // 2️⃣ Cookie
  if (!token) {
    token = getCookie(req, "token");
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ PostgreSQL query
    const result = await pool.query(
      "SELECT id,name,email,username,role FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new ErrorResponse("User not found", 401));
    }

    const user = result.rows[0];

    req.user = user;
    req.userId = user.id;
    req.token = token;
    req.jwt = decoded;

    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
};

// Role authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user?.role} is not authorized`,
          403
        )
      );
    }

    next();
  };
};