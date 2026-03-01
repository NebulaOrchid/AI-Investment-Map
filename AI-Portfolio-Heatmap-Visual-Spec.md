# AI Portfolio Heatmap — Visual Specification v5.1

**Purpose:** This spec defines a treemap-based executive dashboard for visualizing an enterprise AI investment portfolio. The audience is C-suite. Every visual encoding answers a specific boardroom question. The output is a single React component (JSX) with Tailwind-compatible inline styles.

**Reference prototype:** `theme-comparison.jsx` (attached) is the working proof-of-concept. This spec formalizes all decisions made during iteration so a developer can build the production version.

---

## 1. Page Layout

The page has four vertical sections in order:

```
┌─────────────────────────────────────────────────┐
│  HEADER: Title left, Fiscal period right         │
├─────────────────────────────────────────────────┤
│  KPI BAR: 5 cards in a single row                │
├─────────────────────────────────────────────────┤
│  LEGEND: Right-aligned, single row               │
├─────────────────────────────────────────────────┤
│  TREEMAP VIEWPORT: The heatmap canvas            │
├─────────────────────────────────────────────────┤
│  (optional) SPEC TABLE: encoding reference       │
└─────────────────────────────────────────────────┘
```

**Page background:** `#0D0F12`
**Content padding:** `28px 40px 0` for header area, `16px 40px` for map, `8px 40px 40px` for bottom sections.
**Typography:** `'DM Sans'` for UI text, `'JetBrains Mono'` for numbers and financial data. Import both from Google Fonts.

---

## 2. Header

Left side:
- Overline: `fontSize:10, fontWeight:600, uppercase, letterSpacing:1.5, color:#525252` — text: "Enterprise AI Strategy"
- Title: `fontSize:28, fontWeight:700, letterSpacing:-.8px, color:#F1F5F9` — text: "Investment Portfolio"
- Version label inline with title: `fontSize:12, fontWeight:500, color:#525252, marginLeft:12`

Right side:
- Fiscal period: `fontFamily:'JetBrains Mono', fontSize:30, fontWeight:700, color:#F1F5F9, letterSpacing:-1px` — text: "2025 · Q4"

---

## 3. KPI Bar

Five cards in a `grid` with `gridTemplateColumns: repeat(5, 1fr)`, `gap:10`, `marginTop:22`.

Each card:
- `borderRadius:14, padding:'15px 18px'`
- `background: rgba(255,255,255,0.025)`
- `border: 1px solid rgba(255,255,255,0.05)`

Card content (top to bottom):
1. Label: `fontSize:9, fontWeight:600, uppercase, letterSpacing:1, color:#525252`
2. Value: `fontFamily:'JetBrains Mono', fontSize:22, fontWeight:700` — color varies by card
3. Subtitle: `fontSize:10, color:#4B5563, marginTop:4`

### Cards (left to right)

| # | Label | Value Color | Notes |
|---|-------|-------------|-------|
| 1 | Total Invested | `#F1F5F9` | Static |
| 2 | Total Benefit | `#34D399` | Static |
| 3 | Trailing 12mo ROI | `#FBBF24` | Static |
| 4 | Lifetime ROI | `#FBBF24` | Static |
| 5 | Capital at Risk | `#EF4444` | **Interactive — see Section 10** |

---

## 4. Treemap Viewport

**Container:**
- Fixed dimensions: `width:920, height:480` (adjust for responsive later)
- `borderRadius:16, overflow:hidden`
- `background: #121212` (the "terminal" base)
- `border: 1px solid rgba(255,255,255,0.05)`
- `boxShadow: inset 0 1px 0 rgba(255,255,255,0.02), 0 12px 48px rgba(0,0,0,0.5)`

**Tile gap:** `4px` between all tiles. Implemented by insetting each tile's position by `gap` on all sides.

### Treemap Algorithm

Standard squarified treemap. Input: array of items each with a `value` property (= cumulative spend). Larger spend = larger box area. Sort descending by value before layout. The algorithm recursively splits the available rectangle to minimize aspect ratios.

---

## 5. The Three-Zone Color System

Every live/delivering tile falls into exactly one of three zones based on trailing 12-month ROI. This is the **primary signal** — the "flood fill" that the executive reads from across the room.

### Zone Definitions

| Zone | Condition | Gradient (top → bottom) | Text Color | Badge Color |
|------|-----------|-------------------------|------------|-------------|
| **Emerald** | ROI >= 0.8x | `#047857` → `#022C22` | `#FFFFFF` | `#6EE7B7` |
| **Amber** | ROI 0.1x – 0.7x | `#B45309` → `#451A03` | `#FEF3C7` | `#FCD34D` |
| **Crimson** | ROI < 0.1x | `#9B0000` → `#4A0000` | `#FFFFFF` | `#FCA5A5` |
| **Building** | phase = "building" | Flat `#262626` | `#A3A3A3` | `#525252` |
| **Stalled** | phase = "stalled" | Flat `#262626` | `#A3A3A3` | `#FCA5A5` |

All gradients are `linear-gradient(180deg, ...)` applied to a full-bleed div behind tile content.

### Inner Shadow (Live tiles only)

Sunken "terminal" depth effect:
```css
box-shadow: inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 3px rgba(255,255,255,0.04);
```
Applied to a transparent overlay div. Not applied to Building or Stalled tiles.

---

## 6. Zone-Specific Story Elements

Each zone carries a unique secondary signal that answers a different boardroom question. This is what differentiates the heatmap from a flat color-coded table.

### 6A. Emerald Zone — Surplus Value

**Question answered:** "How much beyond our initial goal did we make?"

Display a surplus indicator in the **Data Glass section** (bottom pane) when `surplus > 0`:
```
▲ +$16.8M surplus
```
- `fontSize:10, fontWeight:700, color:#6EE7B7`
- Triangle character `▲` at `fontSize:11`
- `textShadow: 0 1px 2px rgba(0,0,0,0.3)`
- Positioned ABOVE the spend line, inside the Data Glass zone

### 6B. Amber Zone — Velocity (Trend)

**Question answered:** "Is this project getting better, or is it a slow death?"

Display a velocity badge next to the phase badge in the top section:

**CRITICAL: All arrows are HIGH-CONTRAST WHITE.** Direction is the hero, not color. The arrows use a subtle directional glow to hint at meaning without relying on color that gets lost against the amber background.

| Velocity | Arrow | Glow Filter |
|----------|-------|-------------|
| `up` | `↗` | `drop-shadow(0 0 4px rgba(120,255,160,0.6))` |
| `flat` | `→` | none |
| `down` | `↘` | `drop-shadow(0 0 4px rgba(255,120,120,0.6))` |

Badge container:
```css
display: inline-flex;
align-items: center;
gap: 4px;
font-size: 9px;
font-weight: 700;
padding: 2.5px 8px;
border-radius: 4px;
background: rgba(0,0,0,0.35);
color: #FFFFFF;
```

Arrow: `fontSize:14, lineHeight:1`
Delta text (e.g., "+0.22x"): `opacity:0.9`

### 6C. Crimson Zone — Root Cause Icon

**Question answered:** "Is the failure due to Budget or Market?"

Display a compact icon badge next to the phase badge. Icon only, no text label (reduces cognitive load).

| Root Cause | Icon | Meaning |
|------------|------|---------|
| `budget` | 💰 | Budget overrun is primary failure driver |
| `adoption` | 👤 | Low user adoption |
| `scope` | 📐 | Scope creep |
| `market` | 📉 | Market/external factors |

Badge container:
```css
display: inline-flex;
align-items: center;
justify-content: center;
width: 24px;
height: 24px;
border-radius: 5px;
background: rgba(0,0,0,0.35);
font-size: 13px;
```

### 6D. Building Zone — Schedule Health

**Question answered:** "Are we on track to go live, or is this a black hole?"

Building tiles show three sub-signals:

**1. Dual-Track Slider (bottom of tile)**

Two thin horizontal bars stacked at the very bottom, replacing the single benefit slider used by live tiles.

Top bar (Progress): `height:3px`
- Track: `background: rgba(255,255,255,0.08)`
- Fill: `background: rgba(255,255,255,0.85)`, `boxShadow: 0 0 5px rgba(255,255,255,0.4)`
- Width: `milestones * 100%`

Bottom bar (Budget Burn): `height:3px`
- Track: `background: rgba(255,255,255,0.04)`
- Fill (normal): `background: rgba(255,255,255,0.25)`
- Fill (overrun, when budgetBurn > milestones + 0.1): `background: rgba(220,38,38,0.6)`, `boxShadow: 0 0 4px rgba(220,38,38,0.3)`
- Width: `budgetBurn * 100%`

Total height of dual slider: 7px (3px + 1px gap + 3px). Gap via `flexDirection:column, gap:1`.

**If the budget bar is longer than the progress bar by more than 10 percentage points, the budget bar turns red.** This is the "spending faster than building" red flag.

Additionally, show `⚠ Burn > Progress` text badge if `budgetBurn > milestones + 0.15`:
```css
font-size: 8px;
font-weight: 700;
padding: 2px 7px;
border-radius: 3px;
background: rgba(220,38,38,0.15);
color: #FCA5A5;
border: 1px solid rgba(220,38,38,0.2);
```

**2. Zombie Detection (Activity Sparkline)**

A mini sparkline showing days since the last milestone movement. Displayed next to the phase badge.

The sparkline is 5 vertical bars representing ~15-day windows. Each bar lights up (tall) if activity falls within that window, or goes dark (short) if no activity:

```javascript
// For each of 5 bars (indices 4,3,2,1,0):
const age = index * 15; // each bar = ~15 day window
const active = lastActivityDays <= age + 15;
// Active bar: height 8px minus index, colored
// Inactive bar: height 3px, rgba(255,255,255,0.1)
```

Bar styling: `width:3px, borderRadius:1px, gap:1.5px between bars`

Thresholds and label:
| Days Since Activity | Color | Label Example |
|---------------------|-------|---------------|
| < 30 | `#6B7280` (neutral gray) | "8d ago" |
| 30–60 | `#FCD34D` (amber warning) | "5w ago" |
| > 60 | `#FCA5A5` (red zombie) | "3mo stale" |

Container:
```css
font-size: 8px;
font-weight: 700;
padding: 2px 7px;
border-radius: 3px;
```
- Normal: `background: rgba(255,255,255,0.04)`, no border
- Warning (30-60d): `background: rgba(251,191,36,0.12)`, no border
- Zombie (>60d): `background: rgba(155,0,0,0.2)`, `border: 1px solid rgba(155,0,0,0.25)`

**Zombies (>60d) also trigger the Crimson Pulse** (Section 8).

**3. Launch Countdown Badge**

If a building tile has `daysToLive <= 30`, replace the standard "BUILDING" phase badge with a high-contrast launch countdown:

```
LAUNCH T-22d
```

**Badge color is based on confidence, not a fixed color:**

| Confidence | Background | Border | Text Color | Trigger |
|------------|------------|--------|------------|---------|
| `high` | `rgba(6,95,70,0.35)` | `1px solid rgba(52,211,153,0.4)` | `#6EE7B7` | 0 date slips |
| `medium` | `rgba(251,191,36,0.2)` | `1px solid rgba(251,191,36,0.3)` | `#FCD34D` | 1 date slip |
| `low` | `rgba(220,38,38,0.2)` | `1px solid rgba(220,38,38,0.3)` | `#FCA5A5` | 2+ date slips |

Badge: `fontSize:8, fontWeight:800, uppercase, letterSpacing:1, padding:'3px 8px', borderRadius:4`

### 6E. Stalled Zone — Sunk Cost Warning

**Question answered:** "Why are we still funding this if it's missing milestones?"

Stalled tiles combine several signals:

1. **Gray background with red-tinted stripes.** Standard building stripes at 0.4 opacity PLUS a second stripe overlay using crimson:
```css
/* Normal stripes at reduced opacity */
background-image: repeating-linear-gradient(135deg,
  rgba(255,255,255,0.05), rgba(255,255,255,0.05) 10px,
  transparent 10px, transparent 20px);
opacity: 0.4;

/* Red-tinted stripes on top */
background-image: repeating-linear-gradient(135deg,
  rgba(155,0,0,0.8), rgba(155,0,0,0.8) 10px,
  transparent 10px, transparent 20px);
opacity: 0.15;
```

2. **Crimson Pulse** (see Section 8). Always active on stalled tiles.

3. **STALLED badge:** `fontSize:7, fontWeight:700, uppercase, letterSpacing:1.3, padding:'2.5px 7px', borderRadius:3, background:rgba(155,0,0,0.3), color:#FCA5A5, border:1px solid rgba(155,0,0,0.3)`

4. **Sunk cost text** in the metrics area:
```
⚠ $3.0M sunk cost · 5mo dark
```
- `fontSize:9.5, fontWeight:700, color:#FCA5A5`
- The "Xmo dark" suffix shows months since last activity (`lastActivity / 30`, rounded)

---

## 7. Dependency Blocker Badge

**Question answered:** "Who is the political block for this project?"

Shown on ANY building or stalled tile that has a `blocker` value (not just stalled). Displayed next to the phase badge.

```
🔗 Legal
```

```css
display: inline-flex;
align-items: center;
gap: 3px;
font-size: 8px;
font-weight: 700;
padding: 2px 7px;
border-radius: 3px;
background: rgba(255,255,255,0.06);
color: #A3A3A3;
border: 1px solid rgba(255,255,255,0.06);
```

Link icon: `fontSize:10`

Common blocker labels: "Legal", "Infra", "Data Eng", "Privacy", "Vendor", "Security"

---

## 8. Crimson Pulse Animation

A breathing outer glow that draws the executive's eye before they read any text. Implemented via `requestAnimationFrame`, not CSS keyframes (for precise control).

**Applied when ANY of these are true:**
- Live tile with budget deviation > 25%
- Stalled tile (always)
- Building tile where `budgetBurn > milestones + 0.15`
- Building tile where `lastActivity > 60` (zombie)

**Animation:**
```javascript
// 2.5-second breathing cycle
const t = ((timestamp - start) % 2500) / 2500;
const opacity = 0.4 + 0.4 * Math.sin(t * Math.PI * 2);  // range: 0.4 → 0.8
const spread = 5 + 15 * Math.sin(t * Math.PI * 2);       // range: 5px → 20px

element.style.boxShadow =
  `0 0 ${spread}px ${2 + 3 * opacity}px rgba(155, 0, 0, ${opacity})`;
```

**DOM structure:** Absolutely positioned div with `inset:-4px, borderRadius:12px, pointerEvents:none, zIndex:0`. Sits behind all tile content.

---

## 9. Border System — Management by Exception

**Core rule: No border means on-budget. Only "friction" gets a border.**

This reduces visual noise. An emerald tile with no border tells a complete "healthy" story by itself.

| Condition | Border | Notes |
|-----------|--------|-------|
| Budget deviation <= +5% | **None** | Text handles minor variance |
| Budget deviation 5–15% | **None** | Text only: "+12% over budget" |
| Budget deviation 15–25% | `3px solid #EA580C` | Thick orange, visible from distance |
| Budget deviation > 25% | **None** (pulse instead) | Crimson Pulse is the signal |
| Under budget (< -2%) | `2px solid #38BDF8` | Blue, positive signal |
| Building/Stalled | **None** | Stripes handle it |

---

## 10. Hot Seat Toggle (Interactive Filter)

The 5th KPI card ("Capital at Risk") is a clickable master toggle.

**Default state:**
- `border: 1px solid rgba(220,38,38,0.15)`
- Badge: `FILTER` in `fontSize:7, color:#525252`
- Subtitle: "Click for Hot Seat"

**Active state:**
- `background: rgba(220,38,38,0.12)`
- `border: 1px solid rgba(220,38,38,0.35)`
- Badge: `HOT SEAT` in `color:#FCA5A5, background:rgba(220,38,38,0.25)`
- Subtitle: "Click to reset"

**Behavior when active:** Every tile on the map that is NOT at risk dims to `opacity:0.1` with `transition: opacity 0.4s ease`. At-risk tiles remain at full opacity.

**"At Risk" definition** (a tile is at risk if ANY of these are true):
- `budgetDeviation > 0.15`
- `phase === "stalled"`
- Zone is `crimson` (ROI < 0.1x)
- Building tile where `budgetBurn > milestones + 0.15`
- Building tile where `lastActivity > 60`

**Capital at Risk value:** Sum of `spend` for all tiles matching the at-risk definition.

---

## 11. Tile Content Layout

Each tile is a flex column with `justifyContent: space-between`. Content splits into two halves:

```
┌──────────────────────────────────┐
│  TOP HALF: Identity              │
│  - Project name (bold, 1-2 lines)│
│  - Phase badge + story badges    │
│                                  │
├──────────────────────────────────┤ ← Data Glass starts here
│  BOTTOM HALF: Financial Data     │
│  - Surplus / Velocity / Root     │
│  - Spend (JetBrains Mono)       │
│  - ROI (large, JetBrains Mono)  │
│  - Budget deviation text         │
│▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬│ ← Benefit slider (3px)
└──────────────────────────────────┘
```

### Data Glass (Live tiles only)

Frosted glass overlay on the bottom 44% (or 50% if small tile) for text legibility over jewel gradients:
```css
position: absolute;
bottom: 0; left: 0; right: 0;
height: 44%;   /* 50% for small tiles */
background: rgba(0,0,0,0.25);
backdrop-filter: blur(4px);
-webkit-backdrop-filter: blur(4px);
border-radius: 0 0 8px 8px;
border-top: 1px solid rgba(255,255,255,0.05);
```

### Benefit Slider (Live tiles only)

White neon track at the very bottom, 3px tall:
```css
/* Track */
height: 3px;
background: rgba(255,255,255,0.2);

/* Fill */
width: benefitPct * 100%;
background: #FFFFFF;
box-shadow: 0 0 8px #FFFFFF;
transition: width 0.5s;
```

### Building tiles use the Dual-Track Slider instead (see Section 6D).

### Responsive Tile Sizes

Content shown depends on tile pixel dimensions:

| Size | Condition | Content |
|------|-----------|---------|
| **Micro** | `w < 40 OR h < 32` | Color only, no text. Pulse if applicable. |
| **XS** | `w < 58 OR h < 48` | Name only (truncated to 1 line), no badges, no metrics |
| **Small** | `w < 95 OR h < 70` | Name (1 line) + phase badge + spend + inline ROI |
| **Full** | Everything else | All content: name (2 lines), badges, story element, surplus/velocity/root cause, spend, ROI, budget text |

### Typography by Element

| Element | Font | Size | Weight | Additional |
|---------|------|------|--------|------------|
| Project name (full) | DM Sans | 14px | 700 | `lineHeight:1.2, textShadow: 0 1px 3px rgba(0,0,0,0.5)` |
| Project name (small) | DM Sans | 11.5px | 700 | 1-line clamp |
| Phase badge | DM Sans | 7px | 700 | uppercase, `letterSpacing:1.3` |
| Spend | JetBrains Mono | 12px | 600 | `opacity:0.9` |
| ROI | JetBrains Mono | 19px | 700 | `letterSpacing:-0.5px` |
| ROI suffix "12mo" | DM Sans | 8px | 500 | `opacity:0.55` |
| Budget deviation | DM Sans | 9px | 700 | |
| Build progress text | DM Sans | 9.5px | 400 | `opacity:0.6` |

---

## 12. Building Phase Stripe Overlay

All building and stalled tiles get a diagonal stripe texture to signal "pre-production, not yet judgeable."

```css
background-image: repeating-linear-gradient(135deg,
  rgba(255,255,255,0.05),
  rgba(255,255,255,0.05) 10px,
  transparent 10px,
  transparent 20px
);
```

- Normal building: `opacity: 0.6`
- Stalled: `opacity: 0.4` (dimmer, since the red overlay adds its own pattern)

Stalled tiles get an additional red-tinted stripe layer:
```css
background-image: repeating-linear-gradient(135deg,
  rgba(155,0,0,0.8),
  rgba(155,0,0,0.8) 10px,
  transparent 10px,
  transparent 20px
);
opacity: 0.15;
```

---

## 13. Legend

Right-aligned, single row, `gap:16`, `flexWrap:wrap`.

Items (left to right, separated by 1px vertical dividers at `rgba(255,255,255,0.06)`):

1. **Zone swatches:** 4 small squares (13x13px, borderRadius:4) with gradients. Building swatch includes mini stripe overlay. Labels: "Emerald ≥ 0.8x", "Amber 0.1–0.7x", "Crimson < 0.1x", "Building"
2. **Velocity arrows:** Three white arrows (↗ → ↘) with respective glows. Label: "Velocity"
3. **Dual slider mini:** Two stacked 2.5px bars (22px wide). Top: 60% white fill. Bottom: 75% red fill. Label: "Build vs Burn"
4. **Blocker icon:** 🔗 emoji at fontSize:11. Label: "Blocker"
5. **Activity sparkline:** 5 tiny bars (2.5px wide, decreasing heights). Label: "Activity"

All labels: `fontSize:10, color:#9CA3AF`

---

## 14. Data Model

Each initiative requires these fields:

### All Tiles

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Initiative name |
| `spend` | number | yes | Cumulative investment (dollars). Drives box area. |
| `roi` | number | yes | Trailing 12-month ROI as a multiplier (e.g., 1.8 = 1.8x). 0 for building. |
| `phase` | enum | yes | "live", "delivering", "building", "stalled" |
| `dev` | number | yes | Budget deviation as decimal (0.18 = 18% over, -0.05 = 5% under) |
| `benefitPct` | number | yes | Benefit realization as decimal (0.72 = 72% of committed benefit realized) |

### Emerald Zone Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `surplus` | number | yes | Dollar amount of value above committed target. 0 if not exceeding. |

### Amber Zone Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `velocity` | enum | yes | "up", "flat", "down" — quarter-over-quarter ROI trend |
| `velocityDelta` | string | yes | Display string like "+0.22x" or "-0.11x" |

### Crimson Zone Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rootCause` | enum | yes | "budget", "adoption", "scope", "market" |

### Building/Stalled Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `milestones` | number | yes | Completion fraction (0.0–1.0). Drives progress bar. |
| `budgetBurn` | number | yes | Budget consumed fraction (0.0–1.0). Drives burn bar. |
| `daysToLive` | number | nullable | Days until planned go-live. `null` for stalled. |
| `slips` | number | yes | Number of times the launch date has been pushed. Drives confidence color. |
| `confidence` | enum | yes | "high" (0 slips), "medium" (1 slip), "low" (2+ slips) |
| `lastActivity` | number | yes | Days since last milestone movement. Drives zombie detection. |
| `blocker` | string | nullable | Department name blocking progress (e.g., "Legal", "Infra"). `null` if no blocker. |

---

## 15. Encoding Summary Table

This table documents the complete visual encoding framework. Every visual channel maps to exactly one metric.

| Metric | Visual Encoding | Implementation | Boardroom Question |
|--------|----------------|----------------|--------------------|
| Cumulative Investment | Box area | Area proportional to spend via treemap algorithm | "Where is the most money parked?" |
| Composite Health (ROI) | Jewel-tone flood fill | Three zones: Emerald ≥ 0.8x, Amber 0.1–0.7x, Crimson < 0.1x | "Is this investment healthy?" |
| Budget Deviation | Atmospheric border | None (on-budget), Orange 15-25%, Pulse >25%, Blue (under) | "Are we overspending?" |
| Benefit Realization | Bottom white slider | 3px neon track, width = % benefit realized | "How much value have we captured?" |
| Project Phase | Surface texture | Building: diagonal stripes. Stalled: red-tinted stripes + pulse | "Is this in production?" |
| Surplus Value | Emerald: ▲ text in data glass | Green text with upward triangle | "How much did we beat our target by?" |
| Trend / Velocity | Amber: white directional arrow | ↗ ↘ → with subtle glow | "Getting better or slow death?" |
| Root Cause | Crimson: icon badge | 💰 👤 📐 📉 | "Why is this failing?" |
| Schedule Health | Building: dual slider | Progress vs burn tracks | "Spending faster than building?" |
| Time Decay | Building: sparkline + label | 5-bar activity indicator | "Is this a zombie project?" |
| Dependency | Building/Stalled: 🔗 badge | Department name | "Who is blocking this?" |
| Launch Readiness | Building: countdown badge | Color = confidence (slips) | "Can we trust this launch date?" |
| Capital Risk | Hot Seat toggle | Dims non-risk tiles to 10% | "Show me only the fires." |

---

## 16. Component Hierarchy

```
App
├── Header (title + fiscal period)
├── KPIBar
│   ├── KPICard × 4 (static)
│   └── KPICard (Capital at Risk — toggles hotSeat state)
├── Legend
├── MapView
│   └── Tile × N
│       ├── CrimsonPulse (conditional)
│       ├── BackgroundGradient
│       ├── StripeOverlay (building/stalled)
│       ├── RedStripeOverlay (stalled only)
│       ├── InnerShadow (live only)
│       ├── DataGlass (live only)
│       ├── BenefitSlider (live only)
│       ├── DualSlider (building/stalled only)
│       │   ├── ProgressTrack
│       │   └── BurnTrack
│       └── ContentLayout
│           ├── TopHalf
│           │   ├── ProjectName
│           │   ├── PhaseBadge | LaunchCountdown | StalledBadge
│           │   ├── DependencyBadge (if blocker)
│           │   ├── ZombieIndicator (building only)
│           │   ├── BurnWarning (building, if overrun)
│           │   ├── VelocityBadge (amber only)
│           │   └── RootCauseIcon (crimson only)
│           └── BottomHalf (Data Glass zone)
│               ├── SurplusValue (emerald only)
│               ├── SunkCostWarning (stalled only)
│               ├── Spend
│               ├── ROI (live only)
│               ├── BudgetDeviationText (if > 5%)
│               └── BuildProgress (building only)
└── SpecTable (optional reference)
```

---

## 17. Animation Inventory

| Animation | Trigger | Duration | Easing |
|-----------|---------|----------|--------|
| Crimson Pulse | At-risk condition | 2.5s loop | `Math.sin` (smooth breathing) |
| Hot Seat dim | KPI card click | 0.4s | `ease` transition on opacity |
| Benefit slider fill | Data update | 0.5s | `ease` transition on width |
| Dual slider fill | Data update | 0.5s | `ease` transition on width |

All animations use `requestAnimationFrame` for the pulse, CSS transitions for everything else. No CSS `@keyframes`.

---

## 18. Accessibility Notes

- All text meets WCAG AA contrast against its background (jewel gradients + data glass ensure this)
- Pulse animation is decorative; critical information is also conveyed via text (budget deviation %, STALLED badge)
- Hot Seat filter uses opacity, not display:none; screen readers can still traverse all tiles
- Currency values use `$` prefix and standard abbreviations (K, M)

---

## 19. Sample Data

Use the following for development and testing. This is the exact dataset from the prototype.

```json
[
  {"name":"Fraud Detection Pattern Recognizer","spend":9700000,"roi":2.4,"phase":"delivering","dev":-0.05,"benefitPct":0.95,"surplus":16800000},
  {"name":"M365 Copilot","spend":13100000,"roi":1.8,"phase":"live","dev":0.04,"benefitPct":0.72,"surplus":3600000},
  {"name":"KYC/AML Automation","spend":7200000,"roi":2.1,"phase":"delivering","dev":-0.03,"benefitPct":0.92,"surplus":1100000},
  {"name":"Sanctions Screening AI","spend":7200000,"roi":1.6,"phase":"delivering","dev":0.02,"benefitPct":0.88,"surplus":500000},
  {"name":"Market Risk AI","spend":12500000,"roi":1.4,"phase":"live","dev":0.03,"benefitPct":0.68,"surplus":0},
  {"name":"Quantitative Strategy AI","spend":8200000,"roi":1.1,"phase":"live","dev":0,"benefitPct":0.60,"surplus":0},
  {"name":"Unified Security","spend":11000000,"roi":0.9,"phase":"live","dev":0.04,"benefitPct":0.55,"surplus":0},
  {"name":"Stress Testing AI","spend":4800000,"roi":0.7,"phase":"live","dev":0.03,"benefitPct":0.52,"velocity":"up","velocityDelta":"+0.15x"},
  {"name":"Client Insights Engine","spend":6900000,"roi":0.6,"phase":"live","dev":0.10,"benefitPct":0.45,"velocity":"up","velocityDelta":"+0.22x"},
  {"name":"Doc Automation Suite","spend":6200000,"roi":0.4,"phase":"live","dev":0.30,"benefitPct":0.48,"velocity":"flat","velocityDelta":"+0.02x"},
  {"name":"Regulatory Report Gen","spend":4000000,"roi":0.5,"phase":"live","dev":0.20,"benefitPct":0.40,"velocity":"down","velocityDelta":"-0.08x"},
  {"name":"Operations Copilot","spend":5500000,"roi":0.45,"phase":"live","dev":0.12,"benefitPct":0.42,"velocity":"up","velocityDelta":"+0.12x"},
  {"name":"Trading Analytics AI","spend":11900000,"roi":0.3,"phase":"live","dev":0.18,"benefitPct":0.35,"velocity":"down","velocityDelta":"-0.11x"},
  {"name":"Order Management AI","spend":4200000,"roi":0.15,"phase":"live","dev":0.08,"benefitPct":0.32,"velocity":"flat","velocityDelta":"+0.01x"},
  {"name":"Voice Analytics","spend":3800000,"roi":0.2,"phase":"live","dev":0.06,"benefitPct":0.28,"velocity":"down","velocityDelta":"-0.05x"},
  {"name":"Personalization Engine","spend":8300000,"roi":0.08,"phase":"live","dev":0.28,"benefitPct":0.18,"rootCause":"budget"},
  {"name":"Alternative Data Pipeline","spend":8800000,"roi":0.05,"phase":"live","dev":0.04,"benefitPct":0.12,"rootCause":"adoption"},
  {"name":"Client Onboarding AI","spend":5000000,"roi":0.03,"phase":"live","dev":0.32,"benefitPct":0.08,"rootCause":"scope"},
  {"name":"Agentic AI Platform","spend":7100000,"roi":0,"phase":"building","dev":0,"benefitPct":0,"milestones":0.65,"budgetBurn":0.42,"daysToLive":22,"slips":0,"confidence":"high","lastActivity":8,"blocker":null},
  {"name":"GenAI Internal Use Cases","spend":3200000,"roi":0,"phase":"building","dev":0,"benefitPct":0,"milestones":0.40,"budgetBurn":0.55,"daysToLive":90,"slips":1,"confidence":"medium","lastActivity":34,"blocker":"Infra"},
  {"name":"Data Quality AI","spend":3500000,"roi":0,"phase":"building","dev":0,"benefitPct":0,"milestones":0.22,"budgetBurn":0.60,"daysToLive":180,"slips":2,"confidence":"low","lastActivity":91,"blocker":"Data Eng"},
  {"name":"Revenue Attribution ML","spend":3000000,"roi":0,"phase":"stalled","dev":0,"benefitPct":0,"milestones":0.10,"budgetBurn":0.78,"daysToLive":null,"lastActivity":142,"blocker":"Legal"}
]
```
