// server/controllers/adminController.js

const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Candidate = require("../models/Candidate");
const Recruiter = require("../models/Recruiter");
const ErrorResponse = require("../utils/ErrorResponse");

/* =========================================================
   Helpers
========================================================= */
const planPrices = {
  free: 0,
  silver: 29,
  gold: 79,
  platinum: 149,
  enterprise: 299,
};

const safeHashedPasswordFlag = (candidate) => {
  // Your UI checks: candidate.username && candidate.password
  // But we store passwordHash securely, so we return a safe flag string.
  return candidate?.passwordHash && String(candidate.passwordHash).trim() ? "SET" : "";
};

const relativeTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
};

const buildActivityItem = ({ type, action, user, time }) => {
  // Tailwind-friendly color strings your UI splits: item.color?.split(' ')
  const map = {
    subscription: { icon: "💎", color: "bg-blue-100 text-blue-600" },
    recruiter: { icon: "👔", color: "bg-emerald-100 text-emerald-600" },
    assignment: { icon: "🤝", color: "bg-violet-100 text-violet-600" },
    credentials: { icon: "🔐", color: "bg-amber-100 text-amber-600" },
  };
  const meta = map[type] || { icon: "📌", color: "bg-slate-100 text-slate-600" };

  return {
    action,
    user,
    time: relativeTime(time),
    icon: meta.icon,
    color: meta.color,
    type,
    _rawTime: time, // ✅ used for sorting internally
  };
};

/* =========================================================
   DASHBOARD
   GET /api/v1/admin/dashboard
========================================================= */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCandidates,
      totalRecruiters,
      activeRecruiters,
      activeSubscriptions,
      pendingPayments,
      unassignedCandidates,
      candidatesWithCredentials,
      revenueAgg,
    ] = await Promise.all([
      Candidate.countDocuments(),
      Recruiter.countDocuments(),
      Recruiter.countDocuments({ status: "active" }),
      Candidate.countDocuments({ subscriptionStatus: "active" }),
      Candidate.countDocuments({ paymentStatus: "pending" }),
      Candidate.countDocuments({ assignedRecruiterId: null }),
      Candidate.countDocuments({ username: { $ne: "" }, passwordHash: { $ne: "" } }),
      Candidate.aggregate([{ $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } }]),
    ]);

    const monthlyRevenue = (revenueAgg || []).reduce((sum, row) => {
      const plan = row._id || "free";
      return sum + (planPrices[plan] || 0) * (row.count || 0);
    }, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        activeSubscriptions,
        pendingPayments,
        monthlyRevenue,
        totalRecruiters,
        activeRecruiters,
        unassignedCandidates,
        candidatesWithCredentials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ACTIVITY (for Admin dashboard UI)
   GET /api/v1/admin/activity
========================================================= */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const [recentCandidates, recentRecruiters, recentAssignments, recentCredentials] =
      await Promise.all([
        Candidate.find().sort({ createdAt: -1 }).limit(5).lean(),
        Recruiter.find().sort({ updatedAt: -1 }).limit(5).lean(),
        Candidate.find({ assignedRecruiterId: { $ne: null } })
          .sort({ assignedDate: -1 })
          .limit(5)
          .populate("assignedRecruiterId", "name email")
          .lean(),
        Candidate.find({ username: { $ne: "" }, passwordHash: { $ne: "" } })
          .sort({ credentialsGenerated: -1 })
          .limit(5)
          .lean(),
      ]);

    const activity = [];

    recentCandidates.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "subscription",
          action: `New ${c.subscriptionPlan || "free"} subscription`,
          user: c.fullName || c.email || "Candidate",
          time: c.createdAt,
        })
      );
    });

    recentRecruiters.forEach((r) => {
      activity.push(
        buildActivityItem({
          type: "recruiter",
          action: `Recruiter ${r.status === "active" ? "activated" : "updated"}`,
          user: r.name || r.email || "Recruiter",
          time: r.updatedAt || r.createdAt,
        })
      );
    });

    recentAssignments.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "assignment",
          action: "Candidate assigned",
          user: `${c.fullName || c.email || "Candidate"} → ${c.assignedRecruiterId?.name || "Recruiter"}`,
          time: c.assignedDate || c.updatedAt || c.createdAt,
        })
      );
    });

    recentCredentials.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "credentials",
          action: "Login credentials created",
          user: c.fullName || c.email || "Candidate",
          time: c.credentialsGenerated || c.updatedAt || c.createdAt,
        })
      );
    });

    // Sort by timestamps desc
    const sorted = activity.sort((a, b) => {
      const at = a._rawTime ? new Date(a._rawTime).getTime() : 0;
      const bt = b._rawTime ? new Date(b._rawTime).getTime() : 0;
      return bt - at;
    });

    // Return only fields your UI needs
    const clean = sorted.slice(0, 10).map(({ _rawTime, ...rest }) => rest);

    return res.status(200).json(clean);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CANDIDATES
   GET /api/v1/admin/candidates   -> returns ARRAY (UI expects array)
   POST /api/v1/admin/candidates
   PUT /api/v1/admin/candidates/:id
   DELETE /api/v1/admin/candidates/:id
========================================================= */
exports.getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .populate("assignedRecruiterId", "name email department specialization status maxCandidates")
      .lean();

    const mapped = candidates.map((c) => ({
      ...c,

      // UI expects these keys:
      assignedRecruiter: c.assignedRecruiterId?._id || c.assignedRecruiterId || null,
      recruiterName: c.assignedRecruiterId?.name || "",

      // UI checks username && password. Do NOT expose passwordHash.
      password: safeHashedPasswordFlag(c),
    }));

    // IMPORTANT: return raw array for your AdminPage usage: candidates.filter(...)
    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

exports.createCandidate = async (req, res, next) => {
  try {
    const created = await Candidate.create(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.updateCandidate = async (req, res, next) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return next(new ErrorResponse("Candidate not found", 404));

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    await candidate.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   RECRUITERS
   GET /api/v1/admin/recruiters   -> returns ARRAY (UI expects array)
   POST /api/v1/admin/recruiters
   PUT /api/v1/admin/recruiters/:id
   DELETE /api/v1/admin/recruiters/:id
========================================================= */
exports.getRecruiters = async (req, res, next) => {
  try {
    const recruiters = await Recruiter.find().sort({ createdAt: -1 }).lean();

    const recruiterIds = recruiters.map((r) => r._id);
    const counts = await Candidate.aggregate([
      { $match: { assignedRecruiterId: { $in: recruiterIds } } },
      { $group: { _id: "$assignedRecruiterId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((x) => [String(x._id), x.count]));

    const mapped = recruiters.map((r) => ({
      ...r,
      assignedCandidatesCount: countMap.get(String(r._id)) || 0,
    }));

    // IMPORTANT: return raw array for your AdminPage usage: recruiters.filter(...)
    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

exports.createRecruiter = async (req, res, next) => {
  try {
    const created = await Recruiter.create(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.updateRecruiter = async (req, res, next) => {
  try {
    const updated = await Recruiter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return next(new ErrorResponse("Recruiter not found", 404));

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    await Candidate.updateMany(
      { assignedRecruiterId: recruiter._id },
      { $set: { assignedRecruiterId: null, recruiterStatus: "", assignedDate: null } }
    );

    await recruiter.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGNMENTS
   PUT  /api/v1/admin/assignments
   POST /api/v1/admin/assignments/bulk
   POST /api/v1/admin/assignments/auto-assign
========================================================= */
exports.assignCandidate = async (req, res, next) => {
  try {
    const { candidateId, recruiterId } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    // Unassign
    if (!recruiterId) {
      candidate.assignedRecruiterId = null;
      candidate.recruiterStatus = "";
      candidate.assignedDate = null;
      await candidate.save();
      return res.status(200).json({ success: true, data: candidate });
    }

    const recruiter = await Recruiter.findById(recruiterId);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    if (recruiter.status !== "active") {
      return next(new ErrorResponse("Recruiter is not active", 400));
    }

    const assignedCount = await Candidate.countDocuments({ assignedRecruiterId: recruiter._id });
    if (assignedCount >= (recruiter.maxCandidates || 10)) {
      return next(new ErrorResponse("Recruiter is at full capacity", 400));
    }

    candidate.assignedRecruiterId = recruiter._id;
    candidate.recruiterStatus = "new";
    candidate.assignedDate = new Date();
    await candidate.save();

    recruiter.lastAssignment = new Date();
    await recruiter.save();

    return res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignCandidates = async (req, res, next) => {
  try {
    const { candidateIds, recruiterId } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return next(new ErrorResponse("candidateIds must be a non-empty array", 400));
    }

    const recruiter = await Recruiter.findById(recruiterId);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (recruiter.status !== "active") return next(new ErrorResponse("Recruiter is not active", 400));

    const assignedCount = await Candidate.countDocuments({ assignedRecruiterId: recruiter._id });
    const capacity = recruiter.maxCandidates || 10;
    const remaining = Math.max(0, capacity - assignedCount);

    if (remaining <= 0) return next(new ErrorResponse("Recruiter is at full capacity", 400));

    const toAssign = candidateIds.slice(0, remaining);

    await Candidate.updateMany(
      { _id: { $in: toAssign } },
      { $set: { assignedRecruiterId: recruiter._id, recruiterStatus: "new", assignedDate: new Date() } }
    );

    recruiter.lastAssignment = new Date();
    await recruiter.save();

    return res.status(200).json({
      success: true,
      data: { assigned: toAssign.length, skipped: candidateIds.length - toAssign.length },
    });
  } catch (error) {
    next(error);
  }
};

exports.autoAssignCandidates = async (req, res, next) => {
  try {
    const activeRecruiters = await Recruiter.find({ status: "active" }).sort({ createdAt: 1 }).lean();
    if (activeRecruiters.length === 0) return next(new ErrorResponse("No active recruiters available", 400));

    const unassigned = await Candidate.find({ assignedRecruiterId: null }).sort({ createdAt: 1 }).lean();
    if (unassigned.length === 0) {
      return res
        .status(200)
        .json({ success: true, data: { assigned: 0, message: "No unassigned candidates" } });
    }

    const recruiterIds = activeRecruiters.map((r) => r._id);
    const countsAgg = await Candidate.aggregate([
      { $match: { assignedRecruiterId: { $in: recruiterIds } } },
      { $group: { _id: "$assignedRecruiterId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(countsAgg.map((x) => [String(x._id), x.count]));

    let assignedTotal = 0;
    let rrIndex = 0;

    for (const cand of unassigned) {
      let tries = 0;
      let assigned = false;

      while (tries < activeRecruiters.length && !assigned) {
        const recruiter = activeRecruiters[rrIndex];
        rrIndex = (rrIndex + 1) % activeRecruiters.length;
        tries++;

        const currentCount = countMap.get(String(recruiter._id)) || 0;
        const cap = recruiter.maxCandidates || 10;

        if (currentCount < cap) {
          await Candidate.updateOne(
            { _id: cand._id },
            { $set: { assignedRecruiterId: recruiter._id, recruiterStatus: "new", assignedDate: new Date() } }
          );
          countMap.set(String(recruiter._id), currentCount + 1);
          assignedTotal++;
          assigned = true;

          await Recruiter.updateOne({ _id: recruiter._id }, { $set: { lastAssignment: new Date() } });
        }
      }

      if (!assigned) break;
    }

    return res.status(200).json({ success: true, data: { assigned: assignedTotal } });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CREDENTIALS
   POST   /api/v1/admin/credentials
   DELETE /api/v1/admin/credentials/:candidateId
========================================================= */
exports.setCandidateCredentials = async (req, res, next) => {
  try {
    const { candidateId, username, password } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));
    if (!username || !username.trim()) return next(new ErrorResponse("username is required", 400));

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    const taken = await Candidate.findOne({ username: username.trim(), _id: { $ne: candidateId } });
    if (taken) return next(new ErrorResponse("Username already taken", 400));

    candidate.username = username.trim();

    if (password && password.length > 0) {
      if (password.length < 8) return next(new ErrorResponse("Password must be at least 8 characters", 400));
      const salt = await bcrypt.genSalt(10);
      candidate.passwordHash = await bcrypt.hash(password, salt);
      candidate.credentialsGenerated = new Date();
      candidate.credentialsUpdatedBy = "admin";
    }

    await candidate.save();

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate._id,
        username: candidate.username,
        credentialsGenerated: candidate.credentialsGenerated,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.resetCandidateCredentials = async (req, res, next) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    candidate.username = "";
    candidate.passwordHash = "";
    candidate.credentialsGenerated = null;
    candidate.credentialsUpdatedBy = "admin";

    await candidate.save();

    return res.status(200).json({ success: true, data: { candidateId: candidate._id } });
  } catch (error) {
    next(error);
  }
};
