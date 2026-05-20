// ============================================================
//  controllers/taskController.js
//  PURPOSE: Handle all Task CRUD operations
//
//  SECURITY NOTE:
//  Every query filters by `user: req.user._id`.
//  This ensures users can ONLY access their OWN tasks.
//  Even if someone has a valid JWT, they cannot read or modify
//  another user's tasks — the DB query simply won't find them.
// ============================================================

const Task = require('../models/Task');

// ============================================================
//  @desc    Get all tasks for logged-in user
//  @route   GET /api/tasks
//  @access  Private
//
//  SUPPORTS QUERY PARAMS:
//  ?status=Pending
//  ?priority=High
//  ?search=keyword
//  ?sort=createdAt (or dueDate, title, priority)
//  ?order=asc (or desc)
//  ?page=1&limit=10
// ============================================================
const getAllTasks = async (req, res) => {
  try {
    // ---- Build filter object ----
    // Always filter by the authenticated user's ID
    const filter = { user: req.user._id };

    // Optional: Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Optional: Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // Optional: Search by title (case-insensitive regex)
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    // ---- Sorting ----
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // ---- Pagination ----
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // ---- Execute queries in parallel for performance ----
    const [tasks, totalCount] = await Promise.all([
      Task.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      tasks,
    });
  } catch (error) {
    console.error('Get All Tasks Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
//  @desc    Get a single task by ID
//  @route   GET /api/tasks/:id
//  @access  Private
// ============================================================
const getTaskById = async (req, res) => {
  try {
    // Find task by ID AND user — prevents accessing other users' tasks
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId format
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Task not found — invalid ID',
      });
    }
    console.error('Get Task Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching task',
    });
  }
};

// ============================================================
//  @desc    Create a new task
//  @route   POST /api/tasks
//  @access  Private
//
//  FLOW:
//  1. Extract fields from request body
//  2. Validate required fields
//  3. Create task — automatically set user from req.user._id
//  4. Return created task
// ============================================================
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    // ---- Validation ----
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    // ---- Validate dueDate if provided ----
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for dueDate',
        });
      }
    }

    // ---- Create Task ----
    // req.user._id comes from the protect middleware (JWT decoded)
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'Pending',
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      user: req.user._id, // Automatically link to logged-in user
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    // Mongoose validation errors (enum mismatch, minlength, etc.)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    console.error('Create Task Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
//  @desc    Update a task
//  @route   PUT /api/tasks/:id
//  @access  Private
//
//  NOTE: findOneAndUpdate with { new: true } returns the
//  UPDATED document (not the old one before the update).
//  { runValidators: true } applies schema validation on update.
// ============================================================
const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    // ---- Build update object (only include provided fields) ----
    const updateData = {};
    if (title      !== undefined) updateData.title       = title.trim();
    if (description!== undefined) updateData.description = description.trim();
    if (status     !== undefined) updateData.status      = status;
    if (priority   !== undefined) updateData.priority    = priority;
    if (dueDate    !== undefined) updateData.dueDate     = dueDate || null;

    // Check if any field was actually provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update',
      });
    }

    // ---- Find task belonging to this user and update ----
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, // Filter: must belong to user
      updateData,                                   // What to update
      {
        new: true,            // Return the updated document
        runValidators: true,  // Run schema validators on the update
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you do not have permission to update it',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Task not found — invalid ID',
      });
    }
    console.error('Update Task Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating task',
    });
  }
};

// ============================================================
//  @desc    Delete a task
//  @route   DELETE /api/tasks/:id
//  @access  Private
// ============================================================
const deleteTask = async (req, res) => {
  try {
    // findOneAndDelete ensures the task belongs to the user
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you do not have permission to delete it',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      deletedTask: { id: task._id, title: task.title },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Task not found — invalid ID',
      });
    }
    console.error('Delete Task Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting task',
    });
  }
};

// ============================================================
//  @desc    Get task statistics for the logged-in user
//  @route   GET /api/tasks/stats
//  @access  Private
// ============================================================
const getTaskStats = async (req, res) => {
  try {
    // MongoDB Aggregation Pipeline — powerful data processing
    const stats = await Task.aggregate([
      // Stage 1: Filter only this user's tasks
      { $match: { user: req.user._id } },

      // Stage 2: Group and count by status
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Also get priority breakdown
    const priorityStats = await Task.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Count overdue tasks (dueDate in the past and not Completed)
    const overdueCount = await Task.countDocuments({
      user: req.user._id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'Completed' },
    });

    // Total count
    const totalCount = await Task.countDocuments({ user: req.user._id });

    // Format into a clean object
    const statusBreakdown = { Pending: 0, 'In Progress': 0, Completed: 0 };
    stats.forEach((s) => { statusBreakdown[s._id] = s.count; });

    const priorityBreakdown = { Low: 0, Medium: 0, High: 0 };
    priorityStats.forEach((p) => { priorityBreakdown[p._id] = p.count; });

    res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        byStatus: statusBreakdown,
        byPriority: priorityBreakdown,
        overdue: overdueCount,
        completionRate: totalCount > 0
          ? Math.round((statusBreakdown.Completed / totalCount) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats',
    });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
};
