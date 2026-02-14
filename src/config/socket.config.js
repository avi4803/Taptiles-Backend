module.exports = {
  cors: {
    origin: "*", // Allow all origins for tunnel support
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