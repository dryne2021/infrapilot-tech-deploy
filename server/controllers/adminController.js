// server/controllers/adminController.js

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

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

// ✅ Legacy helper (Candidate.passwordHash was old approach)
const safeHashedPasswordFlag = (candidate) => {
  return candidate?.passwordHash && String(candidate.passwordHash).trim() ? "SET" : "";
};

const relativeTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffMs / 60 / 1000);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
};

const buildActivityItem = ({ type, action, user, time }) => {
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
    _rawTime: time,
  };
};

// ✅ helper to make a random password (for reset flows)
const generateRandomPassword = (len = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
};

// ✅ detect whether User schema supports "username" (your current User.js may not)
const userSupportsUsername = () => {
  try {
    return !!User?.schema?.path("username");
  } catch {
    return false;
  }
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

      // We count credentialed candidates by username+passwordHash existence.
      Candidate.countDocuments({
        username: { $exists: true, $ne: "" },
        passwordHash: { $exists: true, $ne: "" },
      }),

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
   ACTIVITY
   GET /api/v1/admin/activity
========================================================= */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const [recentCandidates, recentRecruiters, recentAssignments, recentCredentialCandidates] =
      await Promise.all([
        Candidate.find().sort({ createdAt: -1 }).limit(5).lean(),
        Recruiter.find().sort({ updatedAt: -1 }).limit(5).lean(),
        Candidate.find({ assignedRecruiterId: { $ne: null } })
          .sort({ assignedDate: -1 })
          .limit(5)
          .populate("assignedRecruiterId", "name email")
          .lean(),
        Candidate.find({ credentialsGenerated: { $ne: null } })
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
          user: `${c.fullName || c.email || "Candidate"} → ${
            c.assignedRecruiterId?.name || "Recruiter"
          }`,
          time: c.assignedDate || c.updatedAt || c.createdAt,
        })
      );
    });

    recentCredentialCandidates.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "credentials",
          action: "Login credentials created",
          user: c.fullName || c.email || "Candidate",
          time: c.credentialsGenerated || c.updatedAt || c.createdAt,
        })
      );
    });

    const sorted = activity.sort((a, b) => {
      const at = a._rawTime ? new Date(a._rawTime).getTime() : 0;
      const bt = b._rawTime ? new Date(b._rawTime).getTime() : 0;
      return bt - at;
    });

    const clean = sorted.slice(0, 10).map(({ _rawTime, ...rest }) => rest);

    return res.status(200).json(clean);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CANDIDATES
========================================================= */
exports.getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .populate("assignedRecruiterId", "name email department specialization status maxCandidates")
      .lean();

    const userIds = candidates.map((c) => c.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select("username role").lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const mapped = candidates.map((c) => {
      const u = userMap.get(String(c.userId));

      // ✅ We do NOT rely on passwordHash being returned (it may be select:false).
      // Use credentialsGenerated OR username as the canonical UI flag.
      const credsFlag = !!c.credentialsGenerated || (!!c.username && String(c.username).trim().length > 0);

      return {
        ...c,
        assignedRecruiter: c.assignedRecruiterId?._id || c.assignedRecruiterId || null,
        recruiterName: c.assignedRecruiterId?.name || "",
        credentialsGenerated: credsFlag, // ✅ makes UI badge reliable
        password: credsFlag ? "SET" : (u?.username ? "SET" : safeHashedPasswordFlag(c)),
        username: u?.username || c.username || "",
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

// ✅ createCandidate - FIXED EXPERIENCE VALIDATION
exports.createCandidate = async (req, res, next) => {
  try {
    console.log("📥 [ADMIN] createCandidate payload:", req.body);

    const body = req.body || {};
    const emailNorm = String(body.email || "").trim().toLowerCase();

    const fullNameNorm =
      String(body.fullName || "").trim() ||
      `${String(body.firstName || "").trim()} ${String(body.lastName || "").trim()}`.trim();

    if (!emailNorm) return next(new ErrorResponse("Email is required", 400));

    // ✅ FIX 1: Validate experience BEFORE creating user
    const experience = Array.isArray(body.experience) ? body.experience : [];
    
    // Check if at least one experience exists
    if (experience.length === 0) {
      return next(new ErrorResponse("At least one experience entry is required", 400));
    }

    // Validate each experience entry
    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      const company = String(exp?.company || "").trim();
      const title = String(exp?.title || "").trim();
      const startDate = String(exp?.startDate || "").trim();
      
      if (!company || !title || !startDate) {
        return next(new ErrorResponse(
          `Experience ${i + 1} must have company, title, and start date`, 
          400
        ));
      }
    }

    let user = await User.findOne({ email: emailNorm });

    if (!user) {
      const tempPassword = "Tmp@" + Math.random().toString(36).slice(2, 10) + "9!";
      user = await User.create({
        name: fullNameNorm || "Candidate",
        email: emailNorm,
        password: tempPassword,
        role: "candidate",
        status: "active",
      });
    } else {
      if (user.role && user.role !== "candidate") {
        return next(
          new ErrorResponse(`Email already belongs to a non-candidate user (${user.role}).`, 400)
        );
      }
    }

    const existingCandidate = await Candidate.findOne({ userId: user._id });
    if (existingCandidate) {
      return next(
        new ErrorResponse("Candidate profile already exists for this email. Use update.", 400)
      );
    }

    const payload = {
      ...body,
      userId: user._id,
      email: emailNorm,
      fullName: fullNameNorm,
    };

    // ✅ FIX 2: Remove the education validation (it's checking wrong thing)
    // Just ensure education is an array
    if (!Array.isArray(payload.education)) {
      payload.education = [];
    }

    // ✅ FIX 3: Ensure experience array is properly formatted
    payload.experience = experience.map((exp, index) => ({
      ...exp,
      // Ensure required fields are strings
      company: String(exp.company || "").trim() || `Company ${index + 1}`,
      title: String(exp.title || "").trim() || `Title ${index + 1}`,
      startDate: String(exp.startDate || "").trim(),
      endDate: String(exp.endDate || "").trim(),
      location: String(exp.location || "").trim(),
      description: String(exp.description || "").trim(),
      achievements: Array.isArray(exp.achievements) 
        ? exp.achievements.map(a => String(a || "").trim()).filter(Boolean)
        : [],
      technologies: Array.isArray(exp.technologies)
        ? exp.technologies.map(t => String(t || "").trim()).filter(Boolean)
        : [],
      currentlyWorking: Boolean(exp.currentlyWorking || false),
    }));

    const incomingAssignedRecruiter = body.assignedRecruiter;

    payload.assignedRecruiter = null;
    payload.assignedRecruiterId = null;
    payload.recruiterStatus = "";
    payload.assignedDate = null;

    if (incomingAssignedRecruiter) {
      if (mongoose.Types.ObjectId.isValid(incomingAssignedRecruiter)) {
        const recruiter = await Recruiter.findById(incomingAssignedRecruiter).select(
          "_id userId status isActive"
        );
        if (!recruiter) return next(new ErrorResponse("Recruiter not found for assignedRecruiter", 404));

        const recruiterActive = recruiter.status === "active" || recruiter.isActive === true;
        if (!recruiterActive) return next(new ErrorResponse("Recruiter is not active", 400));

        payload.assignedRecruiter = recruiter._id;
        payload.assignedRecruiterId = recruiter.userId || null;
        payload.recruiterStatus = "new";
        payload.assignedDate = new Date();
      } else {
        const maybeEmail = String(incomingAssignedRecruiter).trim().toLowerCase();
        const recruiter = await Recruiter.findOne({ email: maybeEmail }).select(
          "_id userId status isActive"
        );

        if (recruiter) {
          const recruiterActive = recruiter.status === "active" || recruiter.isActive === true;
          if (!recruiterActive) return next(new ErrorResponse("Recruiter is not active", 400));

          payload.assignedRecruiter = recruiter._id;
          payload.assignedRecruiterId = recruiter.userId || null;
          payload.recruiterStatus = "new";
          payload.assignedDate = new Date();
        } else {
          console.warn("⚠️ [ADMIN] invalid assignedRecruiter, ignoring:", incomingAssignedRecruiter);
        }
      }
    }

    const mergedSkills = []
      .concat(payload.skills || [])
      .concat(payload.technicalSkills || [])
      .concat(payload.softSkills || [])
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);

    if (mergedSkills.length) payload.skills = Array.from(new Set(mergedSkills));

    if (!payload.workHistory && Array.isArray(payload.experience)) {
      payload.workHistory = payload.experience.map((x) => ({
        company: String(x.company || "").trim() || "Not Provided",
        title: String(x.title || "").trim() || "Not Provided",
        startDate: String(x.startDate || "").trim(),
        endDate: String(x.endDate || "").trim(),
        location: String(x.location || "").trim(),
        bullets: Array.isArray(x.achievements)
          ? x.achievements.map((b) => String(b || "").trim()).filter(Boolean)
          : [],
      }));
    }

    const created = await Candidate.create(payload);

    console.log(`✅ [ADMIN] candidate saved: ${created._id} email=${created.email}`);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("❌ [ADMIN] createCandidate error:", error);
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

    if (candidate.userId) {
      await User.findByIdAndDelete(candidate.userId);
    }

    await candidate.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   RECRUITERS
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

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ createRecruiter
 * - DO NOT hash password here (User model hashes in pre('save'))
 */
exports.createRecruiter = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      username,
      password,
      department,
      specialization,
      maxCandidates,
      isActive,
    } = req.body;

    if (!firstName || !email || !username || !password) {
      return next(new ErrorResponse("firstName, email, username, and password are required", 400));
    }

    const emailNorm = String(email).trim().toLowerCase();
    const usernameNorm = String(username).trim();

    const existing = await User.findOne({
      $or: [{ email: emailNorm }, { username: usernameNorm }],
    });
    if (existing) return next(new ErrorResponse("Email or username already exists", 400));

    const createdUser = await User.create({
      name: `${firstName} ${lastName || ""}`.trim(),
      email: emailNorm,
      username: usernameNorm,
      password,
      role: "recruiter",
      status: isActive === false ? "inactive" : "active",
    });

    const createdRecruiter = await Recruiter.create({
      userId: createdUser._id,
      name: createdUser.name,
      email: emailNorm,
      phone: phone || "",
      department: department || "Technical",
      specialization: specialization || "IT/Software",
      maxCandidates: Number(maxCandidates || 20),
      status: isActive === false ? "inactive" : "active",
      isActive: isActive !== false,
      assignedCandidates: [],
      lastAssignment: null,
    });

    return res.status(201).json({
      success: true,
      data: {
        ...createdRecruiter.toObject(),
        username: createdUser.username,
        password: "SET",
      },
    });
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
      { $set: { assignedRecruiterId: null, assignedRecruiter: null, recruiterStatus: "", assignedDate: null } }
    );

    if (recruiter.userId) await User.findByIdAndDelete(recruiter.userId);

    await recruiter.deleteOne();
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGNMENTS (OLD FLOW)
========================================================= */
exports.assignCandidate = async (req, res, next) => {
  try {
    const { candidateId, recruiterId } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (!recruiterId) {
      candidate.assignedRecruiterId = null;
      candidate.assignedRecruiter = null;
      candidate.recruiterStatus = "";
      candidate.assignedDate = null;
      await candidate.save();
      return res.status(200).json({ success: true, data: candidate });
    }

    const recruiter = await Recruiter.findById(recruiterId);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (recruiter.status !== "active") return next(new ErrorResponse("Recruiter is not active", 400));

    const assignedCount = await Candidate.countDocuments({ assignedRecruiterId: recruiter._id });
    if (assignedCount >= (recruiter.maxCandidates || 10)) {
      return next(new ErrorResponse("Recruiter is at full capacity", 400));
    }

    candidate.assignedRecruiterId = recruiter._id;
    candidate.assignedRecruiter = recruiter._id;
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
      {
        $set: {
          assignedRecruiterId: recruiter._id,
          assignedRecruiter: recruiter._id,
          recruiterStatus: "new",
          assignedDate: new Date(),
        },
      }
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
    if (activeRecruiters.length === 0)
      return next(new ErrorResponse("No active recruiters available", 400));

    const unassigned = await Candidate.find({ assignedRecruiterId: null }).sort({ createdAt: 1 }).lean();
    if (unassigned.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assigned: 0, message: "No unassigned candidates" },
      });
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
            {
              $set: {
                assignedRecruiterId: recruiter._id,
                assignedRecruiter: recruiter._id,
                recruiterStatus: "new",
                assignedDate: new Date(),
              },
            }
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
   CREDENTIALS (✅ FIXED FOR YOUR UI)
   POST /api/v1/admin/candidates/:id/credentials
   body: { username, password }
========================================================= */
exports.setCandidateCredentials = async (req, res, next) => {
  try {
    const candidateId = req.params.id; // ✅ FIX: comes from URL param
    const { username, password } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const usernameNorm = String(username || "").trim().toLowerCase();
    if (!usernameNorm) return next(new ErrorResponse("username is required", 400));

    const pw = String(password || "");
    if (!pw || pw.length < 6) {
      return next(new ErrorResponse("password must be at least 6 characters", 400));
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));
    if (!candidate.userId) return next(new ErrorResponse("Candidate userId missing", 400));

    // ✅ enforce unique username on Candidate collection
    const takenCandidate = await Candidate.findOne({
      username: usernameNorm,
      _id: { $ne: candidateId },
    }).lean();
    if (takenCandidate) return next(new ErrorResponse("Username already taken", 400));

    // ✅ update Candidate creds (username + passwordHash)
    const salt = await bcrypt.genSalt(10);
    candidate.username = usernameNorm;
    candidate.passwordHash = await bcrypt.hash(pw, salt);
    candidate.credentialsGenerated = new Date();
    candidate.credentialsUpdatedBy = String(req.user?._id || "admin");
    await candidate.save();

    // ✅ also set linked User password so login-by-email works reliably
    const user = await User.findById(candidate.userId).select("+password");
    if (!user) return next(new ErrorResponse("Candidate user not found", 404));

    // Only set username on User if schema supports it
    if (userSupportsUsername()) {
      const existingU = await User.findOne({
        username: usernameNorm,
        _id: { $ne: user._id },
      }).lean();
      if (existingU) return next(new ErrorResponse("Username already taken", 400));
      user.username = usernameNorm;
    }

    // IMPORTANT: assign plaintext password to User model so it hashes in pre('save')
    user.password = pw;
    user.role = user.role || "candidate";
    user.status = "active";
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate._id,
        userId: user._id,
        email: user.email,
        username: usernameNorm,
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
    if (!candidate.userId) return next(new ErrorResponse("Candidate userId missing", 400));

    const user = await User.findById(candidate.userId).select("+password");
    if (!user) return next(new ErrorResponse("Candidate user not found", 404));

    candidate.username = "";
    candidate.passwordHash = "";
    candidate.credentialsGenerated = null;
    candidate.credentialsUpdatedBy = String(req.user?._id || "admin");
    await candidate.save();

    const tempPassword = generateRandomPassword(10);
    user.password = tempPassword;
    if (userSupportsUsername()) user.username = "";
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate._id,
        userId: user._id,
        email: user.email,
        tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ADMIN RESET USER PASSWORD
   POST /api/v1/admin/users/reset-password
========================================================= */
exports.adminResetUserPassword = async (req, res, next) => {
  try {
    const emailNorm = String(req.body.email || "").trim().toLowerCase();
    const newPassword = String(req.body.newPassword || "");

    if (!emailNorm || !newPassword) {
      return next(new ErrorResponse("email and newPassword are required", 400));
    }
    if (newPassword.length < 6) {
      return next(new ErrorResponse("newPassword must be at least 6 characters", 400));
    }

    const user = await User.findOne({ email: emailNorm }).select("+password");
    if (!user) return next(new ErrorResponse("User not found", 404));

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: { email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UNASSIGNED CANDIDATES
   GET /api/v1/admin/candidates/unassigned
========================================================= */
exports.getUnassignedCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({
      assignedRecruiterId: null,
      assignedRecruiter: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET CANDIDATES FOR A RECRUITER
   GET /api/v1/admin/recruiters/:id/candidates
========================================================= */
exports.getRecruiterCandidates = async (req, res, next) => {
  try {
    const recruiterId = req.params.id;

    const recruiter = await Recruiter.findById(recruiterId).lean();
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    const candidates = await Candidate.find({ assignedRecruiter: recruiterId })
      .sort({ assignedDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json(candidates);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGN CANDIDATE TO RECRUITER (TRANSACTION)
   POST /api/v1/admin/recruiters/:id/assign
========================================================= */
exports.assignCandidateToRecruiter = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const recruiterId = req.params.id;
    const { candidateId } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const recruiter = await Recruiter.findById(recruiterId).session(session);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    const recruiterActive = recruiter.status === "active" || recruiter.isActive === true;
    if (!recruiterActive) return next(new ErrorResponse("Recruiter is not active", 400));

    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (candidate.assignedRecruiter && String(candidate.assignedRecruiter) !== String(recruiterId)) {
      return next(new ErrorResponse("Candidate already assigned to another recruiter", 400));
    }

    const currentCount = Array.isArray(recruiter.assignedCandidates)
      ? recruiter.assignedCandidates.length
      : 0;
    const capacity = recruiter.maxCandidates || 10;
    if (currentCount >= capacity) return next(new ErrorResponse("Recruiter is at full capacity", 400));

    candidate.assignedRecruiterId = recruiter._id;
    candidate.assignedRecruiter = recruiter._id;
    candidate.recruiterStatus = "new";
    candidate.assignedDate = new Date();
    await candidate.save({ session });

    const alreadyIn = recruiter.assignedCandidates?.some((id) => String(id) === String(candidate._id));
    if (!alreadyIn) recruiter.assignedCandidates.push(candidate._id);

    recruiter.lastAssignment = new Date();
    await recruiter.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      data: { candidateId: candidate._id, recruiterId: recruiter._id },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/* =========================================================
   UNASSIGN CANDIDATE FROM RECRUITER (TRANSACTION)
   POST /api/v1/admin/recruiters/:id/unassign
========================================================= */
exports.unassignCandidateFromRecruiter = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const recruiterId = req.params.id;
    const { candidateId } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const recruiter = await Recruiter.findById(recruiterId).session(session);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (String(candidate.assignedRecruiter || "") !== String(recruiterId)) {
      return next(new ErrorResponse("Candidate is not assigned to this recruiter", 400));
    }

    candidate.assignedRecruiterId = null;
    candidate.assignedRecruiter = null;
    candidate.recruiterStatus = "";
    candidate.assignedDate = null;
    await candidate.save({ session });

    recruiter.assignedCandidates = (recruiter.assignedCandidates || []).filter(
      (id) => String(id) !== String(candidate._id)
    );
    await recruiter.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      data: { candidateId: candidate._id, recruiterId },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/* =========================================================
   RESET RECRUITER PASSWORD (ADMIN ONLY)
   POST /api/v1/admin/recruiters/:id/reset-password
========================================================= */
exports.resetRecruiterPassword = async (req, res, next) => {
  try {
    const recruiterId = req.params.id;

    const recruiter = await Recruiter.findById(recruiterId);
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (!recruiter.userId) return next(new ErrorResponse("Recruiter user account missing", 400));

    const user = await User.findById(recruiter.userId).select("+password");
    if (!user) return next(new ErrorResponse("Recruiter user not found", 404));

    const newPassword = generateRandomPassword(10);

    user.password = newPassword;
    await user.save();

    recruiter.status = "active";
    recruiter.isActive = true;
    await recruiter.save();

    return res.status(200).json({ success: true, newPassword });
  } catch (error) {
    next(error);
  }
};