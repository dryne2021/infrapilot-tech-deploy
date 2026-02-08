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

// ✅ NEW: Job applications routes
const jobApplicationRoutes = require("./routes/jobApplicationRoutes");

// ✅ NEW: Plans routes (Admin Plans API)
const planRoutes = require("./routes/planRoutes");

// ✅ Load env vars explicitly from server/.env (local). On Render, env vars come from dashboard.
dotenv.config({ path: path.join(__dirname, ".env") });

// OPTIONAL logs (safe)
console.log("Gemini model:", process.env.GEMINI_MODEL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Improved CORS (local + deployed)
const allowedOrigins = [
  process.env.CLIENT_URL, // deployed frontend
  "http://localhost:3000", // local dev
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, server-to-server, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Mount routers
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);

// ✅ NEW: Admin Plans endpoints (GET/POST/PUT/DELETE /api/v1/admin/plans)
app.use("/api/v1/admin/plans", planRoutes);

app.use("/api/v1/candidate", candidateRoutes);
app.use("/api/v1/recruiter", recruiterRoutes);
app.use("/api/v1/candidates", candidatesRoutes);

// ✅ NEW: Job applications
app.use("/api/v1/job-applications", jobApplicationRoutes);

// ✅ Resume routes
console.log("✅ Resume routes mounted at /api/v1/resume");
app.use("/api/v1/resume", resumeRoutes);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ✅ Start server only after DB connects, then seed admin (prod only)
async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // ✅ Auto-seed admin in production (no shell needed)
    if (process.env.NODE_ENV === "production") {
      try {
        // This file will create the admin only if missing
        require("./scripts/seedAdmin"); // runs immediately
        console.log("✅ Admin seed check triggered");
      } catch (e) {
        console.error("❌ Admin seed failed to run:", e.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
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
