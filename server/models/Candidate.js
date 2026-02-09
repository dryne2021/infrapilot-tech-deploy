const mongoose = require("mongoose");

const EducationSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    field: { type: String, required: true, trim: true },
    startYear: { type: String, trim: true },
    endYear: { type: String, trim: true },
  },
  { _id: false }
);

const ExperienceSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    startDate: { type: String, trim: true },
    endDate: { type: String, trim: true },
    location: { type: String, trim: true },
    bullets: [{ type: String, trim: true }],
  },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const CandidateSchema = new mongoose.Schema(
  {
    // link to user account (keep this)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // candidate profile fields
    fullName: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },

    targetRole: { type: String, trim: true },
    summary: { type: String, trim: true },

    skills: [{ type: String, trim: true }],

    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "executive"],
      default: "entry",
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "silver", "gold", "platinum", "enterprise"],
      default: "free",
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["none", "pending", "paid"],
      default: "none",
      index: true,
    },

    /* =========================================================
       ✅ Admin-created Candidate Credentials
       - DO NOT store plaintext password
       - username must be unique when set
       - allow many candidates with empty username (sparse index)
    ========================================================= */
    username: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },
    passwordHash: {
      type: String,
      default: "",
      select: false, // IMPORTANT: do not return passwordHash by default
    },
    credentialsGenerated: { type: Date, default: null },
    credentialsUpdatedBy: { type: String, default: "" }, // "admin" or admin userId

    // real education + work history data
    education: [EducationSchema],
    workHistory: [ExperienceSchema],

    resumes: [ResumeSchema],

    // recruiter assignment
    assignedRecruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedRecruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      default: null,
      index: true,
    },

    recruiterStatus: { type: String, default: "" },
    assignedDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =========================================================
   Indexes
========================================================= */

// Helpful compound index for admin searching/filtering
CandidateSchema.index({ assignedRecruiterId: 1, subscriptionStatus: 1 });
CandidateSchema.index({ subscriptionPlan: 1, paymentStatus: 1 });

// ✅ Ensure username is unique ONLY when it exists (sparse)
CandidateSchema.index(
  { username: 1 },
  {
    unique: true,
    sparse: true, // allows multiple docs with "" or missing username
    collation: { locale: "en", strength: 2 }, // case-insensitive uniqueness
  }
);

// Optional: prevent duplicate emails (only if you want it unique when set)
// CandidateSchema.index({ email: 1 }, { unique: true, sparse: true });

/* =========================================================
   Virtuals
========================================================= */

CandidateSchema.virtual("hasCredentials").get(function () {
  return Boolean(this.username && this.username.trim() && this.passwordHash);
});

/* =========================================================
   Normalization guard (extra safety)
========================================================= */
CandidateSchema.pre("save", function (next) {
  if (typeof this.username === "string") this.username = this.username.trim().toLowerCase();
  if (typeof this.email === "string") this.email = this.email.trim().toLowerCase();
  next();
});

module.exports = mongoose.model("Candidate", CandidateSchema);
