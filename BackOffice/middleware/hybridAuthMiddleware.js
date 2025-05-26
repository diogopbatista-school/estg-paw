const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../jwt_secret/config');

/**
 * Hybrid authentication middleware that supports both JWT tokens and session-based auth
 * This allows API endpoints to be accessed from both mobile apps (JWT) and web dashboard (session)
 */
const hybridAuth = (req, res, next) => {
  // Check for JWT token first
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      console.log('JWT verification failed:', error.message);
      // Continue to check session auth
    }
  }
  
  // Check for session-based authentication
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  // Neither authentication method worked
  return res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

module.exports = { hybridAuth };
