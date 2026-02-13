module.exports = {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  
  // Connection settings
  pingTimeout: 60000,
  pingInterval: 25000,
  
  // Transport settings
  transports: ['websocket', 'polling'],
  
  // Connection limits
  maxHttpBufferSize: 1e6, // 1MB
};