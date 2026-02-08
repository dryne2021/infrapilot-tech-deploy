// server/scripts/seedAdmin.js
const mongoose = require("mongoose");
const User = require("../models/User");

(async function seedAdmin() {
  try {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || "Admin";

    // Only run if env vars exist
    if (!email || !password) {
      console.log("ℹ️ Seed skipped: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set");
      return;
    }

    // Ensure mongoose is connected (connectDB already ran in index.js)
    if (mongoose.connection.readyState !== 1) {
      console.log("ℹ️ Seed skipped: Mongo not connected yet");
      return;
    }

    const existing = await User.findOne({ email }).select("+password");
    if (existing) {
      console.log(`✅ Admin already exists: ${email} (role=${existing.role})`);
      return;
    }

    const user = await User.create({
      name,
      email,
      password, // hashed by User model pre-save hook
      role: "admin",
      status: "active",
    });

    console.log(`✅ Admin created: ${user.email} (id=${user._id})`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  }
})();
