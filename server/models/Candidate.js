const mongoose = require("mongoose");

/* =========================
   Education
========================= */
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

/* =========================
   Experience (Work History)
========================= */
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

/* =========================
   Resume
========================= */
const ResumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

/* =========================
   Candidate
========================= */
const CandidateSchema = new mongoose.Schema(
  {
    // link to user account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // profile
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

    // subscription
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

    /* =========================
       Credentials
    ========================= */
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
      select: false,
    },
    credentialsGenerated: { type: Date, default: null },
    credentialsUpdatedBy: { type: String, default: "" },

    /* =========================
       Education & Experience
    ========================= */
    education: [EducationSchema],

    // ✅ CANONICAL FIELD
    workHistory: [ExperienceSchema],

    resumes: [ResumeSchema],

    /* =========================
       Recruiter Assignment
    ========================= */
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

/* =========================
   Indexes
========================= */
CandidateSchema.index({ assignedRecruiterId: 1, subscriptionStatus: 1 });
CandidateSchema.index({ subscriptionPlan: 1, paymentStatus: 1 });

CandidateSchema.index(
  { username: 1 },
  {
    unique: true,
    sparse: true,
    collation: { locale: "en", strength: 2 },
  }
);

/* =========================
   Virtuals
========================= */
CandidateSchema.virtual("hasCredentials").get(function () {
  return Boolean(this.username && this.username.trim() && this.passwordHash);
});

/* =========================
   🔥 CRITICAL FIX: Normalize experience
   Accept BOTH:
   - experience (frontend)
   - workHistory (backend)
========================= */
CandidateSchema.pre("validate", function (next) {
  // if frontend sent `experience`, map it
  if (
    Array.isArray(this.experience) &&
    this.experience.length > 0 &&
    (!this.workHistory || this.workHistory.length === 0)
  ) {
    this.workHistory = this.experience;
  }

  // enforce at least one valid experience
  const hasValidExperience =
    Array.isArray(this.workHistory) &&
    this.workHistory.some(
      (e) =>
        e &&
        String(e.company || "").trim() &&
        String(e.title || "").trim() &&
        String(e.startDate || "").trim()
    );

  if (!hasValidExperience) {
    return next(
      new Error(
        "Student experience is required. Please add at least one experience with Company, Title, and Start Date."
      )
    );
  }

  next();
});

/* =========================
   Normalization guard
========================= */
CandidateSchema.pre("save", function (next) {
  if (typeof this.username === "string") {
    this.username = this.username.trim().toLowerCase();
  }
  if (typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model("Candidate", CandidateSchema);
