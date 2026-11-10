---
name: ui-craft
description: Professional Roblox UI/UX standards - responsive layout for phone/tablet/console/desktop, style tokens, reusable components, button states, motion, safe areas, gamepad/touch input, readability. Use whenever creating or reviewing any ScreenGui, HUD, menu, shop, inventory, popup, tutorial prompt or notification in Roblox Studio.
---

# UI craft

## 1. Principles
- **Hierarchy**: one primary action per screen, clear secondary, quiet tertiary. Size, contrast and position communicate importance.
- **Consistency**: every screen is assembled from the same components and tokens. No one-off styling.
- **Responsive by construction**: layout containers, constraints and scale, never absolute pixel positions tuned for one monitor.
- **Feedback**: every interaction has an immediate visual + audio response and clear states.
- **Mobile first**: most players are on phones. Thumbs reach the lower corners; the top-left has Roblox's core UI.

## 2. Style tokens (define once in `Shared/UITheme`, mirror in the GDD)
- Reference canvas 1920×1080. Spacing scale 4/8/12/16/24/32. Corner radius 8/14/24. Stroke 2px (or 1.5).
- Type scale at reference: display 40, title 28, body 20, caption 15 (never below ~14 effective). One body family + at most one display family (`Font.fromEnum` / `FontFace`; e.g. GothamSSm/Builder Sans). Text contrast ≥ 4.5:1.
- Colours from the palette only: surface-1/2/3, primary, accent, success, warning, danger, text-high/medium/low. Avoid pure #FFF/#000; use tinted near-white/near-black.
- Motion tokens: fast 0.12 s, normal 0.2 s, slow 0.35 s; enter = `Quad/Back Out`, exit = `Quad In`; max one "hero" animation per screen.

## 3. Layout recipe
- `ScreenGui`: `ResetOnSpawn = false`, `ZIndexBehavior = Sibling`, `ScreenInsets` set deliberately (`CoreUISafeInsets` default, `DeviceSafeInsets` for full-bleed layers), keep HUD inside safe areas. Name everything.
- Build with `UIListLayout` / `UIGridLayout` / `UIPageLayout`, `UIPadding`, `UIAspectRatioConstraint`, `UISizeConstraint`, `UITextSizeConstraint`, `AutomaticSize`. Scale with `UIScale` driven by viewport:
```lua
local camera = workspace.CurrentCamera
local function updateScale()
	local v = camera.ViewportSize
	uiScale.Scale = math.clamp(math.min(v.X / 1920, v.Y / 1080), 0.55, 1.4)
end
camera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
updateScale()
```
- Anchor panels with `AnchorPoint` + scale position (e.g. bottom-centre = `Position (0.5,0,1,-pad)`, `AnchorPoint (0.5,1)`). Lists scroll (`ScrollingFrame` with `AutomaticCanvasSize`) rather than overflow.
- Touch targets ≥ 44×44 px at 1× effective; spacing between targets ≥ 8 px. Gamepad: provide `SelectionGroup`/`NextSelection*`, visible selection highlight, B/Circle to back. Keyboard shortcuts shown on PC only.
- Verify at phone portrait (≈390×844), phone landscape (≈844×390), tablet, 16:9 desktop, ultrawide. Nothing overlaps, clips or collides with the notch/topbar.

## 4. Component starter (put in ReplicatedStorage/Shared/UI)
```lua
--!strict
local TweenService = game:GetService("TweenService")
local Theme = require(script.Parent.UITheme)

local function tween(obj: Instance, t: number, props: { [string]: any })
	TweenService:Create(obj, TweenInfo.new(t, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), props):Play()
end

local Button = {}
function Button.new(text: string, parent: Instance, onActivated: () -> ()): TextButton
	local b = Instance.new("TextButton")
	b.Name = "Button"
	b.AutoButtonColor = false
	b.Size = UDim2.fromOffset(220, 56)
	b.BackgroundColor3 = Theme.primary
	b.Text = text
	b.TextColor3 = Theme.textHigh
	b.FontFace = Theme.fontBold
	b.TextSize = 22
	local corner = Instance.new("UICorner"); corner.CornerRadius = UDim.new(0, 14); corner.Parent = b
	local stroke = Instance.new("UIStroke"); stroke.Thickness = 2; stroke.Color = Theme.primaryLight
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; stroke.Parent = b
	local scale = Instance.new("UIScale"); scale.Parent = b
	b.MouseEnter:Connect(function() tween(b, 0.12, { BackgroundColor3 = Theme.primaryLight }) end)
	b.MouseLeave:Connect(function() tween(b, 0.12, { BackgroundColor3 = Theme.primary }); tween(scale, 0.12, { Scale = 1 }) end)
	b.MouseButton1Down:Connect(function() tween(scale, 0.08, { Scale = 0.95 }) end)
	b.MouseButton1Up:Connect(function() tween(scale, 0.12, { Scale = 1 }) end)
	b.Activated:Connect(onActivated)
	b.Parent = parent
	return b
end
return Button
```
Also build: Panel (surface + stroke + shadow image/gradient), Label styles, IconButton, Tab bar, Toast stack, Modal (dim backdrop, focus trap, close affordance), ProgressBar, Tooltip, Counter (tween numbers), Badge.

## 5. States & edge cases
Idle, hover, pressed, selected, disabled, loading (skeleton/spinner), empty ("nothing here yet" with a next step), error (what happened + what to do), success. Long names truncate (`TextTruncate`), numbers abbreviate (1.2K, 3.4M), localisation-safe widths, RTL-tolerant if targeting those markets. Disabled buttons explain why on tap.

## 6. Polish list
Soft drop shadows (gradient/ImageLabel), subtle `UIGradient` on surfaces, icon + text pairing, consistent icon style, entrance animations staggered 30–60 ms, currency counters that tween, notification queue (no stacking overlap), sound on every press/open/close, no UI covering the playfield during action, tutorial prompts that dismiss themselves after the player does the thing.
