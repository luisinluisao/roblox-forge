---
name: luau-craft
description: Production-grade Roblox Luau engineering standards - project layout, strict typing, server-authoritative networking, remote validation and rate limiting, safe DataStore saves, memory/performance hygiene, anti-exploit rules. Use whenever writing, reviewing or debugging any Luau script, system, remote, data save or gameplay logic for a Roblox game, even for small scripts.
---

# Luau craft

Write code a senior Roblox engineer would be proud to ship. Everything here is a hard standard, not a suggestion.

## 1. Layout
```
ReplicatedFirst/            loading screen only
ReplicatedStorage/Shared/   Config, Types, Util, Signal, Janitor, Remotes (shared modules, no secrets)
ServerStorage/              templates, server-only assets
ServerScriptService/Server/ Main (Script: requires every service, :Init() all, then :Start() all) + Services/*
StarterPlayer/StarterPlayerScripts/Client/  Main (LocalScript, same pattern) + Controllers/*
```
One bootstrap per side. Modules return a table with `Init` (no yielding, wire dependencies) and `Start` (begin work). No `script.Parent` spaghetti; require by path from services.
Config values (balance numbers, cooldowns, prices) live in one `Config` module, not scattered.

## 2. Language rules
- `--!strict` at the top of every module. Annotate function signatures, export types from `Types`. Avoid `any`.
- Services via `game:GetService`. `task.wait/spawn/delay/defer`, never `wait/spawn/delay`. Never `while wait() do`.
- Create instances with properties first and **parent last** (`Instance.new("Part")`, set props, then `.Parent = x`). Never the 2nd `Instance.new` argument.
- Every `:Connect` that can outlive its owner is stored and disconnected (Janitor/Maid pattern). Destroy what you create. Clear per-player tables on `PlayerRemoving`.
- Players: handle players that already exist when the script starts (`for _, p in Players:GetPlayers() do ... end` plus `PlayerAdded`). Characters: handle an already-spawned character plus `CharacterAdded`, and use `WaitForChild` with a timeout for essential parts.
- Prefer attributes and `CollectionService` tags for data/behaviour binding over name lookups.
- Gameplay hit detection: raycasts / `workspace:GetPartBoundsInRadius|InBox` with `OverlapParams`, not `.Touched` as the primary mechanic.
- One `Heartbeat` (or `RenderStepped`/`BindToRenderStep` on the client for camera/visuals) loop per system, not one per object. No allocations in hot loops. Pool frequently spawned things (projectiles, VFX).
- Physics: static things Anchored; server-driven moving things `SetNetworkOwner(nil)`; decor `CanCollide/CanTouch/CanQuery = false`.
- Comments explain *why*, never *what*. No dead code, no TODOs, no `print` debugging left behind (use a `Log` module with levels).

## 3. Networking (server authority)
- The client sends **intent** ("I pressed attack at time t toward direction d"), never **results** ("I dealt 50 damage").
- Every `OnServerEvent`/`OnServerInvoke` handler: check `typeof` of each argument, finite numbers (`x == x and math.abs(x) < math.huge`), clamp ranges, string length, enum membership, the player's state (alive? in round? owns item? cooldown elapsed? close enough?), then act. Return early on any failure; never error.
- Rate limit per player per remote. Never call `RemoteFunction:InvokeClient`. Use `UnreliableRemoteEvent` for high-frequency cosmetic data. Keep payloads small; no instances or huge tables from the client.
- The server may predict generously for latency, but the **server** decides outcomes, spawns, currency, inventory, damage, teleport.

```lua
--!strict
-- RateLimit.luau (server)
local Players = game:GetService("Players")
local RateLimit = {}
local buckets: { [Player]: { [string]: { t: number, n: number } } } = {}

function RateLimit.allow(player: Player, key: string, maxPerSecond: number): boolean
	local now = os.clock()
	local mine = buckets[player]
	if not mine then
		mine = {}
		buckets[player] = mine
	end
	local e = mine[key]
	if not e or now - e.t >= 1 then
		mine[key] = { t = now, n = 1 }
		return true
	end
	e.n += 1
	return e.n <= maxPerSecond
end

Players.PlayerRemoving:Connect(function(p) buckets[p] = nil end)
return RateLimit
```
```lua
-- handler shape
buyRemote.OnServerEvent:Connect(function(player: Player, itemId: unknown)
	if typeof(itemId) ~= "string" or #itemId > 40 then return end
	if not RateLimit.allow(player, "Buy", 4) then return end
	local item = Catalog[itemId]
	if not item or not Economy.canAfford(player, item.price) then return end
	Economy.spend(player, item.price)
	Inventory.give(player, itemId)
end)
```

## 4. Data (never lose or corrupt player data)
Implement one `DataService` (or use a battle-tested session-locking library whose source you have read):
- Load with retries + exponential backoff inside `pcall`. If loading **fails**, do not save defaults over the real data: kick with a friendly message, or run the player in a clearly non-persistent mode.
- Use `UpdateAsync` (not `SetAsync`) with a **session lock** (`JobId` + timestamp) so two servers never write the same profile.
- Deep-copy defaults and **reconcile** missing fields; keep a `schemaVersion` and migration functions.
- Autosave every 60–120 s staggered per player, save on `PlayerRemoving`, and `game:BindToClose` saves everyone in parallel with a time cap.
- Studio needs "Enable Studio Access to API Services" to test DataStores.
- Store only what you must (numbers/strings/small tables, no instances); respect size and request budgets.

## 5. Security
- No `loadstring`, `getfenv/setfenv`, `require(<assetId>)`, obfuscated code, or unread Creator Store scripts. Free models are a classic backdoor vector: strip or read every script.
- Secrets never go in ReplicatedStorage or the client. Admin/dev tools check `UserId` on the server.
- Never trust `player.Character` state sent from the client; read it on the server. Validate teleports, speed (soft anti-speed checks with tolerance) and sudden state jumps if the game needs it.

## 6. Performance & robustness
- Avoid `GetDescendants` / `FindFirstChild` chains in loops; cache references. Throttle expensive checks (5–10 Hz is enough for most logic).
- Streaming: if `StreamingEnabled`, treat parts as possibly absent on the client; mark critical models `Persistent`; wait with timeouts.
- Anything that can yield or fail (`DataStore`, `MarketplaceService`, `HttpService`, teleports) is wrapped in `pcall` with a handled failure path.
- Make systems idempotent and resilient to nil/destroyed instances, rapid respawns, players leaving mid-action.

## 7. Verification (always)
After writing: run the script audit from `playtest-protocol`, enter play mode, exercise the feature, read the console on both server and client. Unit-test pure logic modules (math, economy, loot tables) by `require`-ing them with `execute_luau`.
