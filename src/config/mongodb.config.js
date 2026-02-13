const mongoose = require('mongoose');

async function connectDB(){
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`✅MongoDB connected: ${conn.connection.host}`);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
        
    }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from MongoDB');
});



// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});
module.exports = connectDB;