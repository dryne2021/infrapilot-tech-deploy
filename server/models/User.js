// server/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"],
      index: true,
    },

    // ✅ Login by username OR email
    username: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with null/undefined
      trim: true,
      lowercase: true, // ✅ makes username comparisons consistent
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9_.-]+$/, "Username contains invalid characters"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // ✅ never return password unless explicitly selected
    },

    role: {
      type: String,
      enum: ["admin", "recruiter", "candidate"],
      default: "candidate",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true, // ✅ createdAt + updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =========================================================
   INDEXES (kept explicit + safe)
========================================================= */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

/* =========================================================
   NORMALIZATION (email/username consistency)
========================================================= */
userSchema.pre("save", function (next) {
  if (this.email) this.email = String(this.email).trim().toLowerCase();

  // allow empty username to behave like "unset"
  if (this.username !== undefined && this.username !== null) {
    const u = String(this.username).trim().toLowerCase();
    this.username = u.length ? u : undefined;
  }

  next();
});

/* =========================================================
   HASH PASSWORD BEFORE SAVE
   - hashes ONLY when password is modified
========================================================= */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

/* =========================================================
   INSTANCE METHODS
========================================================= */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(String(enteredPassword || ""), this.password);
};

// ✅ ADD THIS: authController expects comparePassword()
userSchema.methods.comparePassword = async function (enteredPassword) {
  return this.matchPassword(enteredPassword);
};

// Optional helper (nice for responses, but not required)
userSchema.methods.getSafeUser = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);
