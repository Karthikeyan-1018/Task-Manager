// routes/taskRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getAllTasks, getTaskById, createTask,
  updateTask, deleteTask, getTaskStats,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes are protected — must send JWT token
router.use(protect);

router.get('/stats', getTaskStats);        // GET  /api/tasks/stats
router.get('/',      getAllTasks);          // GET  /api/tasks
router.post('/',     createTask);          // POST /api/tasks
router.get('/:id',   getTaskById);         // GET  /api/tasks/:id
router.put('/:id',   updateTask);          // PUT  /api/tasks/:id
router.delete('/:id',deleteTask);          // DELETE /api/tasks/:id

module.exports = router;
