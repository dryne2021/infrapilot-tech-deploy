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

    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recruiter',
      required: true,
      index: true,
    },

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

    jobDescription: {
      type: String,
      trim: true,
      default: '',
    },

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

    // 🔥 Primary resume download source
    resumeUsed: {
      resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      fileName: { type: String, default: '' },
      fileUrl: { type: String, default: '' }, // <-- This is what frontend will use
    },

    resumeText: {
      type: String,
      default: '',
    },

    // Backward compatibility
    resumeDocxUrl: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['pending', 'applied', 'interview', 'offer', 'rejected'],
      default: 'pending',
      index: true,
    },

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

jobApplicationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // company sync
  if (!this.company && this.companyName) this.company = this.companyName;
  if (!this.companyName && this.company) this.companyName = this.company;

  // job description sync
  if (!this.jobDescription) {
    this.jobDescription = this.jobDescriptionFull || this.description || '';
  }

  if (!this.description && this.jobDescription)
    this.description = this.jobDescription;

  if (!this.jobDescriptionFull && this.jobDescription)
    this.jobDescriptionFull = this.jobDescription;

  // resume sync (🔥 important)
  if (!this.resumeUsed.fileUrl && this.resumeDocxUrl) {
    this.resumeUsed.fileUrl = this.resumeDocxUrl;
  }

  if (!this.resumeDocxUrl && this.resumeUsed.fileUrl) {
    this.resumeDocxUrl = this.resumeUsed.fileUrl;
  }

  const label = (this.status || '').toString();
  const map = {
    Applied: 'applied',
    'Under Review': 'pending',
    Interview: 'interview',
    Offer: 'offer',
    Rejected: 'rejected',
  };

  if (map[label]) {
    this.uiStatusLabel = label;
    this.status = map[label];
  }

  next();
});

jobApplicationSchema.index({ candidateId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, candidateId: 1, appliedDate: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
