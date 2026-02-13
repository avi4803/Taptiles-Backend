/**
 * Game Handler
 * Handles game-related Socket.IO events
 */

const gameService = require('../../services/game.service');
const { EVENTS, GRID } = require('../../config/constants');

/**
 * Handle create game event
 */
function handleCreateGame(io, socket) {
    
  return async (data) => {
    try {
      const game = await gameService.createGame();
      
      socket.emit('gameCreated', {
        success: true,
        game
      });
      
      console.log(`🎮 ${socket.username} created game: ${game.gameId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', {
        message: 'Failed to create game'
      });
    }
  };
}

/**
 * Handle join game event
 */
function handleJoinGame(io, socket) {
  return async (data) => {
    try {
      const { gameId } = data;
      
      // Get game info
      const gameInfo = await gameService.getGameInfo(gameId);
      
      if (!gameInfo) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Join Socket.IO room
      socket.join(gameId);
      socket.currentGameId = gameId;
      
      // Send game state to user
      socket.emit('gameJoined', {
        gameId,
        gameInfo,
        yourUserId: socket.userId,
        yourUsername: socket.username,
        yourColor: socket.userColor
      });
      
      // Notify others
      socket.to(gameId).emit(EVENTS.USER_JOINED, {
        username: socket.username,
        userId: socket.userId,
        color: socket.userColor
      });
      
      console.log(`🎮 ${socket.username} joined game ${gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', {
        message: 'Failed to join game'
      });
    }
  };
}

/**
 * Handle start game event
 */
function handleStartGame(io, socket) {
  return async (data) => {
    try {
      const { gameId } = data;
      
      const game = await gameService.startGame(gameId, io);
      
      // Broadcast to all players in game
      io.to(gameId).emit(EVENTS.GAME_STARTED, {
        gameId,
        startTime: game.startTime,
        endTime: game.endTime,
        duration: game.duration
      });
      
      console.log(`🎮 Game started: ${gameId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', {
        message: error.message
      });
    }
  };
}

/**
 * Handle get leaderboard event
 */
function handleGetLeaderboard(io, socket) {
  return async (data) => {
    try {
      const { gameId } = data;
      
      const leaderboard = await gameService.getLeaderboard(gameId, 10);
      
      socket.emit('leaderboardUpdate', {
        gameId,
        leaderboard
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      socket.emit('error', {
        message: 'Failed to get leaderboard'
      });
    }
  };
}

module.exports = {
  handleCreateGame,
  handleJoinGame,
  handleStartGame,
  handleGetLeaderboard
};