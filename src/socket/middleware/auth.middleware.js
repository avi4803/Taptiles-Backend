/**
 * Socket Authentication Middleware
 * Validates user credentials on socket connection
 */

const { validateUsername } = require('../../utils/validators');
const userService = require('../../services/user.service');

/**
 * Authenticate socket connection
 * Extracts username from handshake and creates session
 */
async function authMiddleware(socket, next) {
  try {
    // Get username from handshake auth
    const { username } = socket.handshake.auth;
    
    // Validate username
    const validUsername = validateUsername(username);
    
    // Create user session
    const session = await userService.createUserSession(validUsername, socket.id);
    
    // Attach user data to socket
    socket.userId = session.userId;
    socket.username = session.username;
    socket.userColor = session.color;
    
    console.log(`🔐 User authenticated: ${session.username} (${session.userId})`);
    next();

    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    next(new Error(error.message));
  }
}

module.exports = authMiddleware;