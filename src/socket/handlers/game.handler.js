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
      const { gridSize, maxPlayers } = data || {};
      
      // Create custom grid config
      const customGrid = gridSize ? {
        WIDTH: gridSize,
        HEIGHT: gridSize,
        get TOTAL_TILES() {
          return this.WIDTH * this.HEIGHT;
        }
      } : undefined;
      
      const game = await gameService.createGame(undefined, customGrid, maxPlayers, socket.userId);
      
      // Add creator as player
      const creator = {
        userId: socket.userId,
        username: socket.username,
        color: socket.userColor,
        avatar: socket.userAvatar // If exists
      };
      
      await gameService.addPlayerToGame(game.gameId, creator);
      
      // Add creator info and max players
      const gameWithPlayers = {
        ...game,
        maxPlayers: maxPlayers || null,
        creatorId: socket.userId,
        players: [creator]
      };
      
      // Join the game room
      socket.join(game.gameId);
      socket.currentGameId = game.gameId;
      
      // Broadcast to ALL clients so lobby updates
      io.emit('gameCreated', {
        success: true,
        game: gameWithPlayers
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
 * Handle get available games event (MISSING BEFORE)
 */
function handleGetAvailableGames(io, socket) {
  return async () => {
    try {
      const games = await gameService.getAllWaitingGames();
      
      socket.emit('availableGames', {
        games
      });
    } catch (error) {
      console.error('Error fetching games:', error);
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
      
      if (gameInfo.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      // Check if full
      if (gameInfo.maxPlayers && gameInfo.players && gameInfo.players.length >= gameInfo.maxPlayers) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }

      // Add player payload
      const player = {
        userId: socket.userId,
        username: socket.username,
        color: socket.userColor
      };

      // Add to Redis
      await gameService.addPlayerToGame(gameId, player);
      
      // Join Socket.IO room
      socket.join(gameId);
      socket.currentGameId = gameId;
      
      // 1. Tell the user they joined
      socket.emit('gameJoined', {
        gameId,
        gameInfo,
        yourUserId: socket.userId,
        yourUsername: socket.username,
        yourColor: socket.userColor
      });
      
      // 2. Tell everyone in the lobby (to update card)
      io.emit('playerJoined', {
        gameId,
        player
      });
      
      // 3. Tell everyone in the game room (if distinct from lobby update)
      // socket.to(gameId).emit(EVENTS.USER_JOINED, ...); 
      // Redundant if we use 'playerJoined' globally, but good for game logic
      
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
      
      // Check if user is creator (optional validation)
      // const gameInfo = await gameService.getGameInfo(gameId);
      // if (gameInfo.creatorId !== socket.userId) ... 
      
      const game = await gameService.startGame(gameId, io);
      
      // 1. Broadcast to game room to start
      io.to(gameId).emit(EVENTS.GAME_STARTED, {
        gameId,
        startTime: game.startTime,
        endTime: game.endTime,
        duration: game.duration
      });
      
      // 2. Broadcast to lobby to remove game from list
      io.emit('gameStarted', {
        gameId
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

/**
 * Handle leave game event
 */
function handleLeaveGame(io, socket) {
  return async (data) => {
    try {
      const { gameId } = data;
      const userId = socket.userId;
      
      const gameInfo = await gameService.getGameInfo(gameId);
      
      if (!gameInfo) {
          // Game doesn't exist? Maybe just ack to user.
          socket.emit('error', { message: 'Game not found' });
          return;
      }
      
      if (gameInfo.creatorId === userId) {
          // Creator left -> Cancel game
          await gameService.deleteGame(gameId);
          
          io.emit('gameCancelled', { gameId });
          console.log(`❌ Game cancelled by host: ${gameId}`);
      } else {
          // Participant left
          await gameService.removePlayerFromGame(gameId, userId);
          
          socket.leave(gameId);
          if (socket.currentGameId === gameId) {
              socket.currentGameId = null;
          }
          
          // Notify everyone so lobby updates
          io.emit('playerLeft', {
              gameId,
              userId
          });
          
          console.log(`👋 ${socket.username} left game ${gameId}`);
      }
    } catch (error) {
       console.error('Error leaving game:', error);
       socket.emit('error', { message: 'Failed to leave game' });
    }
  };
}

module.exports = {
  handleCreateGame,
  handleGetAvailableGames,
  handleJoinGame,
  handleLeaveGame,
  handleStartGame,
  handleGetLeaderboard
};