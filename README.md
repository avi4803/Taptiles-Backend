# 🎮 TapTile - Real-Time Multiplayer Tile Claiming Game

A real-time multiplayer game where players compete to claim tiles on a shared grid. Built with Socket.IO, Redis, and MongoDB.

## 🚀 Features

- **Real-time gameplay** with Socket.IO WebSockets
- **Race condition prevention** using Redis Lua scripts
- **Optimized updates** with batch broadcasting (100ms intervals)
- **Persistent storage** with MongoDB via Bull queue workers
- **No authentication required** - just enter a username and play
- **Live leaderboard** with real-time ranking updates
- **Scalable architecture** supporting 1000+ concurrent players

## 🏗️ Architecture

```
Client (Browser) 
    ↓ Socket.IO
Server (Node.js + Express)
    ↓
Redis (Hot Data - Active Game State)
    ↓ Bull Queue
Worker (Background Jobs)
    ↓
MongoDB (Cold Data - Game History)
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- Redis >= 6.0
- MongoDB >= 5.0

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd TapTile/Backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Redis** (if not running)
```bash
redis-server
```

5. **Start MongoDB** (if not running)
```bash
mongod
```

## 🎯 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # MongoDB schemas
│   ├── services/        # Business logic
│   ├── scripts/lua/     # Redis Lua scripts
│   ├── workers/         # Bull queue workers
│   ├── socket/          # Socket.IO handlers
│   ├── utils/           # Utility functions
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point
├── public/              # Static files
├── tests/               # Test files
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

## 🎮 How to Play

1. Open `http://localhost:3000` in your browser
2. Enter your username
3. Click tiles to claim them
4. Compete with other players for the highest score
5. Watch the leaderboard update in real-time

## 🔧 Configuration

Key environment variables in `.env`:

- `PORT` - Server port (default: 3000)
- `REDIS_HOST` - Redis host
- `MONGODB_URI` - MongoDB connection string
- `GAME_DURATION` - Game duration in milliseconds
- `GRID_WIDTH` - Grid width (tiles)
- `GRID_HEIGHT` - Grid height (tiles)

## 📊 API Events (Socket.IO)

### Client → Server
- `claimTile` - Claim a tile
- `joinGame` - Join a game room
- `getGameState` - Request current game state

### Server → Client
- `tileUpdate` - Single tile claimed
- `batchUpdate` - Multiple tiles updated
- `leaderboardUpdate` - Leaderboard changed
- `gameEnded` - Game finished

## 🚀 Deployment

### Using Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Set `NODE_ENV=production` in `.env`
2. Configure production Redis and MongoDB URLs
3. Run `npm start`

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👥 Authors

- Your Name

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- Redis for fast in-memory data storage
- Bull for reliable job queuing
