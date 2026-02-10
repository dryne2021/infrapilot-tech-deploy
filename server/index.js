// server/index.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

// Route files
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const candidateRoutes = require("./routes/candidate");
const recruiterRoutes = require("./routes/recruiter");
const resumeRoutes = require("./routes/resumeRoutes");
const candidatesRoutes = require("./routes/candidatesRoutes");

// ✅ Job applications routes
const jobApplicationRoutes = require("./routes/jobApplicationRoutes");

// ✅ Plans routes (Admin Plans API)
const planRoutes = require("./routes/planRoutes");

// ✅ Load env vars explicitly from server/.env (local). On Render, env vars come from dashboard.
dotenv.config({ path: path.join(__dirname, ".env") });

// OPTIONAL logs (safe)
console.log("Gemini model:", process.env.GEMINI_MODEL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

const app = express();

/* =========================================================
   Body parser
========================================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   CORS (FIXED for Render + cookies)
   - Must return exact origin when credentials:true
========================================================= */
const allowedOrigins = [
  process.env.CLIENT_URL, // deployed frontend (Render/Vercel etc)
  "http://localhost:3000", // local dev
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ✅ Do not throw (throwing can break preflight + cause weird browser behavior)
    console.log("❌ CORS blocked origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ✅ Preflight handling (IMPORTANT for cookies + complex requests)
app.options("*", cors(corsOptions));

/* =========================================================
   Mount routers
========================================================= */
app.use("/api/v1/auth", authRoutes);

// ✅ Admin core routes (includes /candidates endpoints in routes/admin.js)
app.use("/api/v1/admin", adminRoutes);

// ✅ Admin Plans endpoints (GET/POST/PUT/DELETE /api/v1/admin/plans)
app.use("/api/v1/admin/plans", planRoutes);

// ✅ IMPORTANT: Option 1 => DO NOT mount candidatesRoutes under /api/v1/admin/candidates
// Because /api/v1/admin/candidates is already defined inside routes/admin.js
// app.use("/api/v1/admin/candidates", candidatesRoutes); // ❌ removed to prevent conflicts

// Existing candidate/recruiter app routes
app.use("/api/v1/candidate", candidateRoutes);
app.use("/api/v1/recruiter", recruiterRoutes);

// (Optional) Keep this if other parts of your app use /api/v1/candidates
app.use("/api/v1/candidates", candidatesRoutes);

// ✅ Job applications
app.use("/api/v1/job-applications", jobApplicationRoutes);

// ✅ Resume routes
console.log("✅ Resume routes mounted at /api/v1/resume");
app.use("/api/v1/resume", resumeRoutes);

/* =========================================================
   Static files
========================================================= */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* =========================================================
   Error handler middleware (must be last)
========================================================= */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/* =========================================================
   Start server only after DB connects, then seed admin (prod only)
========================================================= */
async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // ✅ Auto-seed admin in production (no shell needed)
    if (process.env.NODE_ENV === "production") {
      try {
        require("./scripts/seedAdmin"); // runs immediately
        console.log("✅ Admin seed check triggered");
      } catch (e) {
        console.error("❌ Admin seed failed to run:", e.message);
      }
    }

    app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
      console.log("✅ Allowed CORS origins:", allowedOrigins);
      console.log("✅ Admin routes mounted at /api/v1/admin");
      console.log("✅ Admin candidates now served by routes/admin.js at /api/v1/admin/candidates");
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
});
