// ============================================================
//  middleware/authMiddleware.js
//  PURPOSE: Protect routes — only logged-in users can access them
//
//  HOW JWT AUTHENTICATION WORKS (Full Flow):
//
//  1. User logs in → server creates a JWT token and sends it back
//  2. Client stores the token (localStorage / cookie)
//  3. Client sends token in every request header:
//       Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//  4. This middleware intercepts the request BEFORE the controller
//  5. It verifies the token → extracts the user ID → attaches user to req
//  6. Controller can now access req.user to know WHO is making the request
//
//  JWT STRUCTURE (3 parts separated by dots):
//  Header.Payload.Signature
//  - Header:    Algorithm type (HS256)
//  - Payload:   Data we stored (user id, iat, exp)
//  - Signature: Cryptographic proof the token wasn't tampered with
// ============================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // ---- Step 1: Extract token from Authorization header ----
  // The header looks like: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Split "Bearer <token>" and grab the token part
      token = req.headers.authorization.split(' ')[1];

      // ---- Step 2: Verify the token ----
      // jwt.verify() does two things:
      //   a) Checks the signature using JWT_SECRET (proves it wasn't tampered)
      //   b) Checks the expiry date (rejects expired tokens)
      // Returns the decoded payload: { id: '...', iat: ..., exp: ... }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ---- Step 3: Find the user from the token's payload ----
      // We stored the user's _id in the token when they logged in
      // .select('-password') excludes the password field from the result
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found — token is invalid',
        });
      }

      // ---- Step 4: Pass control to the next middleware/controller ----
      next();
    } catch (error) {
      // Token is invalid (wrong secret) or expired
      console.error('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token failed',
      });
    }
  }

  // No token provided at all
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }
};

module.exports = { protect };
