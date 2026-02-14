/**
 * Batch Update Service
 * Handles accumulating tile updates and broadcasting them efficiently
 */

const { EVENTS, GAME } = require('../config/constants');

// Map<gameId, Update[]>
// Update: { tileId, color, userId, username, timestamp }
const updateQueue = new Map();

/**
 * Add an update to the batch
 * @param {string} gameId 
 * @param {object} update 
 */
function addUpdate(gameId, update) {
    // console.log(`➕ Adding update to batch for game ${gameId}:`, update);
    
    if (!updateQueue.has(gameId)) {
        updateQueue.set(gameId, []);
    }
    const updates = updateQueue.get(gameId);
    
    // Check if this tile is already in the batch
    // If so, update the existing entry (last writer wins in the batch window).
    const existingIndex = updates.findIndex(u => u.tileId === update.tileId);
    if (existingIndex !== -1) {
        updates[existingIndex] = {
            ...updates[existingIndex],
            ...update
        };
    } else {
        updates.push(update);
    }
}

/**
 * Start the batch processor
 * @param {object} io - Socket.IO instance
 */
function startBatchProcessor(io) {
    console.log(`🚀 Batch processor started (Interval: ${GAME.BATCH_UPDATE_INTERVAL}ms)`);
    
    setInterval(() => {
        processBatches(io);
    }, GAME.BATCH_UPDATE_INTERVAL);
}

/**
 * Process and broadcast batches
 * @param {object} io 
 */
function processBatches(io) {
    if (updateQueue.size === 0) return;

    for (const [gameId, updates] of updateQueue.entries()) {
        if (updates.length > 0) {
            // Broadcast to the game room
            io.to(gameId).emit(EVENTS.BATCH_UPDATE, {
                updates,
                timestamp: Date.now()
            });
            console.log(`📦 Broadcasted ${updates.length} updates for game ${gameId}`);
        }
        
        // Clear the queue for this game
        updateQueue.delete(gameId);
    }
}

module.exports = {
    addUpdate,
    startBatchProcessor
};
