const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Generate token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id, user.role);

  // cookie expiry (default 7 days)
  const days = Number(process.env.JWT_COOKIE_EXPIRE_DAYS || 7);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const isProd = process.env.NODE_ENV === "production";

  const options = {
    expires,
    httpOnly: true,
    secure: isProd, // ✅ required on HTTPS (Render)
    // ✅ Important for cross-site frontend (Render frontend calling Render API):
    // - If frontend and backend are on different domains, you need SameSite=None
    // - SameSite=None requires secure=true (production)
    sameSite: isProd ? "none" : "lax",
  };

  // Remove password from output
  if (user && user.password) user.password = undefined;

  return res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token, // optional: frontend can still store in memory if you want
    user,
  });
};

module.exports = {
  generateToken,
  sendTokenResponse,
};
