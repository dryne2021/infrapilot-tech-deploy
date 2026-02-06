const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobTitle: {
    type: String,
    required: [true, 'Please provide job title'],
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  companyName: {
    type: String,
    required: [true, 'Please provide company name'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  jobLink: {
    type: String,
    required: [true, 'Please provide job link'],
    trim: true
  },
  resumeUsed: {
    fileName: String,
    fileUrl: String
  },
  status: {
    type: String,
    enum: ['pending', 'applied', 'interview', 'rejected', 'offer'],
    default: 'pending'
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  appliedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
jobApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
jobApplicationSchema.index({ candidateId: 1, status: 1 });
jobApplicationSchema.index({ recruiterId: 1, status: 1 });
jobApplicationSchema.index({ status: 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);