/**
 * Input Validators
 * Validates user input and game data
 */

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {string} Trimmed username
 * @throws {Error} If invalid
 */


function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 2) {
    throw new Error('Username must be at least 2 characters');
  }
  
  if (trimmed.length > 20) {
    throw new Error('Username must be at most 20 characters');
  }
  
  // Check for valid characters (alphanumeric, spaces, underscores)
  if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
    throw new Error('Username can only contain letters, numbers, spaces, and underscores');
  }
  
  return trimmed;
}

/**
 * Validate tile ID
 * @param {number} tileId - Tile ID to validate
 * @param {number} maxTiles - Maximum number of tiles
 * @returns {number} Validated tile ID
 * @throws {Error} If invalid
 */
function validateTileId(tileId, maxTiles) {
  const id = parseInt(tileId);
  
  if (isNaN(id) || id < 0 || id >= maxTiles) {
    throw new Error('Invalid tile ID');
  }
  
  return id;
}


module.exports = {
  validateUsername,
  validateTileId
};