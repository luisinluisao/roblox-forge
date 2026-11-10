--!nocheck
-- roblox-forge runtime probe. Run with execute_luau in the SERVER and CLIENT datamodels while playing.
-- Every metric is wrapped so a missing stat shows "n/a" instead of failing the probe.
local Stats = game:GetService("Stats")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local lines = {}
local function try(label, fn)
	local ok, v = pcall(fn)
	table.insert(lines, string.format("%-26s %s", label, ok and tostring(v) or "n/a"))
end

try("context", function() return RunService:IsServer() and "server" or "client" end)
try("physics FPS", function() return string.format("%.1f", workspace:GetRealPhysicsFPS()) end)
try("instances", function() return Stats.InstanceCount end)
try("total memory MB", function() return math.floor(Stats:GetTotalMemoryUsageMb()) end)
try("heartbeat ms", function() return string.format("%.2f", Stats.HeartbeatTimeMs) end)
try("physics step ms", function() return string.format("%.2f", Stats.PhysicsStepTimeMs) end)
try("data send KB/s", function() return string.format("%.1f", Stats.DataSendKbps) end)
try("data recv KB/s", function() return string.format("%.1f", Stats.DataReceiveKbps) end)
try("players", function() return #Players:GetPlayers() end)
try("BaseParts", function()
	local c = 0
	for _, d in ipairs(workspace:GetDescendants()) do if d:IsA("BasePart") then c += 1 end end
	return c
end)
try("unanchored BaseParts", function()
	local c = 0
	for _, d in ipairs(workspace:GetDescendants()) do if d:IsA("BasePart") and not d.Anchored then c += 1 end end
	return c
end)
try("top memory tags (MB)", function()
	local list = {}
	for _, tag in ipairs(Enum.DeveloperMemoryTag:GetEnumItems()) do
		local okT, mb = pcall(function() return Stats:GetMemoryUsageMbForTag(tag) end)
		if okT and mb > 1 then table.insert(list, { tag.Name, mb }) end
	end
	table.sort(list, function(a, b) return a[2] > b[2] end)
	local top = {}
	for i = 1, math.min(5, #list) do table.insert(top, string.format("%s=%.0f", list[i][1], list[i][2])) end
	return table.concat(top, ", ")
end)
-- 3 s frame-rate sample (keep short; execute_luau has a time limit)
try("avg heartbeat FPS (3s)", function()
	local frames, t0 = 0, os.clock()
	local conn = RunService.Heartbeat:Connect(function() frames += 1 end)
	task.wait(3)
	conn:Disconnect()
	return string.format("%.1f", frames / (os.clock() - t0))
end)

return table.concat(lines, "\n")
