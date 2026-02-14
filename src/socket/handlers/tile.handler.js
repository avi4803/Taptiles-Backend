/**
 * Tile Handler
 * Handles tile-related Socket.IO events
 */

const tileService = require('../../services/tile.service');
const gameService = require('../../services/game.service');
const { validateTileId } = require('../../utils/validators');
const { GRID, EVENTS } = require('../../config/constants');
const batchService = require('../../services/batch.service');

/**
 * Handle tile claim event
 */
function handleClaimTile(io, socket) {
  return async (data) => {
    try {
      const { gameId, tileId } = data;
      
      // Validate tile ID
      const validTileId = validateTileId(tileId, GRID.TOTAL_TILES);
      
      // Check if user is in game
      if (socket.currentGameId !== gameId) {
        socket.emit('error', { message: 'You are not in this game' });
        return;
      }
      
      // Attempt to claim tile
      const result = await tileService.claimTile(gameId, validTileId, {
        userId: socket.userId,
        username: socket.username,
        color: socket.userColor
      });
      
      if (result.success) {
        // Send confirmation to user
        socket.emit(EVENTS.TILE_CLAIMED, {
          success: true,
          tile: result.tile
        });
        
        // Broadcast via Batch Service
        batchService.addUpdate(gameId, {
            tileId: validTileId,
            color: socket.userColor,
            userId: socket.userId,
            username: socket.username,
            timestamp: Date.now()
        });
        
        // Get updated score
        const score = await gameService.getUserScore(gameId, socket.userId);
        socket.emit('scoreUpdate', { score });
        
        console.log(`🎯 ${socket.username} claimed tile ${validTileId} in game ${gameId}`);
      } else {
        // Send error to user
        socket.emit(EVENTS.TILE_CLAIMED, {
          success: false,
          message: result.message,
          tileId: validTileId
        });
      }
    } catch (error) {
      console.error('Error claiming tile:', error);
      socket.emit('error', {
        message: 'Failed to claim tile'
      });
    }
  };
}

/**
 * Handle get tiles event
 */
function handleGetTiles(io, socket) {
  return async (data) => {
    try {
      const { gameId, tileIds } = data;
      
      let tiles;
      if (tileIds && tileIds.length > 0) {
        // Get specific tiles
        tiles = await tileService.batchGetTiles(gameId, tileIds);
      } else {
        // Get all tiles
        tiles = await tileService.getAllTiles(gameId);
      }
      
      socket.emit('tilesData', {
        gameId,
        tiles
      });
    } catch (error) {
      console.error('Error getting tiles:', error);
      socket.emit('error', {
        message: 'Failed to get tiles'
      });
    }
  };
}

module.exports = {
  handleClaimTile,
  handleGetTiles
};