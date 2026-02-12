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

// Job applications routes
const jobApplicationRoutes = require("./routes/jobApplicationRoutes");

// Plans routes
const planRoutes = require("./routes/planRoutes");

/* =========================================================
   ✅ FIXED ENV LOADING
   - Load .env only in local development
   - Render provides env vars automatically
========================================================= */
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, ".env") });
}

// Optional logs
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

const app = express();

/* =========================================================
   Body parser
========================================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   CORS
========================================================= */
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

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
app.options("*", cors(corsOptions));

/* =========================================================
   Mount routers
========================================================= */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin/plans", planRoutes);
app.use("/api/v1/candidate", candidateRoutes);
app.use("/api/v1/recruiter", recruiterRoutes);
app.use("/api/v1/candidates", candidatesRoutes);
app.use("/api/v1/job-applications", jobApplicationRoutes);

console.log("✅ Resume routes mounted at /api/v1/resume");
app.use("/api/v1/resume", resumeRoutes);

/* =========================================================
   Static files
========================================================= */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* =========================================================
   Error handler (must be last)
========================================================= */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/* =========================================================
   Start server
========================================================= */
async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    if (process.env.NODE_ENV === "production") {
      try {
        require("./scripts/seedAdmin");
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
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
});
