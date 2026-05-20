// ============================================================
//  models/User.js
//  PURPOSE: Define the shape of a User document in MongoDB
//
//  HOW IT WORKS:
//  A Mongoose Schema defines the fields, types, and rules.
//  mongoose.model() compiles the schema into a Model class.
//  We use the Model to CREATE, READ, UPDATE, DELETE documents.
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ---- Define the Schema (blueprint) ----
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],       // Custom error message
      trim: true,                                  // Remove leading/trailing spaces
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                                // No two users with same email
      trim: true,
      lowercase: true,                             // Store emails in lowercase
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,                               // NEVER return password in queries by default
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ============================================================
//  PRE-SAVE HOOK — Hash password before saving to database
//
//  WHY: Never store plain-text passwords. bcrypt transforms
//  "mypassword123" into "$2a$10$xyz..." — a one-way hash.
//  Even if your database is stolen, passwords are unreadable.
//
//  HOW bcrypt works:
//  1. Generates a "salt" (random data) — rounds=10 means 2^10 iterations
//  2. Combines salt + password and hashes them together
//  3. Stores the hash. Salt is embedded in the hash string.
// ============================================================
userSchema.pre('save', async function (next) {
  // Only hash if password field was actually changed
  // (prevents re-hashing on profile updates like name change)
  if (!this.isModified('password')) {
    return next();
  }

  // Generate salt with cost factor 10 (good balance of speed vs security)
  const salt = await bcrypt.genSalt(10);

  // Hash the plain-text password with the salt
  this.password = await bcrypt.hash(this.password, salt);

  next(); // Continue to save the document
});

// ============================================================
//  INSTANCE METHOD — Compare entered password with stored hash
//
//  Usage: const isMatch = await user.matchPassword('mypassword123')
//  bcrypt.compare() hashes the entered password the same way
//  and checks if it matches the stored hash.
// ============================================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compile schema into a Model and export
// MongoDB will create a "users" collection automatically
module.exports = mongoose.model('User', userSchema);
