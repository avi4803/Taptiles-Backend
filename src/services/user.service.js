const redis = require('../config/redis.config');
const { v4: uuidv4 } = require('uuid');

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D'
];

function generateUserId(){
    return uuidv4();
}

function assignUserColor(){
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

/**
 * Create user session in Redis
 * @param {string} username - User's chosen username
 * @param {string} socketId - Socket.IO connection ID
 * @returns {Object} User session object
 */

async function createUserSession(username,socketId) {
    const userId = generateUserId();
    const color = assignUserColor();

    const session = {
        userId,
        username,
        color,
        socketId,
        joinedAt: Date.now()
    };

    // Store in Redis with 1 hour expiry
    await redis.setex(
    `user:${userId}:session`,
    3600,
    JSON.stringify(session)
  ); 

  console.log(`✅ User session created: ${userId} (${username})`);
  return session;    
}



/**
 * Get user session from Redis
 * @param {string} userId - User ID
 * @returns {Object|null} User session or null
 */
async function getUserSession(userId) {
  const data = await redis.get(`user:${userId}:session`);
  return data ? JSON.parse(data) : null;
}


/**
 * Update user's socket ID (on reconnect)
 * @param {string} userId - User ID
 * @param {string} newSocketId - New socket ID
 * @returns {Object|null} Updated session or null
 */
async function updateUserSocket(userId, newSocketId) {
  const session = await getUserSession(userId);
  if (session) {
    session.socketId = newSocketId;
    await redis.setex(
      `user:${userId}:session`,
      3600,
      JSON.stringify(session)
    );
    console.log(`🔄 Socket updated for user: ${userId}`);
  }
  return session;
}



/**
 * Delete user session
 * @param {string} userId - User ID
 */
async function deleteUserSession(userId) {
  await redis.del(`user:${userId}:session`);
  console.log(`🗑️ User session deleted: ${userId}`);
}



module.exports = {
  createUserSession,
  getUserSession,
  updateUserSocket,
  deleteUserSession,
  generateUserId,
  assignUserColor
};