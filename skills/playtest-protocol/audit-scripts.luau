--!nocheck
-- roblox-forge static script audit. Run with execute_luau in the EDIT datamodel. Returns a text report.
-- Heuristic by design: a clean report is necessary, not sufficient. Reading .Source needs plugin permission.
local roots = {
	game:GetService("Workspace"), game:GetService("ServerScriptService"), game:GetService("ServerStorage"),
	game:GetService("ReplicatedStorage"), game:GetService("ReplicatedFirst"), game:GetService("StarterPlayer"),
	game:GetService("StarterGui"), game:GetService("StarterPack"), game:GetService("Lighting"), game:GetService("SoundService"),
}

local MAX_LINES = 80
local findings, counts = {}, { HIGH = 0, MED = 0, LOW = 0 }
local function add(sev, inst, msg)
	counts[sev] += 1
	if #findings < MAX_LINES then table.insert(findings, string.format("[%s] %s: %s", sev, inst:GetFullName(), msg)) end
end

-- Patterns run against "\n" .. source so a leading non-identifier char can be required.
local RULES = {
	{ "[^%w_%.:]wait%s*%(", "MED", "deprecated wait(); use task.wait" },
	{ "[^%w_%.:]spawn%s*%(", "MED", "deprecated spawn(); use task.spawn/task.defer" },
	{ "[^%w_%.:]delay%s*%(", "MED", "deprecated delay(); use task.delay" },
	{ ":connect%s*%(", "LOW", "deprecated lowercase :connect; use :Connect" },
	{ "Instance%.new%s*%(%s*[\"'][%w_]+[\"']%s*,", "MED", "Instance.new with parent argument; set properties first, parent last" },
	{ "loadstring", "HIGH", "loadstring (code injection risk)" },
	{ "[gs]etfenv", "HIGH", "getfenv/setfenv (security + perf)" },
	{ "require%s*%(%s*%d+%s*%)", "HIGH", "require(<assetId>): classic backdoor pattern, verify or remove" },
	{ "InvokeClient", "HIGH", "RemoteFunction:InvokeClient can hang the server; use events" },
	{ "SetAsync", "MED", "SetAsync can overwrite data; prefer UpdateAsync with a session lock" },
	{ "HttpService%s*:%s*%a*Async", "LOW", "external HTTP call: review necessity and error handling" },
	{ "TODO", "LOW", "TODO left in code" },
	{ "FIXME", "LOW", "FIXME left in code" },
}

local usesDataStore, hasBindToClose, unreadable, scripts = false, false, 0, 0

for _, root in ipairs(roots) do
	for _, s in ipairs(root:GetDescendants()) do
		if s:IsA("LuaSourceContainer") then
			scripts += 1
			local ok, src = pcall(function() return s.Source end)
			if not ok or type(src) ~= "string" then
				unreadable += 1
			else
				local hay = "\n" .. src
				for _, r in ipairs(RULES) do
					if string.find(hay, r[1]) then add(r[2], s, r[3]) end
				end
				if not string.find(string.sub(src, 1, 300), "%-%-!strict") then add("LOW", s, "missing --!strict") end

				local _, lineBreaks = string.gsub(src, "\n", "\n")
				local nLines = lineBreaks + 1
				if nLines > 800 then add("LOW", s, nLines .. " lines; split into modules") end
				if #src / math.max(nLines, 1) > 300 then add("HIGH", s, "very long lines (minified/obfuscated?)") end
				local _, esc = string.gsub(src, "\\%d%d?%d?", "")
				if esc > 40 then add("HIGH", s, "many numeric escape sequences (possible obfuscated payload)") end
				local _, prints = string.gsub(src, "[^%w_%.]print%s*%(", "")
				if prints > 15 then add("LOW", s, prints .. " print() calls (debug noise)") end

				if string.find(src, "OnServerEvent", 1, true) or string.find(src, "OnServerInvoke", 1, true) then
					if not (string.find(src, "typeof%s*%(") or string.find(src, "type%s*%(") or string.find(src, "assert%s*%(")) then
						add("HIGH", s, "remote handler without any visible type/range validation")
					end
				end
				if string.find(src, "UpdateAsync", 1, true) or string.find(src, "SetAsync", 1, true) or string.find(src, "GetAsync", 1, true) then
					usesDataStore = true
					if not string.find(src, "pcall", 1, true) then add("HIGH", s, "DataStore calls without pcall") end
				end
				if string.find(src, "BindToClose", 1, true) then hasBindToClose = true end
				if s:IsA("Script") and string.find(src, "%.LocalPlayer") then
					local okRC, rc = pcall(function() return s.RunContext end)
					if not (okRC and rc == Enum.RunContext.Client) then add("HIGH", s, "LocalPlayer used in a server Script (always nil there)") end
				end
			end
		end
	end
end

if usesDataStore and not hasBindToClose then
	table.insert(findings, "[MED] (project): DataStore used but no BindToClose found (data may be lost at shutdown)")
	counts.MED += 1
end

local head = string.format("SCRIPTS %d (unreadable %d) | HIGH %d, MED %d, LOW %d%s",
	scripts, unreadable, counts.HIGH, counts.MED, counts.LOW, #findings >= MAX_LINES and " | list truncated" or "")
return head .. "\n" .. table.concat(findings, "\n")
