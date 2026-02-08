const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - user must be authenticated
exports.protect = async (req, res, next) => {
  let token;

  // 1) Check for token in Authorization header (Bearer)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2) Check for token in cookies (if you use cookie auth)
  // NOTE: This works even without cookie-parser by reading req.headers.cookie manually.
  if (!token && req.headers.cookie) {
    const cookieStr = req.headers.cookie; // "a=b; token=xxx; c=d"
    const tokenPair = cookieStr
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("token="));

    if (tokenPair) token = tokenPair.split("=")[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    // If you have status, enforce it; if not present, allow
    if (user.status && user.status !== "active") {
      return res.status(401).json({
        success: false,
        error: "User account is inactive",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user?.role} is not authorized to access this route`,
      });
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
        return res.status(404).json({
          success: false,
          error: "Resource not found",
        });
      }

      // Check ownership or admin role
      const isOwner = resource.userId && resource.userId.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this resource",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  };
};
