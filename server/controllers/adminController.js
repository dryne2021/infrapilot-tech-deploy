// server/controllers/adminController.js

const bcrypt = require("bcryptjs");
const pool = require("../config/db");
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

// ✅ Safe user query helper - PostgreSQL version
const safeFindUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  
  const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
  const query = `
    SELECT id, username, role, email 
    FROM users 
    WHERE id IN (${placeholders})
  `;
  
  const result = await pool.query(query, userIds);
  return result.rows;
};

// ✅ Safe user finder - get a single user by ID
const safeFindUserById = async (userId, selectFields = "") => {
  if (!userId) return null;
  
  let query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  
  return result.rows[0] || null;
};

// ✅ Safe user finder with password - for credential operations
const safeFindUserWithPassword = async (userId) => {
  if (!userId) return null;
  
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  
  return result.rows[0] || null;
};

// ✅ Safe user delete
const safeDeleteUser = async (userId) => {
  if (!userId) return null;
  
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn(`Could not delete user ${userId}:`, error.message);
    return null;
  }
};

// ✅ Legacy helper (Candidate.password_hash was old approach)
const safeHashedPasswordFlag = (candidate) => {
  return candidate?.password_hash && String(candidate.password_hash).trim() ? "SET" : "";
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

// ✅ Helper to ensure user account exists
const ensureUserAccount = async ({ email, name, role }) => {
  const emailNorm = String(email).trim().toLowerCase();

  // Check if user exists
  const existing = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [emailNorm]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  // Create default password
  const tempPassword = "Temp@" + Math.random().toString(36).slice(2, 10) + "9!";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(tempPassword, salt);

  const created = await pool.query(
    `INSERT INTO users (name,email,password,role,status,created_at,updated_at)
     VALUES ($1,$2,$3,$4,'active',NOW(),NOW())
     RETURNING *`,
    [name || emailNorm, emailNorm, hashedPassword, role]
  );

  return created.rows[0];
};

/* =========================================================
   DASHBOARD
   GET /api/v1/admin/dashboard
========================================================= */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCandidatesResult,
      totalRecruitersResult,
      activeRecruitersResult,
      activeSubscriptionsResult,
      pendingPaymentsResult,
      unassignedCandidatesResult,
      candidatesWithCredentialsResult,
      revenueResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM candidates'),
      pool.query('SELECT COUNT(*) FROM recruiters'),
      pool.query("SELECT COUNT(*) FROM recruiters WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM candidates WHERE subscription_status = 'active'"),
      pool.query("SELECT COUNT(*) FROM candidates WHERE payment_status = 'pending'"),
      pool.query('SELECT COUNT(*) FROM candidates WHERE assigned_recruiter_id IS NULL'),
      pool.query(`
        SELECT COUNT(*) FROM candidates 
        WHERE username IS NOT NULL AND username != '' 
        AND password_hash IS NOT NULL AND password_hash != ''
      `),
      pool.query(`
        SELECT subscription_plan, COUNT(*) as count 
        FROM candidates 
        GROUP BY subscription_plan
      `),
    ]);

    const totalCandidates = parseInt(totalCandidatesResult.rows[0].count);
    const totalRecruiters = parseInt(totalRecruitersResult.rows[0].count);
    const activeRecruiters = parseInt(activeRecruitersResult.rows[0].count);
    const activeSubscriptions = parseInt(activeSubscriptionsResult.rows[0].count);
    const pendingPayments = parseInt(pendingPaymentsResult.rows[0].count);
    const unassignedCandidates = parseInt(unassignedCandidatesResult.rows[0].count);
    const candidatesWithCredentials = parseInt(candidatesWithCredentialsResult.rows[0].count);

    const monthlyRevenue = (revenueResult.rows || []).reduce((sum, row) => {
      const plan = row.subscription_plan || "free";
      return sum + (planPrices[plan] || 0) * parseInt(row.count || 0);
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
    const [recentCandidatesResult, recentRecruitersResult, recentAssignmentsResult, recentCredentialCandidatesResult] =
      await Promise.all([
        pool.query(`
          SELECT * FROM candidates 
          ORDER BY created_at DESC 
          LIMIT 5
        `),
        pool.query(`
          SELECT * FROM recruiters 
          ORDER BY updated_at DESC 
          LIMIT 5
        `),
        pool.query(`
          SELECT c.*, COALESCE(r.name, r.email) as recruiter_name, r.email as recruiter_email
          FROM candidates c
          LEFT JOIN recruiters r ON c.assigned_recruiter_id = r.id
          WHERE c.assigned_recruiter_id IS NOT NULL
          ORDER BY c.assigned_date DESC 
          LIMIT 5
        `),
        pool.query(`
          SELECT * FROM candidates 
          WHERE credentials_generated IS NOT NULL
          ORDER BY credentials_generated DESC 
          LIMIT 5
        `),
      ]);

    const activity = [];

    recentCandidatesResult.rows.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "subscription",
          action: `New ${c.subscription_plan || "free"} subscription`,
          user: c.full_name || c.email || "Candidate",
          time: c.created_at,
        })
      );
    });

    recentRecruitersResult.rows.forEach((r) => {
      activity.push(
        buildActivityItem({
          type: "recruiter",
          action: `Recruiter ${r.status === "active" ? "activated" : "updated"}`,
          user: r.name || r.email || "Recruiter",
          time: r.updated_at || r.created_at,
        })
      );
    });

    recentAssignmentsResult.rows.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "assignment",
          action: "Candidate assigned",
          user: `${c.full_name || c.email || "Candidate"} → ${
            c.recruiter_name || "Recruiter"
          }`,
          time: c.assigned_date || c.updated_at || c.created_at,
        })
      );
    });

    recentCredentialCandidatesResult.rows.forEach((c) => {
      activity.push(
        buildActivityItem({
          type: "credentials",
          action: "Login credentials created",
          user: c.full_name || c.email || "Candidate",
          time: c.credentials_generated || c.updated_at || c.created_at,
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
    const candidatesResult = await pool.query(`
      SELECT 
        c.*, 
        r.email as recruiter_email,
        r.department,
        r.specialization,
        r.status as recruiter_status,
        r.max_candidates,
        COALESCE(r.name, r.email) as recruiter_name
      FROM candidates c
      LEFT JOIN recruiters r 
      ON c.assigned_recruiter_id = r.id
      ORDER BY c.created_at DESC
    `);

    const candidates = candidatesResult.rows;
    const userIds = candidates.map((c) => c.user_id).filter(Boolean);
    
    // ✅ Use safe query helper
    let users = [];

if (userIds.length > 0) {
  users = await safeFindUsers(userIds);
}
    const userMap = new Map(users.map((u) => [String(u.id), u]));

    const mapped = candidates.map((c) => {
      const u = userMap.get(String(c.user_id));

      // Use credentials_generated OR username as the canonical UI flag.
      const credsFlag = !!c.credentials_generated || (!!c.username && String(c.username).trim().length > 0);

      return {
        ...c,
        id: c.id,
        userId: c.user_id,
        fullName: c.full_name,
        subscriptionPlan: c.subscription_plan,
        subscriptionStatus: c.subscription_status,
        paymentStatus: c.payment_status,
        assignedRecruiterId: c.assigned_recruiter_id,
        assignedRecruiter: c.assigned_recruiter_id,
        recruiterName: c.recruiter_name || "",
        credentialsGenerated: credsFlag,
        password: credsFlag ? "SET" : (u?.username ? "SET" : safeHashedPasswordFlag(c)),
        username: u?.username || c.username || "",
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        assignedDate: c.assigned_date,
        credentialsGenerated: c.credentials_generated,
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

// ✅ createCandidate - PostgreSQL version
exports.createCandidate = async (req, res, next) => {
  try {
    console.log("📥 [ADMIN] createCandidate payload:", req.body);

    const body = req.body || {};
    const emailNorm = String(body.email || "").trim().toLowerCase();

    const fullNameNorm =
      String(body.fullName || "").trim() ||
      `${String(body.firstName || "").trim()} ${String(body.lastName || "").trim()}`.trim();

    if (!emailNorm) return next(new ErrorResponse("Email is required", 400));

    // ✅ Validate experience BEFORE creating user
    const experience = Array.isArray(body.experience) ? body.experience : [];
    
    if (experience.length === 0) {
      return next(new ErrorResponse("At least one experience entry is required", 400));
    }

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

    // Use ensureUserAccount helper
    const user = await ensureUserAccount({
      email: emailNorm,
      name: fullNameNorm,
      role: "candidate",
    });

    const existingCandidateResult = await pool.query(
      'SELECT * FROM candidates WHERE user_id = $1',
      [user.id]
    );
    
    if (existingCandidateResult.rows[0]) {
      return next(
        new ErrorResponse("Candidate profile already exists for this email. Use update.", 400)
      );
    }

    // Prepare experience data for JSON storage
    const validatedExperience = experience.map((exp, index) => {
      const company = String(exp.company || "").trim();
      const title = String(exp.title || "").trim();
      const startDate = String(exp.startDate || "").trim();
      const endDate = String(exp.endDate || "").trim();
      const location = String(exp.location || "").trim();

      if (!company || !title || !startDate) {
        throw new Error(
          `Experience ${index + 1} must include company, title, and start date`
        );
      }

      return {
        company,
        title,
        startDate,
        endDate,
        location,
        bullets: Array.isArray(exp.achievements)
          ? exp.achievements
              .map(a => String(a || "").trim())
              .filter(Boolean)
          : [],
      };
    });

    // Handle education as JSON
    const education = Array.isArray(body.education) ? body.education : [];

    // Handle skills
    const mergedSkills = []
      .concat(body.skills || [])
      .concat(body.technicalSkills || [])
      .concat(body.softSkills || [])
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);

    const skills = mergedSkills.length ? Array.from(new Set(mergedSkills)) : [];

    // Handle recruiter assignment
    let assignedRecruiterId = null;
    let recruiterStatus = '';
    let assignedDate = null;

    const incomingAssignedRecruiter = body.assignedRecruiter;

    if (incomingAssignedRecruiter) {
      const recruiterResult = await pool.query(
        `SELECT * FROM recruiters WHERE id = $1 AND (status = 'active' OR is_active = true)`,
        [incomingAssignedRecruiter]
      );
      
      if (recruiterResult.rows[0]) {
        assignedRecruiterId = recruiterResult.rows[0].id;
        recruiterStatus = 'new';
        assignedDate = new Date();
      } else {
        // Try by email
        const recruiterByEmailResult = await pool.query(
          `SELECT * FROM recruiters WHERE email = $1 AND (status = 'active' OR is_active = true)`,
          [String(incomingAssignedRecruiter).trim().toLowerCase()]
        );
        
        if (recruiterByEmailResult.rows[0]) {
          assignedRecruiterId = recruiterByEmailResult.rows[0].id;
          recruiterStatus = 'new';
          assignedDate = new Date();
        } else {
          console.warn("⚠️ [ADMIN] invalid assignedRecruiter, ignoring:", incomingAssignedRecruiter);
        }
      }
    }

    console.log("🔥 FINAL EXPERIENCE SAVING:", validatedExperience);

    // Create candidate
    const createdResult = await pool.query(
      `INSERT INTO candidates (
        user_id, email, full_name, phone, location, headline, summary,
        skills, experience, education, certifications, languages,
        portfolio_url, github_url, linkedin_url, expected_salary,
        notice_period, visa_status, subscription_plan, subscription_status,
        payment_status, assigned_recruiter_id, recruiter_status, assigned_date,
        username, password_hash, credentials_generated, credentials_updated_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW(), NOW())
      RETURNING *`,
      [
        user.id,
        emailNorm,
        fullNameNorm,
        body.phone || '',
        body.location || '',
        body.headline || '',
        body.summary || '',
        JSON.stringify(skills),
        JSON.stringify(validatedExperience),
        JSON.stringify(education),
        JSON.stringify(body.certifications || []),
        JSON.stringify(body.languages || []),
        body.portfolio_url || '',
        body.github_url || '',
        body.linkedin_url || '',
        body.expected_salary || null,
        body.notice_period || '',
        body.visa_status || '',
        body.subscriptionPlan || 'free',
        body.subscriptionStatus || 'active',
        body.paymentStatus || 'paid',
        assignedRecruiterId,
        recruiterStatus,
        assignedDate,
        body.username || '',
        '', // password_hash initially empty
        null, // credentials_generated
        null, // credentials_updated_by
      ]
    );

    const created = createdResult.rows[0];

    console.log(`✅ [ADMIN] candidate saved: ${created.id} email=${created.email}`);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("❌ [ADMIN] createCandidate error:", error);
    next(error);
  }
};

exports.updateCandidate = async (req, res, next) => {
  try {
    // Handle JSON fields
    const updates = { ...req.body };
    
    // Stringify JSON fields if they exist
    if (updates.skills && Array.isArray(updates.skills)) {
      updates.skills = JSON.stringify(updates.skills);
    }
    if (updates.experience && Array.isArray(updates.experience)) {
      updates.experience = JSON.stringify(updates.experience);
    }
    if (updates.education && Array.isArray(updates.education)) {
      updates.education = JSON.stringify(updates.education);
    }
    if (updates.certifications && Array.isArray(updates.certifications)) {
      updates.certifications = JSON.stringify(updates.certifications);
    }
    if (updates.languages && Array.isArray(updates.languages)) {
      updates.languages = JSON.stringify(updates.languages);
    }

    // Build dynamic SET clause
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      // Map camelCase to snake_case
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      setClauses.push(`${dbKey} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    setClauses.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const query = `
      UPDATE candidates 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (!result.rows[0]) return next(new ErrorResponse("Candidate not found", 404));
    
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [req.params.id]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (candidate.user_id) {
      await safeDeleteUser(candidate.user_id);
    }

    await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
    
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
    const recruitersResult = await pool.query(`
      SELECT * FROM recruiters 
      ORDER BY created_at DESC
    `);

    const recruiters = recruitersResult.rows;
    const recruiterIds = recruiters.map((r) => r.id);

    // Get assignment counts
    let counts = [];
    if (recruiterIds.length > 0) {
      const placeholders = recruiterIds.map((_, idx) => `$${idx + 1}`).join(',');
      const countsResult = await pool.query(`
        SELECT assigned_recruiter_id, COUNT(*) as count
        FROM candidates
        WHERE assigned_recruiter_id IN (${placeholders})
        GROUP BY assigned_recruiter_id
      `, recruiterIds);
      counts = countsResult.rows;
    }

    const countMap = new Map(counts.map((x) => [String(x.assigned_recruiter_id), parseInt(x.count)]));
    const mapped = recruiters.map((r) => ({
      ...r,
      assignedCandidatesCount: countMap.get(String(r.id)) || 0,
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ createRecruiter - PostgreSQL version
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

    // Check if username already exists
    const existingUsernameResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [usernameNorm]
    );
    
    if (existingUsernameResult.rows[0]) {
      return next(new ErrorResponse("Username already exists", 400));
    }

    // Use ensureUserAccount helper to get/create user
    const user = await ensureUserAccount({
      email: emailNorm,
      name: `${firstName} ${lastName || ""}`.trim(),
      role: "recruiter",
    });

    // Update username and password for the user if they were newly created or need updating
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users 
       SET username = $1, password = $2, status = $3, updated_at = NOW()
       WHERE id = $4`,
      [usernameNorm, hashedPassword, isActive === false ? 'inactive' : 'active', user.id]
    );

    // Check if recruiter profile already exists
    const existingRecruiterResult = await pool.query(
      'SELECT * FROM recruiters WHERE user_id = $1',
      [user.id]
    );

    if (existingRecruiterResult.rows[0]) {
      return next(new ErrorResponse("Recruiter profile already exists for this user", 400));
    }

    const createdRecruiterResult = await pool.query(
      `INSERT INTO recruiters (
        user_id, name, email, phone, department, specialization, 
        max_candidates, status, is_active, assigned_candidates, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        user.id,
        `${firstName} ${lastName || ''}`.trim(),
        emailNorm,
        phone || '',
        department || 'Technical',
        specialization || 'IT/Software',
        Number(maxCandidates || 20),
        isActive === false ? 'inactive' : 'active',
        isActive !== false,
        JSON.stringify([]), // assigned_candidates as empty array
      ]
    );

    const createdRecruiter = createdRecruiterResult.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        ...createdRecruiter,
        username: usernameNorm,
        password: "SET",
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRecruiter = async (req, res, next) => {
  try {
    const recruiterId = req.params.id;

    const recruiterResult = await pool.query(
      "SELECT * FROM recruiters WHERE id=$1",
      [recruiterId]
    );

    const recruiter = recruiterResult.rows[0];

    if (!recruiter) {
      return next(new ErrorResponse("Recruiter not found", 404));
    }

    const {
      name,
      email,
      username,
      password,
      phone,
      department,
      specialization,
      maxCandidates,
      status,
      isActive,
    } = req.body;

    const emailNorm = email ? String(email).trim().toLowerCase() : recruiter.email;

    /* ---------------------------
       Update USERS table
    ---------------------------- */

    if (recruiter.user_id) {
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
          `UPDATE users
           SET email=$1, username=$2, password=$3, updated_at=NOW()
           WHERE id=$4`,
          [emailNorm, username || recruiter.email, hashedPassword, recruiter.user_id]
        );
      } else {
        await pool.query(
          `UPDATE users
           SET email=$1, username=$2, updated_at=NOW()
           WHERE id=$3`,
          [emailNorm, username || recruiter.email, recruiter.user_id]
        );
      }
    }

    /* ---------------------------
       Update RECRUITERS table
    ---------------------------- */

    const updatedRecruiterResult = await pool.query(
      `UPDATE recruiters
       SET name=$1,
           email=$2,
           phone=$3,
           department=$4,
           specialization=$5,
           max_candidates=$6,
           status=$7,
           is_active=$8,
           updated_at=NOW()
       WHERE id=$9
       RETURNING *`,
      [
        name || recruiter.name,
        emailNorm,
        phone || recruiter.phone,
        department || recruiter.department,
        specialization || recruiter.specialization,
        maxCandidates || recruiter.max_candidates,
        status || recruiter.status,
        isActive !== undefined ? isActive : recruiter.is_active,
        recruiterId,
      ]
    );

    return res.status(200).json({
      success: true,
      data: updatedRecruiterResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecruiter = async (req, res, next) => {
  try {
    const recruiterResult = await pool.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [req.params.id]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    await pool.query(
      `UPDATE candidates 
       SET assigned_recruiter_id = NULL, recruiter_status = '', assigned_date = NULL
       WHERE assigned_recruiter_id = $1`,
      [recruiter.id]
    );

    if (recruiter.user_id) {
      await safeDeleteUser(recruiter.user_id);
    }

    await pool.query('DELETE FROM recruiters WHERE id = $1', [req.params.id]);
    
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGNMENTS
========================================================= */
exports.assignCandidate = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { candidateId, recruiterId } = req.body;

    const candidateResult = await client.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (!recruiterId) {
      await client.query(
        `UPDATE candidates 
         SET assigned_recruiter_id = NULL, recruiter_status = '', assigned_date = NULL
         WHERE id = $1`,
        [candidateId]
      );
      
      await client.query('COMMIT');
      return res.status(200).json({ success: true, data: candidate });
    }

    const recruiterResult = await client.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (recruiter.status !== "active") return next(new ErrorResponse("Recruiter is not active", 400));

    const assignedCountResult = await client.query(
      'SELECT COUNT(*) FROM candidates WHERE assigned_recruiter_id = $1',
      [recruiter.id]
    );
    const assignedCount = parseInt(assignedCountResult.rows[0].count);
    
    if (assignedCount >= (recruiter.max_candidates || 10)) {
      return next(new ErrorResponse("Recruiter is at full capacity", 400));
    }

    await client.query(
      `UPDATE candidates 
       SET assigned_recruiter_id = $1, recruiter_status = 'new', assigned_date = NOW()
       WHERE id = $2`,
      [recruiter.id, candidateId]
    );

    await client.query(
      `UPDATE recruiters 
       SET last_assignment = NOW()
       WHERE id = $1`,
      [recruiter.id]
    );

    await client.query('COMMIT');

    const updatedCandidateResult = await client.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );

    return res.status(200).json({ success: true, data: updatedCandidateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.bulkAssignCandidates = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { candidateIds, recruiterId } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return next(new ErrorResponse("candidateIds must be a non-empty array", 400));
    }

    const recruiterResult = await client.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (recruiter.status !== "active") return next(new ErrorResponse("Recruiter is not active", 400));

    const assignedCountResult = await client.query(
      'SELECT COUNT(*) FROM candidates WHERE assigned_recruiter_id = $1',
      [recruiter.id]
    );
    const assignedCount = parseInt(assignedCountResult.rows[0].count);
    const capacity = recruiter.max_candidates || 10;
    const remaining = Math.max(0, capacity - assignedCount);

    if (remaining <= 0) return next(new ErrorResponse("Recruiter is at full capacity", 400));

    const toAssign = candidateIds.slice(0, remaining);

    // Create placeholders for IN clause
    const placeholders = toAssign.map((_, idx) => `$${idx + 2}`).join(',');
    
    await client.query(
      `UPDATE candidates 
       SET assigned_recruiter_id = $1, recruiter_status = 'new', assigned_date = NOW()
       WHERE id IN (${placeholders})`,
      [recruiter.id, ...toAssign]
    );

    await client.query(
      `UPDATE recruiters 
       SET last_assignment = NOW()
       WHERE id = $1`,
      [recruiter.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: { assigned: toAssign.length, skipped: candidateIds.length - toAssign.length },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.autoAssignCandidates = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const activeRecruitersResult = await client.query(
      `SELECT * FROM recruiters 
       WHERE status = 'active' 
       ORDER BY created_at ASC`
    );
    
    const activeRecruiters = activeRecruitersResult.rows;
    
    if (activeRecruiters.length === 0) {
      return next(new ErrorResponse("No active recruiters available", 400));
    }

    const unassignedResult = await client.query(
      `SELECT * FROM candidates 
       WHERE assigned_recruiter_id IS NULL 
       ORDER BY created_at ASC`
    );
    
    const unassigned = unassignedResult.rows;
    
    if (unassigned.length === 0) {
      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        data: { assigned: 0, message: "No unassigned candidates" },
      });
    }

    // Get current counts for each recruiter
    const recruiterIds = activeRecruiters.map((r) => r.id);
    const placeholders = recruiterIds.map((_, idx) => `$${idx + 1}`).join(',');
    
    const countsResult = await client.query(
      `SELECT assigned_recruiter_id, COUNT(*) as count
       FROM candidates
       WHERE assigned_recruiter_id IN (${placeholders})
       GROUP BY assigned_recruiter_id`,
      recruiterIds
    );
    
    const countMap = new Map(
      countsResult.rows.map(x => [String(x.assigned_recruiter_id), parseInt(x.count)])
    );

    let assignedTotal = 0;
    let rrIndex = 0;

    for (const cand of unassigned) {
      let tries = 0;
      let assigned = false;

      while (tries < activeRecruiters.length && !assigned) {
        const recruiter = activeRecruiters[rrIndex];
        rrIndex = (rrIndex + 1) % activeRecruiters.length;
        tries++;

        const currentCount = countMap.get(String(recruiter.id)) || 0;
        const cap = recruiter.max_candidates || 10;

        if (currentCount < cap) {
          await client.query(
            `UPDATE candidates 
             SET assigned_recruiter_id = $1, recruiter_status = 'new', assigned_date = NOW()
             WHERE id = $2`,
            [recruiter.id, cand.id]
          );
          
          countMap.set(String(recruiter.id), currentCount + 1);
          assignedTotal++;
          assigned = true;

          await client.query(
            `UPDATE recruiters 
             SET last_assignment = NOW()
             WHERE id = $1`,
            [recruiter.id]
          );
        }
      }

      if (!assigned) break;
    }

    await client.query('COMMIT');

    return res.status(200).json({ success: true, data: { assigned: assignedTotal } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/* =========================================================
   CREDENTIALS
   POST /api/v1/admin/candidates/:id/credentials
   body: { username, password }
========================================================= */
exports.setCandidateCredentials = async (req, res, next) => {
  try {
    const candidateId = req.params.id;
    const { username, password } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const usernameNorm = String(username || "").trim().toLowerCase();
    if (!usernameNorm) return next(new ErrorResponse("username is required", 400));

    const pw = String(password || "");
    if (!pw || pw.length < 6) {
      return next(new ErrorResponse("password must be at least 6 characters", 400));
    }

    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));
    if (!candidate.user_id) return next(new ErrorResponse("Candidate userId missing", 400));

    // enforce unique username on Candidate table
    const takenCandidateResult = await pool.query(
      'SELECT * FROM candidates WHERE username = $1 AND id != $2',
      [usernameNorm, candidateId]
    );
    
    if (takenCandidateResult.rows[0]) return next(new ErrorResponse("Username already taken", 400));

    // update Candidate creds
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pw, salt);

    await pool.query(
      `UPDATE candidates 
       SET username = $1, password_hash = $2, credentials_generated = NOW(), credentials_updated_by = $3
       WHERE id = $4`,
      [usernameNorm, passwordHash, String(req.user?._id || "admin"), candidateId]
    );

    const user = await safeFindUserWithPassword(candidate.user_id);
    if (!user) return next(new ErrorResponse("Candidate user not found", 404));

    // Check if username column exists in users table
    const userColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='username'
    `);
    
    const userHasUsername = userColumnsResult.rows.length > 0;

    if (userHasUsername) {
      const existingUResult = await pool.query(
        'SELECT * FROM users WHERE username = $1 AND id != $2',
        [usernameNorm, user.id]
      );
      
      if (existingUResult.rows[0]) return next(new ErrorResponse("Username already taken", 400));
      
      await pool.query(
        'UPDATE users SET username = $1 WHERE id = $2',
        [usernameNorm, user.id]
      );
    }

    // Update user password
    const userSalt = await bcrypt.genSalt(10);
    const userPasswordHash = await bcrypt.hash(pw, userSalt);
    
    await pool.query(
      `UPDATE users 
       SET password = $1, role = $2, status = $3, updated_at = NOW()
       WHERE id = $4`,
      [userPasswordHash, user.role || 'candidate', 'active', user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate.id,
        userId: user.id,
        email: user.email,
        username: usernameNorm,
        credentialsGenerated: new Date(),
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

    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));
    if (!candidate.user_id) return next(new ErrorResponse("Candidate userId missing", 400));

    const user = await safeFindUserWithPassword(candidate.user_id);
    if (!user) return next(new ErrorResponse("Candidate user not found", 404));

    await pool.query(
      `UPDATE candidates 
       SET username = '', password_hash = '', credentials_generated = NULL, credentials_updated_by = $1
       WHERE id = $2`,
      [String(req.user?._id || "admin"), candidateId]
    );

    const tempPassword = generateRandomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Check if username column exists
    const userColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='username'
    `);
    
    const userHasUsername = userColumnsResult.rows.length > 0;

    if (userHasUsername) {
      await pool.query(
        'UPDATE users SET password = $1, username = $2, updated_at = NOW() WHERE id = $3',
        [hashedPassword, '', user.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate.id,
        userId: user.id,
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

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [emailNorm]
    );
    const user = userResult.rows[0];
    
    if (!user) return next(new ErrorResponse("User not found", 404));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

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
    const result = await pool.query(`
      SELECT * FROM candidates 
      WHERE assigned_recruiter_id IS NULL
      ORDER BY created_at DESC
    `);

    return res.status(200).json(result.rows);
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

    const recruiterResult = await pool.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    
    if (!recruiterResult.rows[0]) return next(new ErrorResponse("Recruiter not found", 404));

    const candidatesResult = await pool.query(`
      SELECT * FROM candidates 
      WHERE assigned_recruiter_id = $1
      ORDER BY assigned_date DESC, created_at DESC
    `, [recruiterId]);

    return res.status(200).json(candidatesResult.rows);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGN CANDIDATE TO RECRUITER (TRANSACTION)
   POST /api/v1/admin/recruiters/:id/assign
========================================================= */
exports.assignCandidateToRecruiter = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const recruiterId = req.params.id;
    const { candidateId } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const recruiterResult = await client.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    const recruiterActive = recruiter.status === "active" || recruiter.is_active === true;
    if (!recruiterActive) return next(new ErrorResponse("Recruiter is not active", 400));

    const candidateResult = await client.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (candidate.assigned_recruiter_id && String(candidate.assigned_recruiter_id) !== String(recruiterId)) {
      return next(new ErrorResponse("Candidate already assigned to another recruiter", 400));
    }

    // Get current assigned candidates array
    const assignedCandidates = recruiter.assigned_candidates || [];
    const currentCount = assignedCandidates.length;
    const capacity = recruiter.max_candidates || 10;
    
    if (currentCount >= capacity) {
      return next(new ErrorResponse("Recruiter is at full capacity", 400));
    }

    await client.query(
      `UPDATE candidates 
       SET assigned_recruiter_id = $1, recruiter_status = 'new', assigned_date = NOW()
       WHERE id = $2`,
      [recruiter.id, candidate.id]
    );

    // Add candidate to assigned_candidates if not already present
    if (!assignedCandidates.includes(candidate.id)) {
      assignedCandidates.push(candidate.id);
      
      await client.query(
        `UPDATE recruiters 
         SET assigned_candidates = $1, last_assignment = NOW()
         WHERE id = $2`,
        [JSON.stringify(assignedCandidates), recruiter.id]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: { candidateId: candidate.id, recruiterId: recruiter.id },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/* =========================================================
   UNASSIGN CANDIDATE FROM RECRUITER (TRANSACTION)
   POST /api/v1/admin/recruiters/:id/unassign
========================================================= */
exports.unassignCandidateFromRecruiter = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const recruiterId = req.params.id;
    const { candidateId } = req.body;

    if (!candidateId) return next(new ErrorResponse("candidateId is required", 400));

    const recruiterResult = await client.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));

    const candidateResult = await client.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    
    if (!candidate) return next(new ErrorResponse("Candidate not found", 404));

    if (String(candidate.assigned_recruiter_id || '') !== String(recruiterId)) {
      return next(new ErrorResponse("Candidate is not assigned to this recruiter", 400));
    }

    await client.query(
      `UPDATE candidates 
       SET assigned_recruiter_id = NULL, recruiter_status = '', assigned_date = NULL
       WHERE id = $1`,
      [candidate.id]
    );

    // Remove candidate from assigned_candidates array
    const assignedCandidates = recruiter.assigned_candidates || [];
    const updatedAssignments = assignedCandidates.filter(id => String(id) !== String(candidate.id));
    
    await client.query(
      `UPDATE recruiters 
       SET assigned_candidates = $1
       WHERE id = $2`,
      [JSON.stringify(updatedAssignments), recruiter.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: { candidateId: candidate.id, recruiterId },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/* =========================================================
   RESET RECRUITER PASSWORD (ADMIN ONLY)
   POST /api/v1/admin/recruiters/:id/reset-password
========================================================= */
exports.resetRecruiterPassword = async (req, res, next) => {
  try {
    const recruiterId = req.params.id;

    const recruiterResult = await pool.query(
      'SELECT * FROM recruiters WHERE id = $1',
      [recruiterId]
    );
    const recruiter = recruiterResult.rows[0];
    
    if (!recruiter) return next(new ErrorResponse("Recruiter not found", 404));
    if (!recruiter.user_id) return next(new ErrorResponse("Recruiter user account missing", 400));

    const user = await safeFindUserWithPassword(recruiter.user_id);
    if (!user) return next(new ErrorResponse("Recruiter user not found", 404));

    const newPassword = generateRandomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    await pool.query(
      `UPDATE recruiters 
       SET status = 'active', is_active = true, updated_at = NOW()
       WHERE id = $1`,
      [recruiter.id]
    );

    return res.status(200).json({ success: true, newPassword });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET JOB APPLICATIONS FOR A CANDIDATE (ADMIN)
   GET /api/v1/admin/candidates/:candidateId/applications
========================================================= */
exports.getCandidateApplications = async (req, res, next) => {
  try {
    const { candidateId } = req.params;

    if (!candidateId) {
      return res.status(400).json({ message: "candidateId is required" });
    }

    const jobsResult = await pool.query(`
      SELECT ja.*, r.name as recruiter_name, r.email as recruiter_email
      FROM job_applications ja
      LEFT JOIN recruiters r ON ja.recruiter_id = r.id
      WHERE ja.candidate_id = $1
      ORDER BY ja.applied_date DESC
    `, [candidateId]);

    return res.status(200).json(jobsResult.rows);
  } catch (error) {
    console.error("❌ getCandidateApplications error:", error);
    next(error);
  }
};

/* =========================================================
   DATA MIGRATION UTILITY (Optional - run once to fix existing data)
   POST /api/v1/admin/migrate-user-ids
========================================================= */
exports.migrateUserIds = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Migrate candidates
    const candidatesResult = await client.query(`
      SELECT * FROM candidates 
      WHERE user_id IS NOT NULL
    `);
    
    let candidateMigrated = 0;
    for (const candidate of candidatesResult.rows) {
      // Check if user_id is a valid UUID format (PostgreSQL UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(candidate.user_id)) {
        console.log(`Migrating candidate ${candidate.id} - userId: ${candidate.user_id}`);
        
        let userResult = await client.query(
          'SELECT * FROM users WHERE id = $1',
          [candidate.user_id]
        );
        let user = userResult.rows[0];
        
        if (!user) {
          const tempPassword = generateRandomPassword(10);
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(tempPassword, salt);
          
          // Generate new UUID
          const newUserResult = await client.query(
            `INSERT INTO users (id, email, name, role, status, password, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [candidate.email, candidate.full_name || candidate.email, 'candidate', 'active', hashedPassword]
          );
          user = newUserResult.rows[0];
        }
        
        await client.query(
          'UPDATE candidates SET user_id = $1 WHERE id = $2',
          [user.id, candidate.id]
        );
        candidateMigrated++;
      }
    }
    
    // Migrate recruiters
    const recruitersResult = await client.query(`
      SELECT * FROM recruiters 
      WHERE user_id IS NOT NULL
    `);
    
    let recruiterMigrated = 0;
    for (const recruiter of recruitersResult.rows) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(recruiter.user_id)) {
        console.log(`Migrating recruiter ${recruiter.id} - userId: ${recruiter.user_id}`);
        
        let userResult = await client.query(
          'SELECT * FROM users WHERE id = $1',
          [recruiter.user_id]
        );
        let user = userResult.rows[0];
        
        if (!user) {
          const tempPassword = generateRandomPassword(10);
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(tempPassword, salt);
          
          const newUserResult = await client.query(
            `INSERT INTO users (id, email, name, role, status, password, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [recruiter.email, recruiter.name, 'recruiter', recruiter.status || 'active', hashedPassword]
          );
          user = newUserResult.rows[0];
        }
        
        await client.query(
          'UPDATE recruiters SET user_id = $1 WHERE id = $2',
          [user.id, recruiter.id]
        );
        recruiterMigrated++;
      }
    }
    
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        candidatesMigrated: candidateMigrated,
        recruitersMigrated: recruiterMigrated
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};