/**
 * Game Service
 * Manages game lifecycle: creation, starting, ending
 */

const redis = require('../config/redis.config');
const { GRID, GAME } = require('../config/constants');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for batch updates
const updateQueues = new Map();

async function createGame(duration = GAME.DURATION, gridSize = GRID, maxPlayers = null, creatorId = null) {
  const gameId = uuidv4();
  
  const gameMeta = {
    gameId,
    status: 'waiting',
    startTime: null,
    endTime: null,
    duration,
    gridSize: {
      width: gridSize.WIDTH,
      height: gridSize.HEIGHT
    },
    totalTiles: gridSize.TOTAL_TILES,
    createdAt: Date.now(),
    maxPlayers,
    creatorId
  };
  
  // Store in Redis with 3 minute expiry (auto-dispose if not started)
  await redis.setex(
    `game:${gameId}:meta`,
    180, 
    JSON.stringify(gameMeta)
  );

  // Add to waiting games list
  await redis.sadd('games:waiting', gameId);
  
  console.log(`🎮 Game created: ${gameId}`);
  return gameMeta;
}

/**
 * Start a game
 * @param {string} gameId - Game ID
 * @param {object} io - Socket.IO instance
 * @returns {object} Updated game metadata
 */
async function startGame(gameId, io) {
  const meta = await getGameInfo(gameId);
  
  if (!meta) {
    throw new Error('Game not found');
  }
  
  if (meta.status !== 'waiting') {
    throw new Error('Game already started');
  }
  
  const now = Date.now();
  meta.status = 'active';
  meta.startTime = now;
  meta.endTime = now + meta.duration;
  
  // Update in Redis - Extend to 2 hours
  await redis.setex(
    `game:${gameId}:meta`,
    7200,
    JSON.stringify(meta)
  );

  // Remove from waiting games
  await redis.srem('games:waiting', gameId);
  
  // Batch update handled by batch.service.js global processor
  
  // Start countdown timer
  setTimeout(() => {
    endGame(gameId, io);
  }, meta.duration);
  
  console.log(`🎮 Game started: ${gameId}`);
  return meta;
}

/**
 * End a game
 * @param {string} gameId - Game ID
 * @param {object} io - Socket.IO instance
 */
async function endGame(gameId, io) {
  const meta = await getGameInfo(gameId);
  
  if (!meta || meta.status !== 'active') {
    return;
  }
  
  meta.status = 'ended';
  meta.endTime = Date.now();
  
  // Update in Redis
  await redis.setex(
    `game:${gameId}:meta`,
    7200,
    JSON.stringify(meta)
  );

  // Ensure removed from waiting games
  await redis.srem('games:waiting', gameId);
  
  // Stop batch updates
  const intervalId = updateQueues.get(`${gameId}:interval`);
  if (intervalId) {
    clearInterval(intervalId);
    updateQueues.delete(`${gameId}:interval`);
    updateQueues.delete(gameId);
  }
  
  // Get final leaderboard
  const leaderboard = await getLeaderboard(gameId, 10);
  
  // Broadcast game ended
  io.to(gameId).emit('gameEnded', {
    gameId,
    endTime: meta.endTime,
    leaderboard
  });
  
  console.log(`🏁 Game ended: ${gameId}`);
  
  // TODO: Queue job to save to MongoDB (Phase 7)
}

/**
 * Initialize batch update system
 * @param {string} gameId - Game ID
 * @param {object} io - Socket.IO instance
 */
function initBatchUpdateSystem(gameId, io) {
  updateQueues.set(gameId, []);
  
  const interval = setInterval(() => {
    const queue = updateQueues.get(gameId);
    
    if (queue && queue.length > 0) {
      // Broadcast batch updates to all clients in game room
      io.to(gameId).emit('batchUpdate', queue);
      
      // Clear queue
      updateQueues.set(gameId, []);
      
      console.log(`📦 Batch update sent: ${queue.length} tiles`);
    }
  }, GAME.BATCH_UPDATE_INTERVAL);
  
  // Store interval ID for cleanup
  updateQueues.set(`${gameId}:interval`, interval);
}

/**
 * Add tile update to batch queue
 * @param {string} gameId - Game ID
 * @param {object} tileUpdate - Tile update data
 */
function addToBatchQueue(gameId, tileUpdate) {
  const queue = updateQueues.get(gameId);
  if (queue) {
    queue.push(tileUpdate);
  }
}

/**
 * Check if game is active
 * @param {string} gameId - Game ID
 * @returns {boolean} True if active
 */
async function isGameActive(gameId) {
  const meta = await getGameInfo(gameId);
  return meta && meta.status === 'active';
}

/**
 * Get game metadata
 * @param {string} gameId - Game ID
 * @returns {object|null} Game metadata or null
 */
async function getGameInfo(gameId) {
  const data = await redis.get(`game:${gameId}:meta`);
  return data ? JSON.parse(data) : null;
}

/**
 * Add player to game
 * @param {string} gameId - Game ID
 * @param {object} player - Player object
 */
async function addPlayerToGame(gameId, player) {
  await redis.hset(
    `game:${gameId}:players`,
    player.userId,
    JSON.stringify(player)
  );
  // Set expiry to match game meta
  await redis.expire(`game:${gameId}:players`, 7200);
}

/**
 * Remove player from game
 * @param {string} gameId - Game ID
 * @param {string} userId - User ID
 */
async function removePlayerFromGame(gameId, userId) {
  await redis.hdel(`game:${gameId}:players`, userId);
}

/**
 * Get game players
 * @param {string} gameId - Game ID
 * @returns {Array} List of players
 */
async function getGamePlayers(gameId) {
  const playersMap = await redis.hgetall(`game:${gameId}:players`);
  if (!playersMap) return [];
  
  return Object.values(playersMap).map(p => JSON.parse(p));
}

/**
 * Get all available (waiting) games
 * @returns {Array} List of games with meta and players
 */
async function getAllWaitingGames() {
  const gameIds = await redis.smembers('games:waiting');
  const games = [];

  for (const id of gameIds) {
    const meta = await getGameInfo(id);
    if (meta) {
      const players = await getGamePlayers(id);
      games.push({
        ...meta,
        players
      });
    } else {
      // Clean up stale ID
      await redis.srem('games:waiting', id);
    }
  }
  
  return games;
}

/**
 * Get remaining time
 * @param {string} gameId - Game ID
 * @returns {number} Remaining time in ms
 */
async function getRemainingTime(gameId) {
  const meta = await getGameInfo(gameId);
  if (!meta || meta.status !== 'active') {
    return 0;
  }
  return Math.max(0, meta.endTime - Date.now());
}

/**
 * Get user score in game
 * @param {string} gameId - Game ID
 * @param {string} userId - User ID
 * @returns {number} User's score
 */
async function getUserScore(gameId, userId) {
  const score = await redis.hget(`game:${gameId}:scores`, userId);
  return score ? parseInt(score) : 0;
}

/**
 * Get leaderboard
 * @param {string} gameId - Game ID
 * @param {number} limit - Number of top players
 * @returns {array} Leaderboard array
 */
async function getLeaderboard(gameId, limit = 10) {
  // Get all scores
  const scores = await redis.hgetall(`game:${gameId}:scores`);
  
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }
  
  // Convert to array and sort
  const leaderboard = Object.entries(scores)
    .map(([userId, score]) => ({
      userId,
      score: parseInt(score)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  
  // Get usernames from sessions
  for (const entry of leaderboard) {
    const session = await redis.get(`user:${entry.userId}:session`);
    if (session) {
      const userData = JSON.parse(session);
      entry.username = userData.username;
      entry.color = userData.color;
    }
  }
  
  return leaderboard;
}

/**
 * Delete a game completely
 * @param {string} gameId - Game ID
 */
async function deleteGame(gameId) {
  await redis.del(`game:${gameId}:meta`);
  await redis.del(`game:${gameId}:players`);
  await redis.srem('games:waiting', gameId);
  // Also clear scores if any
  await redis.del(`game:${gameId}:scores`);
}

module.exports = {
  createGame,
  startGame,
  endGame,
  deleteGame,
  isGameActive,
  getGameInfo,
  getRemainingTime,
  getUserScore,
  getLeaderboard,
  addToBatchQueue,
  addPlayerToGame,
  removePlayerFromGame,
  getGamePlayers,
  getAllWaitingGames
};