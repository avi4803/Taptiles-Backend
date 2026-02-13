const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


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
                }
            </style>
        </head>
        <body>
            <h1>🎮 TapTile Socket.IO Test</h1>
            
            <p>Status: <span id="status">Disconnected</span></p>
            <p>Your Socket ID: <span id="socketId">-</span></p>
            
            <button onclick="sendPing()">Send Ping</button>
            <button onclick="sendMessage()">Send Message</button>
            
            <div id="messages"></div>
            
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const messagesDiv = document.getElementById('messages');
                
                function addMessage(msg) {
                    const p = document.createElement('p');
                    p.textContent = msg;
                    messagesDiv.appendChild(p);
                }
                
                socket.on('connect', () => {
                    document.getElementById('status').textContent = 'Connected';
                    document.getElementById('status').style.color = 'green';
                    document.getElementById('socketId').textContent = socket.id;
                    addMessage('✅ Connected to server');
                });
                
                socket.on('disconnect', () => {
                    document.getElementById('status').textContent = 'Disconnected';
                    document.getElementById('status').style.color = 'red';
                    addMessage('❌ Disconnected from server');
                });
                
                socket.on('welcome', (message) => {
                    addMessage('📨 ' + message);
                });
                
                socket.on('pong', (data) => {
                    addMessage('🏓 Pong received: ' + data.message);
                });
                
                socket.on('messageResponse', (data) => {
                    addMessage('💬 Server: ' + data.message);
                });
                
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
            </script>
        </body>
        </html>
    `);
});


io.on('connection',(socket)=>{
    console.log('User connected', socket.id);

    socket.emit('welcome','Welcome to TapTile');

    socket.on('ping', (data) =>{
        console.log('Ping received from', socket.id, data);
        socket.emit('pong', { message: 'Pong received' });
    })
    
    socket.on('message', (data)=>{
       
        console.log('Message received by:' , socket.id , data.text);
        socket.emit('messageResponse',{
             message: `Echo: ${data.text}`
        })
    })

    socket.on('disconnect',()=>{
        console.log('User disconnected', socket.id);
    });
});


const PORT = 3000 ;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});