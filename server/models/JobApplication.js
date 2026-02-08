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
      ref: 'User',
      required: true,
      index: true,
    },

    // ✅ Frontend uses job.id; backend can store a stable job reference
    // (kept optional so it won't break existing docs)
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

    // ✅ Keep old field (companyName) BUT ALSO support frontend field (company)
    companyName: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters'],
    },
    company: {
      // Frontend uses "company"
      type: String,
      trim: true,
      maxlength: [100, 'Company cannot be more than 100 characters'],
    },

    // ✅ Job details
    description: {
      // Frontend uses job.description
      type: String,
      trim: true,
      default: '',
    },

    // ✅ If you still want job link
    jobLink: {
      type: String,
      trim: true,
      default: '',
    },

    // ✅ Resume tracking
    resumeStatus: {
      // Frontend: Pending/Submitted/Reviewed
      type: String,
      enum: ['Pending', 'Submitted', 'Reviewed'],
      default: 'Pending',
      index: true,
    },

    resumeUsed: {
      // legacy (file upload)
      fileName: String,
      fileUrl: String,
    },

    // ✅ NEW: store the resume text generated (so recruiter & candidate can view)
    resumeText: {
      type: String,
      default: '',
    },

    // ✅ NEW: store generated doc url (optional - if you upload to S3/Cloudinary later)
    resumeDocxUrl: {
      type: String,
      default: '',
    },

    // ✅ NEW: Store job description used for generating the resume (full)
    jobDescriptionFull: {
      type: String,
      default: '',
    },

    // ✅ Scoring + salary fields used by your UI
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

    // ✅ Application status (match frontend labels)
    status: {
      type: String,
      enum: ['Applied', 'Under Review', 'Interview', 'Offer', 'Rejected'],
      default: 'Applied',
      index: true,
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

    // ✅ Dates (frontend uses appliedDate)
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

// ✅ Keep company & companyName consistent for backwards compatibility
jobApplicationSchema.pre('save', function (next) {
  // timestamps
  this.updatedAt = Date.now();

  // sync company fields
  if (!this.company && this.companyName) this.company = this.companyName;
  if (!this.companyName && this.company) this.companyName = this.company;

  // appliedDate default
  if (!this.appliedDate) this.appliedDate = new Date();

  next();
});

// ✅ Indexes for efficient recruiter / candidate queries
jobApplicationSchema.index({ candidateId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, appliedDate: -1 });
jobApplicationSchema.index({ recruiterId: 1, candidateId: 1, appliedDate: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
