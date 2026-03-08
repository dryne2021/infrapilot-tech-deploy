const mongoose = require("mongoose");

const ResumeLogSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Recruiter"
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate"
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ResumeLog", ResumeLogSchema);