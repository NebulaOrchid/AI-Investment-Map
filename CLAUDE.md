# AI Investment Heatmap — Project Context

## What This Is

A single-file React component (`ai-portfolio-heatmap.jsx`) that visualizes ~130 AI initiatives at a large investment bank as a dynamic treemap heatmap. Built for CEO-level boardroom presentations. Vite + React + Tailwind.

## File

- `ai-portfolio-heatmap.jsx` — ~2000 lines. Single-file component, no external chart library. Custom squarify treemap algorithm (`tmLayout()`).

## Timeline

- 37 monthly entries: Dec 2024 → Dec 2027 (key format: `"2025-03"`)
- `NOW_IDX = qi(2026, 2)` = index 14 (Feb 2026 = "today")
- 20 founding initiatives at Dec 2024, growing to ~105 by Feb 2026
- Future months (past NOW) shown faded + dashed borders (projected) + viewport overlay dim
- Map physically shrinks/grows with timeline: `scaleFactor = spendRatio` (100% at NOW)
- Map anchored top-left with 16px inset (`MAP_INSET`), grows down and right

## Three-Level Org Hierarchy

| Level | Tiles | Layout | Default |
|-------|-------|--------|---------|
| Firm | ~105 individual initiatives | Flat treemap | |
| BU | 6 business units (ISG, Tech, WM, IM, OPS, Co) | Flat treemap | |
| DIV | ~51 divisions | Nested inside BU border regions | Yes (default) |

Vertical org slider on right side: Division at top, Firm at bottom.

### BU Drill-Down

Clicking a BU tile in BU view enters drill-down mode:
- State: `drillBU = { bu }`
- Shows that BU's divisions as a flat treemap (derived from underlying initiatives)
- Breadcrumb: `PORTFOLIO / {BU Name}` with ESC to return
- Clicking a division enters division drill-down (see below)
- Exit: ESC key, breadcrumb click, or org slider change

### Division Drill-Down

Clicking a division tile (in DIV view or BU drill-down) enters drill-down mode:
- State: `drillDiv = { id, name, bu }`
- Shows that division's individual initiatives as a flat treemap
- Breadcrumb: `PORTFOLIO / {BU} / {Division}` with ESC to return
- Initiatives render with same flat colors as firm view
- Clicking an initiative opens side panel with firm-style detail
- Exit: ESC key (back one level), breadcrumb click, or org slider change

### Full Navigation Flow

```
BU view → click BU tile → divisions treemap → click division → initiatives treemap → click initiative → side panel
DIV view → click division → initiatives treemap → click initiative → side panel
Firm view → click initiative → side panel
```

## Visual Style — Deep Midnight Navy

- Background: `#0F172A` (Deep Midnight Navy) everywhere
- Typography: DM Sans (UI) + JetBrains Mono (numbers)
- All tile text: Pure White `#FFFFFF`, no text-shadow, no glow ("Paper White" standard)
- Font weight: 700 for BU/DIV, 600 for firm/drill-down (via `showingInits` helper)
- Letter-spacing: `.8px` for BU/DIV, `.4px` for firm/drill-down

## Six-Status Color System

Flat single-color tiles (no gradients). 3 Production statuses × 3 Building statuses.

### Production (flat solid color)

| Status | Zone Key | Color | Condition |
|--------|----------|-------|-----------|
| Performing | `prod_performing` | `#1A5C44` (deep forest teal) | ROI >= 0.8x |
| Under-Performing | `prod_underperforming` | `#6B5528` (warm bronze) | ROI 0.1–0.7x |
| Non-Performing | `prod_nonperforming` | `#6B2828` (deep garnet) | ROI < 0.1x |

### Building (tinted gray + color-coded diagonal stripes)

| Status | Zone Key | Base Color | Stripe Color | Condition |
|--------|----------|------------|-------------|-----------|
| On Target | `build_ontrack` | `#182B25` (green-tinted gray) | `rgba(26,92,68,0.25)` | Normal building progress |
| At Risk | `build_atrisk` | `#2B2518` (amber-tinted gray) | `rgba(107,85,40,0.25)` | Budget burn > milestones+15%, inactive >60d, or low confidence |
| Distressed | `build_distressed` | `#2B1818` (red-tinted gray) | `rgba(107,40,40,0.3)` | Inactive >90 days (stalled) |

### Borders

Only `build_distressed` tiles get a border: `1px solid rgba(107,40,40,0.6)`. No orange/blue budget borders.

## Progress Bar — Unified Single Bar

One 3px white bar at the bottom of each tile (`ProgressBar` component). Same visual for both phases, different meaning:

| Phase | Bar Represents | Data Source | Text Label (HIGH zoom) |
|-------|----------------|-------------|----------------------|
| Production | % realized benefit vs committed | `d.benefitPct` | ROI shown separately |
| Building | % milestone delivery | `d.milestones` (count-based) | `"60% built"` (rounded to 10s) |

### Milestone Model (Count-Based)

- `totalMilestones`: 4-12 based on budget size (small=4-6, medium=6-9, large=8-12)
- `deliveryFactor`: 0.65-1.15 per initiative (hash-derived variance, some ahead/behind)
- `milestonesHit`: `floor(calendarPct * deliveryFactor * total)`, capped at `total - 1`
- `d.milestones`: ratio (0-1) for bar width and `getZone()` comparisons

## Tile Rendering — Semantic Zoom

| Tier | Zoom | Content |
|------|------|---------|
| LOW | <= 0.6 | Color dots only, no text |
| MED | 0.6-1.3 | Flat single-color tile with centered name + data below |
| HIGH | > 1.3 | Full detail: name, phase badge, ROI, spend, over-budget, story badges |

All tiles use a single flat color background. No gradients, no two-tone split, no data glass pane.

### Font Scaling

- `tS = sqrt(spendRatio)` — text shrinks proportionally as map shrinks with timeline
- `zInv = 1/sqrt(zoom)` — partial counter-scaling. Text grows ~65% from 100%→285% zoom (12px→20px on screen), not 1:1
- Base title: 12px (HIGH zoom full-size tiles)

## Data Model

### Division & BU Data — Derived from Initiatives

Division and BU tile data is aggregated from underlying initiatives (not independent timelines):
- `DIVS` is a simple registry: `{id, name, bu}` — no `tl` field
- Division tile `d` = `aggregate(initiatives in that division)`
- BU tile `d` = `aggregate(initiatives in that BU)`
- `aggregate()` phase logic: if >50% initiatives are building → aggregate phase = "building"
- `aggregate()` does NOT set `.zone` — rendering uses `d.zone || getZone(d)` fallback
- This ensures division/BU tile colors always reconcile with drill-down view

### BU Profiles (`BU_PROFILE`)
Per-BU characteristics: `roiMult`, `rampSpeed`, `goLive`, `failRate`, `overBudgetRate`

### Budget Scaling
Per-BU budget ranges — ISG gets $4M-$18M, OPS gets $0.8M-$6M. Revenue BUs are visually larger.

### Initiative Weights (`buWeights`)
ISG: .28, Tech: .22, WM: .18, IM: .13, OPS: .10, Co: .09

### Division Weights (`DIV_WEIGHT`)
Per-division investment multipliers (0.5x–3.5x) so flagship divisions are visibly larger.

### Category ROI Bias (`CAT_ROI_BIAS`)
Per-category multiplier affecting ROI distribution.

## Key Functions

| Function | Purpose |
|----------|---------|
| `mkTL(sy,sm,ey,em,o)` | Generate 37-month timeline for an initiative |
| `genInitiatives()` | Procedurally generate ~130 initiatives with BU/category/budget distributions |
| `tmLayout(items,W,H,ox,oy)` | Squarify treemap layout algorithm |
| `aggregate(data[])` | Compute portfolio-level totals from array of timeline snapshots. Phase = building if >50% are building. Does NOT set `.zone`. |
| `enrichData(d,id,idx,prevROI)` | Set building fields (count-based milestones, budgetBurn) first, then determine zone. Order matters. |
| `getZone(d)` | Determine zone from snapshot data (6 statuses) |
| `getBorder(dev,zone)` | Returns border only for build_distressed tiles |
| `truncName(name,maxLen)` | Word-boundary truncation for medium tiles |

## Sub-Components

| Component | Purpose |
|-----------|---------|
| `CrimsonPulse` | Animated red pulse overlay for at-risk tiles |
| `ProgressBar` | Single 3px white bar: benefit realization (prod) or milestone delivery (building) |
| `VelocityBadge` | ROI velocity arrow indicator (▲/→/▼) |
| `RootCauseIcon` | Icon for non-performing tile root cause (budget/adoption/scope/market) |
| `LifecycleChart` | SVG cumulative spend vs benefit chart with go-live/break-even/now markers |
| `Legend` | Zone legend with click-to-dim/highlight filtering |

## Side Panel (400px, right slide-in)

- `onWheel` stopPropagation prevents map zoom when scrolling panel
- Initiative detail (firm + any drill-down): LifecycleChart + key numbers grid + metadata
- Division/BU detail (org tiles): aggregate stats + phase breakdown bar + initiative list
- `showingInits` helper determines which panel variant to show

### LifecycleChart

SVG component (352×130) showing cumulative spend vs benefit over the initiative's lifetime:
- **Spend (solid gray):** Cumulative S-curve — steep during building, inflects at go-live, flattens (maintenance)
- **Projected benefit (dashed green):** Concave ramp from go-live to committed target. Always shown.
- **Realized benefit (solid green):** Live projects only, go-live to NOW. Scaled by t12ROI performance.
- **Budget envelope (dashed gray):** Horizontal ceiling line, building tiles only.
- **Markers:** GO-LIVE, NOW, B/E (break-even). Go-live detected via `goLiveQ` key.
- **Legend:** Spend / Target / Actual (Actual only for live projects)

### Key Numbers Grid

2-column grid below LifecycleChart for initiative tiles:
- Live: 12mo ROI, Lifetime ROI, Total Spend, Budget, "Live For X mo", 12mo Net
- Building: Total Spend, Budget, "To Go-Live X mo", Progress (milestones), Blocker, Confidence

## Layout & Viewport

| Property | Value |
|----------|-------|
| Map anchor | Top-left, 16px inset (`MAP_INSET`) |
| Transform origin | `top left` |
| Scale factor | `spendRatio * 1.0` (100% at NOW, fills viewport minus insets) |
| Outer padding | `8px 16px` on main area |
| BU basket borders (DIV view) | `rgba(255,255,255,.12)` border, `rgba(255,255,255,.02)` fill |
| Future overlay | `rgba(15,23,42,0.25)` over viewport when `qI > NOW_IDX` |

## Legend & Filtering

- Labels: "Live – Performing", "Live – Under-Performing", "Building – On Track", etc.
- Click behavior: dim/highlight (same as Capital at Risk) — NOT filter tiles out of treemap
- Dimming check uses computed `zone` variable (with `getZone()` fallback), not `d.zone`
- `drill-tile` animation: only `transform`, NOT `opacity` — prevents CSS overriding dimming
- Zoom controls: right-aligned in legend row. Buttons 32px, font 18px.

## State Management

| State | Purpose |
|-------|---------|
| `drillBU` | `{ bu }` — BU drill-down active, showing divisions |
| `drillDiv` | `{ id, name, bu }` — Division drill-down active, showing initiatives |
| `showingInits` | Derived: `orgLevel === "firm" \|\| drillDiv` — true when showing initiative tiles |
| `activeZones` | `Set` — which legend zones are highlighted (empty = all visible) |
| `hotSeat` | Boolean — Capital at Risk isolation mode |

## Dependencies

- React 19 (useState, useMemo, useCallback, useRef, useEffect)
- Tailwind CSS (utility classes only)
- Vite build tool
- Google Fonts: DM Sans, JetBrains Mono

## How to Run

```bash
npx vite dev    # development
npx vite build  # production build
```

Import and render `<AIPortfolio />` as a full-page component.
