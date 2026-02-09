const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Helper: build safe user object for frontend
const toSafeUser = (user) => {
  if (!user) return null;

  // If your User model has getSafeUser() (from the updated User.js), use it
  if (typeof user.getSafeUser === "function") return user.getSafeUser();

  // fallback: minimal safe fields
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

// Generate token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id, user.role);

  // cookie expiry (default 7 days)
  const days = Number(process.env.JWT_COOKIE_EXPIRE_DAYS || 7);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const isProd = process.env.NODE_ENV === "production";

  /**
   * IMPORTANT:
   * - If frontend and backend are on different domains (common on Render),
   *   you MUST use:
   *     sameSite: "none"
   *     secure: true
   * - In local dev, use sameSite: "lax" and secure: false
   *
   * Also: frontend fetch MUST use credentials: "include"
   * and backend CORS must set credentials: true + origin set to your client URL.
   */
  const cookieOptions = {
    expires,
    httpOnly: true,
    secure: isProd, // ✅ required when sameSite="none"
    sameSite: isProd ? "none" : "lax",
    // ✅ cookie available across all routes
    path: "/",
  };

  // ✅ do NOT mutate mongoose user doc (avoid side effects)
  const safeUser = toSafeUser(user);

  return res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      token, // keep token for clients that prefer Authorization header
      user: safeUser,
    });
};

module.exports = {
  generateToken,
  sendTokenResponse,
};
