const jwt = require("jsonwebtoken");
const Candidate = require("../models/Candidate"); // 🔥 ADDED

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Helper: build safe user object for frontend
const toSafeUser = (user) => {
  if (!user) return null;

  if (typeof user.getSafeUser === "function") return user.getSafeUser();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
};

// 🔥 UPDATED: Now async to fetch candidateId
const sendTokenResponse = async (user, statusCode, res) => {
  const token = generateToken(user._id, user.role);

  const days = Number(process.env.JWT_COOKIE_EXPIRE_DAYS || 7);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const isProd = process.env.NODE_ENV === "production";

  const cookieOptions = {
    expires,
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };

  // Build safe user object
  const safeUser = toSafeUser(user);

  // 🔥 Attach candidateId if user is candidate
  if (user.role === "candidate") {
    const candidateProfile = await Candidate.findOne({
      userId: user._id,
    }).select("_id");

    if (candidateProfile) {
      safeUser.candidateId = candidateProfile._id;
    }
  }

  return res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      token,
      user: safeUser,
    });
};

module.exports = {
  generateToken,
  sendTokenResponse,
};
