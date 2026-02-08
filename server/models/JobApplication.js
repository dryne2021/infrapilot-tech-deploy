const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    // ✅ Links
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },

    // ✅ FIX: recruiterId should point to Recruiter doc (not User)
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recruiter',
      required: true,
      index: true,
    },

    // Optional stable job ref (frontend uses job.id sometimes)
    jobId: {
      type: String,
      trim: true,
      index: true,
    },

    // ✅ Core job info
    jobTitle: {
      type: String,
      required: [true, 'Please provide job title'],
      trim: true,
      maxlength: [100, 'Job title cannot be more than 100 characters'],
    },

    // ✅ Keep both fields for compatibility
    companyName: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, 'Company cannot be more than 100 characters'],
    },

    // ✅ Canonical job description field (use this everywhere going forward)
    jobDescription: {
      type: String,
      trim: true,
      default: '',
    },

    // ✅ Backward compatible fields (older frontend/code may still send these)
    description: {
      type: String,
      trim: true,
      default: '',
    },
    jobDescriptionFull: {
      type: String,
      default: '',
    },

    jobLink: {
      type: String,
      trim: true,
      default: '',
    },

    // ✅ Resume tracking
    resumeStatus: {
      type: String,
      enum: ['Pending', 'Submitted', 'Reviewed'],
      default: 'Pending',
      index: true,
    },

    // ✅ Store EXACT resume used
    resumeUsed: {
      resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      fileName: { type: String, default: '' },
      fileUrl: { type: String, default: '' },
    },

    // ✅ Resume content tracking (optional)
    resumeText: {
      type: String,
      default: '',
    },

    resumeDocxUrl: {
      type: String,
      default: '',
    },

    // ✅ Canonical status for backend logic
    // (we’ll map frontend labels to this value in pre-save)
    status: {
      type: String,
      enum: ['pending', 'applied', 'interview', 'offer', 'rejected'],
      default: 'pending',
      index: true,
    },

    // ✅ Optional: keep UI label if you want (not required)
    uiStatusLabel: {
      type: String,
      default: '',
    },

    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    salaryRange: {
      type: String,
      trim: true,
      default: '',
    },

    notes: [
      {
        content: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    appliedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { minimize: false }
);

// ✅ Normalize fields for compatibility + consistency
jobApplicationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // company sync
  if (!this.company && this.companyName) this.company = this.companyName;
  if (!this.companyName && this.company) this.companyName = this.company;

  // job description sync (canonical)
  if (!this.jobDescription) {
    this.jobDescription = this.jobDescriptionFull || this.description || '';
  }
  // Keep older fields in sync so older UI still displays something
  if (!this.description && this.jobDescription) this.description = this.jobDescription;
  if (!this.jobDescriptionFull && this.jobDescription) this.jobDescriptionFull = this.jobDescription;

  // appliedDate default
  if (!this.appliedDate) this.appliedDate = new Date();

  // ✅ Map common frontend label statuses → backend canonical
  // If your UI sends "Applied", "Interview", etc, we convert it
  const label = (this.status || '').toString();
  const map = {
    'Applied': 'applied',
    'Under Review': 'pending',
    'Interview': 'interview',
    'Offer': 'offer',
    'Rejected': 'rejected',
  };

  // If someone accidentally set status to a UI label, convert it
  if (map[label]) {
    this.uiStatusLabel = label;
    this.status = map[label];
  }

  next();
});

// ✅ Indexes
jobApplicationSchema.index({ candidateId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, candidateId: 1, appliedDate: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
