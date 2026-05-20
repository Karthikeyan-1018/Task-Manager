// ============================================================
//  models/Task.js
//  PURPOSE: Define the shape of a Task document in MongoDB
//
//  KEY CONCEPT — ref: 'User':
//  The `user` field stores an ObjectId that REFERENCES a User
//  document. This is like a foreign key in SQL databases.
//  We can use .populate('user') to replace the ID with the
//  full user object when querying tasks.
// ============================================================

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    // ---- Title ----
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    // ---- Description ----
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    // ---- Status ----
    // enum restricts the value to only these allowed strings
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: 'Status must be Pending, In Progress, or Completed',
      },
      default: 'Pending',
    },

    // ---- Priority ----
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: 'Priority must be Low, Medium, or High',
      },
      default: 'Medium',
    },

    // ---- Due Date ----
    dueDate: {
      type: Date,
      default: null,
    },

    // ---- User Reference ----
    // Links this task to the user who created it
    // ObjectId is MongoDB's unique document identifier type
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',               // References the 'User' model
      required: [true, 'Task must belong to a user'],
    },
  },
  {
    // Automatically manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// ---- Index for faster queries ----
// When a user fetches their tasks, MongoDB uses this index
// instead of scanning the entire collection
taskSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
