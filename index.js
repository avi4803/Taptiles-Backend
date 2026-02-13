require('dotenv').config();

const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const socketConfig = require('./src/config/socket.config');
const { EVENTS, GRID } = require('./src/config/constants');
const connectDB = require('./src/config/mongodb.config');
const redis = require('./src/config/redis.config');

// Import middleware and handlers
const authMiddleware = require('./src/socket/middleware/auth.middleware');
const connectionHandler = require('./src/socket/handlers/connection.handler');


const app = express();
const server = http.createServer(app);
const io = new Server(server,socketConfig);

// connectDB();

redis.ping().then(()=>{
    console.log('Redis ping succesfull');
}).catch(err =>{
    console.log('Redis ping failed:',err.message);
})


app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>TapTile Test</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                }
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    margin: 5px;
                }
                #messages {
                    border: 1px solid #ccc;
                    padding: 10px;
                    margin-top: 20px;
                    min-height: 100px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                .info {
                    background: #e3f2fd;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                #loginForm {
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                #gameArea {
                    display: none;
                }
            </style>
        </head>
        <body>
            <h1>🎮 TapTile - Phase 2 Test</h1>
            
            <div class="info">
                <strong>Game Config:</strong><br>
                Grid: ${GRID.WIDTH}x${GRID.HEIGHT} (${GRID.TOTAL_TILES} tiles)<br>
                Environment: ${process.env.NODE_ENV}
            </div>
            
            <!-- Login Form -->
            <div id="loginForm">
                <h2>Enter Username</h2>
                <input type="text" id="usernameInput" placeholder="Your username" maxlength="20">
                <button onclick="connect()">Connect</button>
                <p id="loginError" style="color: red;"></p>
            </div>
            
            <!-- Game Area (shown after login) -->
            <div id="gameArea">
                <p>Status: <span id="status">Disconnected</span></p>
                <p>Username: <span id="displayUsername">-</span></p>
                <p>Color: <span id="displayColor" style="padding: 5px 10px; border-radius: 3px;">-</span></p>
                <p>Active Users: <span id="userCount">0</span></p>
                
                <button onclick="sendPing()">Send Ping</button>
                <button onclick="sendMessage()">Send Message</button>
                <button onclick="testRedis()">Test Redis</button>
                
                <div id="messages"></div>
            </div>
            
            <script src="/socket.io/socket.io.js"></script>
            <script>
                let socket;
                const messagesDiv = document.getElementById('messages');
                
                function addMessage(msg) {
                    const p = document.createElement('p');
                    p.textContent = msg;
                    messagesDiv.appendChild(p);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
                
                function connect() {
                    const username = document.getElementById('usernameInput').value.trim();
                    
                    if (!username) {
                        document.getElementById('loginError').textContent = 'Please enter a username';
                        return;
                    }
                    
                    // Connect with username in auth
                    socket = io({
                        auth: {
                            username: username
                        }
                    });
                    
                    socket.on('connect', () => {
                        document.getElementById('loginForm').style.display = 'none';
                        document.getElementById('gameArea').style.display = 'block';
                        document.getElementById('status').textContent = 'Connected';
                        document.getElementById('status').style.color = 'green';
                        addMessage('✅ Connected to server');
                    });
                    
                    socket.on('connect_error', (error) => {
                        document.getElementById('loginError').textContent = error.message;
                        addMessage('❌ Connection error: ' + error.message);
                    });
                    
                    socket.on('disconnect', () => {
                        document.getElementById('status').textContent = 'Disconnected';
                        document.getElementById('status').style.color = 'red';
                        addMessage('❌ Disconnected from server');
                    });
                    
                    socket.on('${EVENTS.USER_JOINED}', (data) => {
                        document.getElementById('displayUsername').textContent = data.username;
                        document.getElementById('displayColor').textContent = data.color;
                        document.getElementById('displayColor').style.backgroundColor = data.color;
                        if (data.message) {
                            addMessage('👋 ' + data.message);
                        } else {
                            addMessage('👋 ' + data.username + ' joined');
                        }
                    });
                    
                    socket.on('${EVENTS.USER_LEFT}', (data) => {
                        addMessage('👋 ' + data.username + ' left');
                    });
                    
                    socket.on('userCount', (count) => {
                        document.getElementById('userCount').textContent = count;
                    });
                    
                    socket.on('pong', (data) => {
                        addMessage('🏓 Pong: ' + data.message);
                    });
                    
                    socket.on('messageResponse', (data) => {
                        addMessage('💬 Server: ' + data.message);
                    });
                    
                    socket.on('redisResponse', (data) => {
                        addMessage('🔴 Redis: ' + data.message);
                    });
                }
                
                function sendPing() {
                    socket.emit('ping', { timestamp: Date.now() });
                    addMessage('🏓 Ping sent');
                }
                
                function sendMessage() {
                    const msg = prompt('Enter a message:');
                    if (msg) {
                        socket.emit('message', { text: msg });
                        addMessage('📤 You: ' + msg);
                    }
                }
                
                function testRedis() {
                    socket.emit('testRedis');
                    addMessage('🔴 Testing Redis...');
                }
            </script>
        </body>
        </html>
    `);
});


io.on(EVENTS.CONNECTION,(socket)=>{

    connectionHandler.handleConnection(io, socket);


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