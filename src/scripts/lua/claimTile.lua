--[[
  Claim Tile Script
  Atomically claims a tile for a user
  
  KEYS[1] = game:${gameId}:tiles (hash of tile states)
  KEYS[2] = game:${gameId}:scores (hash of user scores)
  
  ARGV[1] = tileId
  ARGV[2] = userId
  ARGV[3] = username
  ARGV[4] = color
  ARGV[5] = timestamp
  
  Returns:
  - 1: Success (tile claimed)
  - 0: Tile already claimed
  - -1: Game not active
]]

local tilesKey = KEYS[1]
local scoresKey = KEYS[2]

local tileId = ARGV[1]
local userId = ARGV[2]
local username = ARGV[3]
local color = ARGV[4]
local timestamp = ARGV[5]

-- Check if tile is already claimed
local currentOwner = redis.call('HGET', tilesKey, tileId)

if currentOwner and currentOwner ~= '' then
  -- Tile already claimed
  return 0
end

-- Claim the tile
local tileData = cjson.encode({
  userId = userId,
  username = username,
  color = color,
  claimedAt = timestamp
})

redis.call('HSET', tilesKey, tileId, tileData)

-- Increment user score
redis.call('HINCRBY', scoresKey, userId, 1)

-- Return success
return 1