const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);




const PORT = 3000 ;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});