// routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const { registerUser, loginUser, getUserProfile, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login',    loginUser);
router.get('/profile',   protect, getUserProfile);
router.post('/logout',   protect, logoutUser);

module.exports = router;
