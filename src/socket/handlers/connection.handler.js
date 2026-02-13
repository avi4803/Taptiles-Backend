/**
 * Connection Handler
 * Handles socket connection and disconnection events
 */

const userService = require('../../services/user.service');
const { EVENTS } = require('../../config/constants');




/**
 * Update and broadcast user count
 */
async function updateUserCount(io) {
  const sockets = await io.fetchSockets();
  const count = sockets.length;
  
  io.emit('userCount', count);
  console.log(`👥 Active users: ${count}`);
}


/**
 * Handle new connection
 */
function handleConnection(io, socket) {
  console.log(`✅ User connected: ${socket.username} (${socket.id})`);
  
  // Send welcome message with user info
  socket.emit(EVENTS.USER_JOINED, {
    userId: socket.userId,
    username: socket.username,
    color: socket.userColor,
    message: `Welcome, ${socket.username}!`
  });
  
  // Broadcast to others that new user joined
  socket.broadcast.emit(EVENTS.USER_JOINED, {
    userId: socket.userId,
    username: socket.username,
    color: socket.userColor
  });
  
  // Update user count
  updateUserCount(io);
}

/**
 * Handle disconnection
 */
function handleDisconnect(io, socket) {
  return async () => {
    console.log(`❌ User disconnected: ${socket.username} (${socket.id})`);
    
    // Clean up user session
    await userService.deleteUserSession(socket.userId);
    
    // Notify others
    socket.broadcast.emit(EVENTS.USER_LEFT, {
      userId: socket.userId,
      username: socket.username
    });
    
    // Update user count
    updateUserCount(io);
  };
}



module.exports = {
  handleConnection,
  handleDisconnect
};