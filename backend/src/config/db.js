
/**
 * config/db.js — MongoDB connection via Mongoose
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDB() {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is required');
    }

    await mongoose.connect(mongoUrl);

    logger.info("MongoDB connected → renergizr");
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { connectDB };
