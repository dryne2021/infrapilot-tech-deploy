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
const candidatesRoutes = require("./routes/candidatesRoutes"); // ✅ ADD THIS
const jobApplicationRoutes = require("./routes/jobApplicationRoutes"); // ✅ ADD THIS

// ✅ Load env vars explicitly from server/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// OPTIONAL (temporary) - confirm env is loading
console.log("Gemini model:", process.env.GEMINI_MODEL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Enable CORS BEFORE mounting routes
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Mount routers (after CORS)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/candidate", candidateRoutes);
app.use("/api/v1/recruiter", recruiterRoutes);

// ✅ Option A route (ADMIN / RECRUITER FETCH BY ID)
app.use("/api/v1/candidates", candidatesRoutes);

// ✅ Job Application routes (candidate jobId + job description + resume used)
app.use("/api/v1/jobs", jobApplicationRoutes);

// ✅ Resume routes
console.log("✅ Resume routes mounted at /api/v1/resume");
app.use("/api/v1/resume", resumeRoutes);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Error handler middleware (must be after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  // server.close(() => process.exit(1));
});
