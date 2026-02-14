/**
 * Tile Service
 * Manages tile claiming and retrieval using Lua scripts
 */

const redis = require('../config/redis.config');
const fs = require('fs').promises;
const path = require('path');
const gameService = require('./game.service');

// Store loaded Lua scripts
let claimTileScript = null;
let batchGetTilesScript = null;

/**
 * Load Lua scripts into Redis
 */
async function loadLuaScripts() {
  try {
    // Read Lua files
    const claimTilePath = path.join(__dirname, '../scripts/lua/claimTile.lua');
    const batchGetTilesPath = path.join(__dirname, '../scripts/lua/batchGetTiles.lua');
    
    const claimTileLua = await fs.readFile(claimTilePath, 'utf8');
    const batchGetTilesLua = await fs.readFile(batchGetTilesPath, 'utf8');
    
    // Load scripts into Redis (returns SHA1 hash)
    claimTileScript = await redis.script('load', claimTileLua);
    batchGetTilesScript = await redis.script('load', batchGetTilesLua);
    
    console.log('✅ Lua scripts loaded');
    console.log(`   - claimTile: ${claimTileScript}`);
    console.log(`   - batchGetTiles: ${batchGetTilesScript}`);
  } catch (error) {
    console.error('❌ Failed to load Lua scripts:', error);
    throw error;
  }
}

/**
 * Claim a tile for a user
 * @param {string} gameId - Game ID
 * @param {number} tileId - Tile ID
 * @param {object} user - User object {userId, username, color}
 * @returns {object} Result {success, message, tile}
 */


async function claimTile(gameId, tileId, user) {
  // Check if game is active
  const isActive = await gameService.isGameActive(gameId);
  if (!isActive) {
    return {
      success: false,
      message: 'Game is not active'
    };
  }
  
  // Execute Lua script
  const result = await redis.evalsha(
    claimTileScript,
    2, // Number of keys
    `game:${gameId}:tiles`,
    `game:${gameId}:scores`,
    tileId,
    user.userId,
    user.username,
    user.color,
    Date.now()
  );
  
  if (result === 1) {
    // Success
    const tileData = {
      tileId,
      userId: user.userId,
      username: user.username,
      color: user.color,
      claimedAt: Date.now()
    };
    
    // Add to batch update queue
    // Batch update handled by handler/batchService logic directly
    
    return {
      success: true,
      message: 'Tile claimed',
      tile: tileData
    };
  } else if (result === 0) {
    // Already claimed
    return {
      success: false,
      message: 'Tile already claimed'
    };
  } else {
    // Game not active
    return {
      success: false,
      message: 'Game is not active'
    };
  }
}

/**
 * Get tile state
 * @param {string} gameId - Game ID
 * @param {number} tileId - Tile ID
 * @returns {object|null} Tile data or null
 */
async function getTile(gameId, tileId) {
  const data = await redis.hget(`game:${gameId}:tiles`, tileId);
  return data ? JSON.parse(data) : null;
}

/**
 * Get multiple tiles efficiently
 * @param {string} gameId - Game ID
 * @param {array} tileIds - Array of tile IDs
 * @returns {array} Array of tile data
 */
async function batchGetTiles(gameId, tileIds) {
  if (!tileIds || tileIds.length === 0) {
    return [];
  }
  
  const results = await redis.evalsha(
    batchGetTilesScript,
    1,
    `game:${gameId}:tiles`,
    ...tileIds
  );
  
  return results.map(data => JSON.parse(data));
}

/**
 * Get all tiles for a game
 * @param {string} gameId - Game ID
 * @returns {object} Map of tileId -> tile data
 */
async function getAllTiles(gameId) {
  const tiles = await redis.hgetall(`game:${gameId}:tiles`);
  
  const result = {};
  for (const [tileId, data] of Object.entries(tiles)) {
    result[tileId] = JSON.parse(data);
  }
  
  return result;
}

module.exports = {
  loadLuaScripts,
  claimTile,
  getTile,
  batchGetTiles,
  getAllTiles
};