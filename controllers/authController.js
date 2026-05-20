// ============================================================
//  controllers/authController.js
//  PURPOSE: Handle all authentication logic
//
//  MVC PATTERN EXPLAINED:
//  - Model  (User.js)       → Defines data structure & DB operations
//  - View                   → JSON responses (we're building an API)
//  - Controller (this file) → Business logic between Model and View
//
//  Each function here corresponds to one API endpoint.
//  Routes call these functions — controllers don't care about URLs.
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
//  HELPER — Generate JWT Token
//
//  jwt.sign() creates a token with:
//  - Payload: { id: userId } — data encoded inside the token
//  - Secret:  JWT_SECRET from .env — used to sign & verify
//  - Options: { expiresIn } — token auto-expires for security
//
//  The token is sent to the client. The client stores it and
//  sends it back in the Authorization header on every request.
// ============================================================
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },             // Payload — we store user's MongoDB _id
    process.env.JWT_SECRET,     // Secret key from environment
    { expiresIn: process.env.JWT_EXPIRE || '7d' } // Token validity
  );
};

// ============================================================
//  @desc    Register a new user
//  @route   POST /api/auth/register
//  @access  Public (no token needed)
//
//  FLOW:
//  1. Validate request body (name, email, password)
//  2. Check if email already exists in DB
//  3. Create new User (password auto-hashed by pre-save hook)
//  4. Generate JWT token
//  5. Return user data + token
// ============================================================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ---- Input Validation ----
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // ---- Check for existing user ----
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // ---- Create User ----
    // Password is automatically hashed by the pre('save') hook in User.js
    const user = await User.create({ name, email, password });

    // ---- Generate Token ----
    const token = generateToken(user._id);

    // ---- Send Response ----
    // 201 = Created (resource was successfully created)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
//  @desc    Login user
//  @route   POST /api/auth/login
//  @access  Public
//
//  FLOW:
//  1. Validate email and password provided
//  2. Find user by email (include password with .select('+password'))
//  3. Compare entered password with stored hash using bcrypt
//  4. Generate JWT token
//  5. Return user data + token
// ============================================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ---- Validation ----
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // ---- Find user + explicitly include password ----
    // We set `select: false` on password in the schema, so we must
    // explicitly request it here with .select('+password')
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Use a generic message — don't reveal whether email exists or not
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ---- Compare passwords ----
    // matchPassword() is the instance method we defined in User.js
    // bcrypt.compare() hashes the entered password and compares to stored hash
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ---- Generate Token ----
    const token = generateToken(user._id);

    // ---- Send Response ----
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================================
//  @desc    Get current user profile
//  @route   GET /api/auth/profile
//  @access  Private (requires JWT token)
//
//  NOTE: req.user is attached by the `protect` middleware.
//  By the time this function runs, we already know the user
//  is authenticated and their data is in req.user.
// ============================================================
const getUserProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware after token verification
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};

// ============================================================
//  @desc    Logout user
//  @route   POST /api/auth/logout
//  @access  Private
//
//  NOTE: JWTs are stateless — the server doesn't store them.
//  True logout happens on the CLIENT by deleting the stored token.
//  This endpoint signals the client to do that.
//
//  For token blacklisting (advanced), you'd store invalidated
//  tokens in Redis until they expire. Not needed for most apps.
// ============================================================
const logoutUser = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully — please delete your token on the client',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
};
