--[[
  Batch Get Tiles Script
  Retrieves multiple tile states efficiently
  
  KEYS[1] = game:${gameId}:tiles
  
  ARGV[1..n] = tileIds to retrieve
  
  Returns: Array of tile data (JSON strings or nil)
]]

local tilesKey = KEYS[1]
local result = {}

-- Loop through all tile IDs
for i = 1, #ARGV do
  local tileId = ARGV[i]
  local tileData = redis.call('HGET', tilesKey, tileId)
  
  if tileData then
    table.insert(result, tileData)
  else
    table.insert(result, cjson.encode({ tileId = tileId, owner = nil }))
  end
end

return result