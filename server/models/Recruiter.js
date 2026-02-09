const mongoose = require("mongoose");

const RecruiterSchema = new mongoose.Schema(
  {
    // Link to recruiter user account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Recruiter profile (used heavily in Admin UI)
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
      default: "Recruitment",
    },
    specialization: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },

    // Admin controls
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    maxCandidates: {
      type: Number,
      default: 10,
    },

    // Optional profile info (shown to candidates)
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    experience: {
      type: String,
      trim: true,
      default: "",
    },

    // ✅ NEW: assigned candidates (DB truth for recruiter dashboard)
    assignedCandidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
      },
    ],

    // Assignment metadata
    lastAssignment: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Helpful compound indexes for admin filtering
RecruiterSchema.index({ status: 1, specialization: 1 });
RecruiterSchema.index({ department: 1 });

// ✅ NEW index for recruiter → candidates lookup
RecruiterSchema.index({ assignedCandidates: 1 });

module.exports = mongoose.model("Recruiter", RecruiterSchema);
