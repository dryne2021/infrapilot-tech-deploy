const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Plan = require("../models/Plan");
const connectDB = require("../config/db");

(async () => {
  await connectDB();

  const defaultPlans = [
    { planId: "free", name: "Free Trial", price: 0, duration: 7, features: ["Basic profile", "Limited applications (3/month)", "Standard support"], status: "active", color: "blue", description: "Perfect for trying out our platform" },
    { planId: "silver", name: "Silver", price: 29, duration: 30, features: ["Priority listing", "10 applications/month", "Resume review", "Email support"], status: "active", color: "blue", description: "Great for active job seekers" },
    { planId: "gold", name: "Gold", price: 79, duration: 30, features: ["Top priority listing", "Unlimited applications", "Interview prep", "LinkedIn optimization", "Priority support"], status: "active", color: "amber", description: "Most popular - best value" },
    { planId: "platinum", name: "Platinum", price: 149, duration: 30, features: ["1:1 career coaching", "Guaranteed interviews (3/month)", "Salary negotiation", "All Gold features", "24/7 support"], status: "active", color: "gray", description: "Premium career advancement" },
    { planId: "enterprise", name: "Enterprise", price: 299, duration: 90, features: ["Custom solutions", "Dedicated recruiter", "Team access", "Analytics dashboard", "Custom integrations"], status: "active", color: "purple", description: "Corporate & team solutions" },
  ];

  for (const p of defaultPlans) {
    await Plan.updateOne({ planId: p.planId }, { $set: p }, { upsert: true });
  }

  console.log("✅ Plans seeded/updated");
  process.exit(0);
})();
