/**
 * Game Constants
 * Central location for all game configuration
 */

module.exports = {
  // Grid Configuration
  GRID: {
    WIDTH: parseInt(process.env.GRID_WIDTH) || 20,
    HEIGHT: parseInt(process.env.GRID_HEIGHT) || 25,
    get TOTAL_TILES() {
      return this.WIDTH * this.HEIGHT;
    }
  },

  // Game Timing
  GAME: {
    DURATION: parseInt(process.env.GAME_DURATION) || 300000, // 5 minutes
    BATCH_UPDATE_INTERVAL: parseInt(process.env.BATCH_UPDATE_INTERVAL) || 100, // 100ms
  },

  // Socket.IO Events
  EVENTS: {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    
    // Game Events
    JOIN_GAME: 'joinGame',
    GAME_STARTED: 'gameStarted',
    GAME_ENDED: 'gameEnded',
    
    // Tile Events
    CLAIM_TILE: 'claimTile',
    TILE_CLAIMED: 'tileClaimed',
    BATCH_UPDATE: 'batchUpdate',
    
    // User Events
    USER_JOINED: 'userJoined',
    USER_LEFT: 'userLeft',
  },

  // Error Messages
  ERRORS: {
    GAME_NOT_FOUND: 'Game not found',
    GAME_NOT_ACTIVE: 'Game is not active',
    TILE_ALREADY_CLAIMED: 'Tile already claimed',
    INVALID_USERNAME: 'Invalid username',
  }
};