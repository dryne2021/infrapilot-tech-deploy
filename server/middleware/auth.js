const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/ErrorResponse");

// Helper: safely read cookie value (works with or without cookie-parser)
function getCookie(req, name) {
  // If cookie-parser is used
  if (req.cookies && req.cookies[name]) return req.cookies[name];

  // Fallback: manual parse
  const raw = req.headers.cookie;
  if (!raw) return null;

  const parts = raw.split(";").map((p) => p.trim());
  const found = parts.find((p) => p.startsWith(`${name}=`));
  if (!found) return null;

  // token may be URL encoded
  const value = found.substring(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Protect routes - user must be authenticated
exports.protect = async (req, res, next) => {
  let token = null;

  // 1) Check Authorization header (Bearer)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1]?.trim();
  }

  // 2) Check cookies
  if (!token) {
    token = getCookie(req, "token");
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new ErrorResponse("User not found", 401));
    }

    // If status exists, enforce it
    if (user.status && user.status !== "active") {
      return next(new ErrorResponse("User account is inactive", 401));
    }

    // ✅ attach consistent fields
    req.user = user;
    req.userId = user._id.toString(); // consistent across code
    req.token = token;
    req.jwt = decoded;

    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user?.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user owns the resource or is admin
exports.checkOwnershipOrAdmin = (model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params[paramName]);

      if (!resource) {
        return next(new ErrorResponse("Resource not found", 404));
      }

      const ownerId = resource.userId ? resource.userId.toString() : null;
      const isOwner = ownerId && ownerId === req.userId;
      const isAdmin = req.user?.role === "admin";

      if (!isOwner && !isAdmin) {
        return next(new ErrorResponse("Not authorized to access this resource", 403));
      }

      req.resource = resource;
      next();
    } catch (error) {
      return next(new ErrorResponse("Server error", 500));
    }
  };
};
