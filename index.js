require('dotenv').config();
const path = require('path');

const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const socketConfig = require('./src/config/socket.config');
const { EVENTS, GRID } = require('./src/config/constants');
const connectDB = require('./src/config/mongodb.config');
const redis = require('./src/config/redis.config');

// Import middleware and handlers
const authMiddleware = require('./src/socket/middleware/auth.middleware');
const gameHandler = require('./src/socket/handlers/game.handler');
const connectionHandler = require('./src/socket/handlers/connection.handler');

const tileService = require('./src/services/tile.service');
const tileHandler = require('./src/socket/handlers/tile.handler');



const app = express();
const server = http.createServer(app);
const io = new Server(server,socketConfig);

io.use(authMiddleware);

// Start Batch Processor
require('./src/services/batch.service').startBatchProcessor(io);

// connectDB();

redis.ping().then(()=>{
    console.log('Redis ping succesfull');
}).catch(err =>{
    console.log('Redis ping failed:',err.message);
})

tileService.loadLuaScripts().catch(err => {
  console.error('Failed to load Lua scripts:', err);
});



// Serve static files from the React app
const clientBuildPath = path.join(__dirname, '../my-project/dist');
const fs = require('fs');

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  // Use regex to match all routes for SPA fallback
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // API Mode: Return simple status for root, specific 404 for others to prevent retries
  app.get('/', (req, res) => {
    res.send('<h1>TapTile Backend is Running 🚀</h1><p>Frontend is hosted separately (Vercel).</p>');
  });
}


io.on(EVENTS.CONNECTION,(socket)=>{

    connectionHandler.handleConnection(io, socket);

    // Game events
    socket.on('createGame', gameHandler.handleCreateGame(io, socket));
    socket.on(EVENTS.JOIN_GAME, gameHandler.handleJoinGame(io, socket));
    socket.on('startGame', gameHandler.handleStartGame(io, socket));
    socket.on('getAvailableGames', gameHandler.handleGetAvailableGames(io, socket));
    socket.on('leaveGame', gameHandler.handleLeaveGame(io, socket));
    socket.on('getLeaderboard', gameHandler.handleGetLeaderboard(io, socket));

      // Tile events
    socket.on(EVENTS.CLAIM_TILE, tileHandler.handleClaimTile(io, socket));
    socket.on('getTiles', tileHandler.handleGetTiles(io, socket));

    


    socket.on('ping', (data) =>{
        console.log('Ping received from', socket.username);
        socket.emit('pong', { message: 'Pong !' });
    })
    
    socket.on('message', (data)=>{
       
        console.log('Message received by:' , socket.username,':' , data.text);
        socket.emit('messageResponse',{
             message: `Echo: ${data.text}`
        })
    })


    socket.on('testRedis', async () => {
        try {
            await redis.set(`test:${socket.userId}`, socket.username);
            const value = await redis.get(`test:${socket.userId}`);
            socket.emit('redisResponse', { 
                message: `Redis working! Stored: ${value}` 
            });
        } catch (error) {
            socket.emit('redisResponse', { 
                message: `Redis error: ${error.message}` 
            });
        }
    });

    // Handle disconnection
    socket.on(EVENTS.DISCONNECT, connectionHandler.handleDisconnect(io, socket));


});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 TapTile Backend v1.0.0`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
})