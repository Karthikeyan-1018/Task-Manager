// ============================================================
//  config/db.js
//  PURPOSE: Connect our app to MongoDB Atlas database
//
//  HOW IT WORKS:
//  mongoose.connect() opens a persistent connection to MongoDB.
//  We only need to call this once when the server starts.
//  All models (User, Task) will automatically use this connection.
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise — we await it
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // conn.connection.host tells us which Atlas cluster we connected to
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails (wrong URI, bad password, IP not whitelisted)
    // we log the error and exit the process — no point running without a DB
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

module.exports = connectDB;
