--!nocheck
-- roblox-forge scene audit. Run with execute_luau in the EDIT datamodel. Returns a text report.
local Lighting = game:GetService("Lighting")
local MaterialService = game:GetService("MaterialService")

local CAP = 10
local lines = {}
local function out(s) table.insert(lines, s) end
local function sample(list, inst)
	if #list < CAP then table.insert(list, inst:GetFullName()) end
end
local function near(a, b)
	return math.abs(a.R - b.R) + math.abs(a.G - b.G) + math.abs(a.B - b.B) < 0.03
end

local GREY_DEFAULT = Color3.fromRGB(163, 162, 165) -- default Part colour
local GREY_BASEPLATE = Color3.fromRGB(99, 95, 98)

local n = { parts = 0, meshes = 0, unions = 0, anchored = 0, unanchored = 0, lights = 0, emitters = 0, sounds = 0, spawns = 0, unnamed = 0, terrain = false }
local materials = {}
local bad = { defaultLook = {}, meshNoTexture = {}, looseUnanchored = {}, dupes = {}, hugeFlat = {} }
local seen = {}
local dupeCount, defaultLookCount, meshNoTexCount, looseCount = 0, 0, 0, 0

for _, d in ipairs(workspace:GetDescendants()) do
	if d:IsA("Terrain") then
		n.terrain = true
	elseif d:IsA("BasePart") then
		n.parts += 1
		materials[d.Material.Name] = (materials[d.Material.Name] or 0) + 1
		if d.Name == "Part" then n.unnamed += 1 end
		if d:IsA("SpawnLocation") then n.spawns += 1 end
		if d:IsA("MeshPart") then
			n.meshes += 1
			if d.TextureID == "" and not d:FindFirstChildOfClass("SurfaceAppearance") then
				meshNoTexCount += 1
				sample(bad.meshNoTexture, d)
			end
		elseif d:IsA("UnionOperation") then
			n.unions += 1
		end
		if d.Anchored then
			n.anchored += 1
		else
			n.unanchored += 1
			local okJ, joints = pcall(function() return d:GetJoints() end)
			if okJ and #joints == 0 and not d:FindFirstAncestorWhichIsA("Model") then
				looseCount += 1
				sample(bad.looseUnanchored, d)
			end
		end
		if d.Material == Enum.Material.Plastic and (near(d.Color, GREY_DEFAULT) or near(d.Color, GREY_BASEPLATE)) then
			defaultLookCount += 1
			sample(bad.defaultLook, d)
		end
		if d.Size.Y < 1 and d.Size.X > 256 and d.Size.Z > 256 then sample(bad.hugeFlat, d) end
		local p, s = d.Position, d.Size
		local key = string.format("%.2f,%.2f,%.2f|%.2f,%.2f,%.2f", p.X, p.Y, p.Z, s.X, s.Y, s.Z)
		if seen[key] then
			dupeCount += 1
			sample(bad.dupes, d)
		else
			seen[key] = true
		end
	elseif d:IsA("Light") then
		n.lights += 1
	elseif d:IsA("ParticleEmitter") then
		n.emitters += 1
	elseif d:IsA("Sound") then
		n.sounds += 1
	end
end

local function has(class) return Lighting:FindFirstChildOfClass(class) ~= nil end
local function finding(sev, msg, list, count)
	out(string.format("[%s] %s%s", sev, msg, count and (" (" .. count .. ")") or ""))
	if list then
		for _, p in ipairs(list) do out("      " .. p) end
	end
end

out(string.format("PARTS %d (mesh %d, union %d) | anchored %d, unanchored %d | lights %d, emitters %d, sounds %d | spawns %d | terrain %s | streaming %s",
	n.parts, n.meshes, n.unions, n.anchored, n.unanchored, n.lights, n.emitters, n.sounds, n.spawns, tostring(n.terrain), tostring(workspace.StreamingEnabled)))
local mats = {}
for name, c in pairs(materials) do table.insert(mats, { name, c }) end
table.sort(mats, function(a, b) return a[2] > b[2] end)
local top = {}
for i = 1, math.min(6, #mats) do table.insert(top, mats[i][1] .. "=" .. mats[i][2]) end
out("MATERIALS " .. table.concat(top, ", "))
out("")

if defaultLookCount > 0 then finding("HIGH", "parts still in default grey Plastic (not a finished look)", bad.defaultLook, defaultLookCount) end
if workspace:FindFirstChild("Baseplate") then finding("HIGH", "default Baseplate still present") end
if #bad.hugeFlat > 0 then finding("MED", "huge flat slab (use terrain/modelled ground with elevation)", bad.hugeFlat) end
if meshNoTexCount > 0 then finding("MED", "MeshParts without TextureID/SurfaceAppearance", bad.meshNoTexture, meshNoTexCount) end
if dupeCount > 0 then finding("MED", "stacked duplicate parts (z-fighting/waste)", bad.dupes, dupeCount) end
if looseCount > 0 then finding("MED", "unanchored, unjointed parts outside any Model (will fall/drift)", bad.looseUnanchored, looseCount) end
if n.unnamed > 20 then finding("LOW", "many parts still named 'Part'", nil, n.unnamed) end
if n.spawns == 0 then finding("MED", "no SpawnLocation") end
if n.lights < 3 and n.parts > 200 then finding("MED", "almost no placed light sources (flat lighting)") end
if n.emitters == 0 then finding("LOW", "no particle effects at all") end
if n.sounds == 0 then finding("MED", "no sounds in Workspace (check SoundService/ambience elsewhere)") end

out("")
out("LIGHTING technology=" .. Lighting.Technology.Name .. " ClockTime=" .. tostring(Lighting.ClockTime) .. " Brightness=" .. tostring(Lighting.Brightness))
if Lighting.Technology ~= Enum.Technology.Future then finding("MED", "Lighting.Technology is not Future") end
if not has("Atmosphere") then finding("MED", "no Atmosphere (no depth/haze)") end
if not has("Sky") then finding("LOW", "no Sky object (default sky)") end
if not has("ColorCorrectionEffect") then finding("MED", "no ColorCorrection (no colour grade)") end
if not has("BloomEffect") then finding("LOW", "no Bloom") end
local okM, m22 = pcall(function() return MaterialService.Use2022Materials end)
if okM and not m22 then finding("LOW", "MaterialService.Use2022Materials is off") end

return table.concat(lines, "\n")
