const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true, trim: true }, // e.g. free, silver
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // days
    features: [{ type: String, trim: true }],
    description: { type: String, trim: true, default: "" },
    color: { type: String, trim: true, default: "blue" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);
