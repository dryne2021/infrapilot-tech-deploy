const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Ensure MONGO_URI is provided
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing. Please set it in Render Environment Variables.");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
