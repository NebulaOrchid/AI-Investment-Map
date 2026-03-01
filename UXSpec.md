# AI Investment Portfolio Heatmap — UX Specification

**Version:** 7.0
**Last Updated:** February 28, 2026
**Status:** Prototype Complete

---

## 1. Product Overview

### Purpose

An interactive executive dashboard that visualizes the firm's AI investment portfolio as a treemap heatmap. Designed for boardroom decision-making: capital allocation, ROI tracking, risk signals, and cross-BU comparison.

### Target Users

- C-suite executives (CEO, CFO, CTO, COO)
- Business unit heads
- AI strategy leads

### Core Question It Answers

> "How much have we spent on AI, is it working, what's on fire, and where should we double down or kill?"

---

## 2. Information Architecture

### Three Axes of Navigation

| Axis | Control | What It Does |
|---|---|---|
| **Time** | Horizontal timeline slider (bottom) | Scrubs through 37 months (Dec 2024 → Dec 2027). Map grows/shrinks with portfolio scale. |
| **Org Level** | Vertical org slider (right side) | Three levels: Division (default), BU, Firm. |
| **Depth** | Click any box | BU: drill-down into divisions. DIV: drill-down into initiatives. Firm: opens side panel. |

### Org Hierarchy

```
Firm (all ~105 initiatives as flat treemap)
├── ISG — Institutional Securities (BU)
│   ├── Fixed Income Division
│   ├── Equity Research Division
│   └── ... (~12 divisions)
├── Tech — Technology (BU)
│   ├── Enterprise Tech & Services
│   ├── Cyber Data Risk & Resilience
│   └── ... (~10 divisions)
├── WM — Wealth Management (BU)
├── IM — Investment Management (BU)
├── OPS — Operations (BU)
└── Co — Company/Corporate (BU)
```

### BU Investment Proportionality

Initiative count and budget are skewed realistically:
- **ISG**: 28% of initiatives, $4M-$18M per initiative (revenue engine)
- **Tech**: 22%, $3M-$15M (platform spend)
- **WM**: 18%, $2M-$10M
- **IM**: 13%, $2M-$12M
- **OPS**: 10%, $0.8M-$6M
- **Co**: 9%, $0.7M-$5M

---

## 3. Visual Encoding Framework

### 3.1 Box Size = Cumulative Investment

Area proportional to cumulative dollars spent. Biggest box = biggest commitment. At BU/Division level, box size reflects aggregate spend derived from underlying initiatives.

### 3.2 Box Color = Six-Status System

One flat solid color per tile. No gradients. 3 Production statuses × 3 Building statuses.

#### Production (flat solid color)

| Status | Zone Key | Color | Hex | Condition | Board Reads As |
|---|---|---|---|---|---|
| **Performing** | `prod_performing` | Deep forest teal | `#1A5C44` | ROI >= 0.8x | Delivering value |
| **Under-Performing** | `prod_underperforming` | Warm bronze | `#6B5528` | ROI 0.1–0.7x | Live, mixed returns |
| **Non-Performing** | `prod_nonperforming` | Deep garnet | `#6B2828` | ROI < 0.1x | Needs action |

#### Building (tinted gray + color-coded diagonal stripes)

| Status | Zone Key | Base Color | Stripe Color | Condition | Board Reads As |
|---|---|---|---|---|---|
| **On Target** | `build_ontrack` | `#182B25` (green-tinted gray) | `rgba(26,92,68,0.25)` | Normal progress | Under construction, on track |
| **At Risk** | `build_atrisk` | `#2B2518` (amber-tinted gray) | `rgba(107,85,40,0.25)` | Burn > milestones+15%, inactive >60d, or low confidence | Building, needs attention |
| **Distressed** | `build_distressed` | `#2B1818` (red-tinted gray) | `rgba(107,40,40,0.3)` | Inactive >90 days | Stalled, needs intervention |

#### Design Rationale

- **Flat colors** reduce cognitive load vs. gradients — one rectangle, one color, instant comprehension
- **Matched lightness** (~25-28% HSL) across production colors prevents any zone from "screaming"
- **Moderate saturation** (~40-50%) — identifiable at a glance without causing visual fatigue
- **Building = texture** (stripes) vs. Production = solid — two orthogonal channels, zero ambiguity
- All colors dark enough for WCAG AA white text contrast (4.5:1+)

### 3.3 Box Border

| Border | Condition |
|---|---|
| `1px solid rgba(107,40,40,0.6)` | Distressed building tile |
| `1px dashed rgba(255,255,255,0.2)` | Projected (future month) |
| None | All other tiles |

No orange over-budget or blue under-budget borders.

### 3.4 Unified Progress Bar

Single 3px white bar at tile bottom (`ProgressBar` component). Same visual for both phases, different meaning:

| Phase | Bar Represents | Data Source |
|---|---|---|
| **Production** | % of realized benefit vs committed | `benefitPct` (cumulativeBenefit / maxCommittedBenefit) |
| **Building** | % of milestone delivery | `milestones` (milestonesHit / totalMilestones, count-based) |

- Track: `rgba(255,255,255,0.08)`
- Fill: `rgba(255,255,255,0.85)`
- Appears at MED zoom (if tile > 20px wide) and always at HIGH zoom
- No glow, no dual bars

#### Milestone Model (Count-Based)

Milestones are count-based with per-initiative delivery variance, not time-linear:
- `totalMilestones`: 4-12 scaled by budget size
- `deliveryFactor`: 0.65-1.15 per initiative (hash-derived, some ahead/behind schedule)
- `milestonesHit`: `floor(calendarPct × deliveryFactor × totalMilestones)`, capped at `total - 1`
- Text label: `"60% built"` (rounded to nearest 10)

### 3.5 Building Phase Visual Treatment

- Color-coded diagonal stripe pattern (135deg) matching the building sub-status
- Stripe colors defined in `BUILD_STRIPE` constant per zone
- Single progress bar showing milestone delivery percentage
- `+X% over budget` text shown at HIGH zoom for overrun projects
- Distressed tiles: red-tinted gray base, red stripes, subtle red border

---

## 4. Semantic Zoom Tiers

Tile content adapts based on zoom level:

| Tier | Zoom Range | Content |
|---|---|---|
| **LOW** | <= 0.6x | Color dots only. Pure heatmap pattern. |
| **MED** | 0.6–1.3x | Flat single-color tile with name centered + data below. Progress bar if tile > 20px. |
| **HIGH** | > 1.3x | Full detail: name, phase badge, ROI, spend, over-budget %, story badges, progress bar. |

### Flat Tile Layout (MED Zoom)

```
┌──────────────────────────┐
│                          │
│      Initiative Name     │  ← Flat zone color background
│       1.2x    $5.5M     │     Text centered vertically
│                          │
│▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░│  ← Progress bar (3px)
└──────────────────────────┘
```

### Font Scaling

| Factor | Formula | Purpose |
|---|---|---|
| `tS` | `sqrt(spendRatio)`, min 0.55 | Text shrinks as map shrinks with timeline |
| `zInv` | `1/sqrt(zoom)` | Partial counter-scaling: text grows ~65% from 100%→285% zoom |
| `tW` | 600 (`showingInits`), 700 (BU/DIV) | Lighter weight = crisper on small tiles |
| `tLs` | `.4px` (`showingInits`), `.8px` (BU/DIV) | Tighter tracking for small tiles |

Base title at HIGH zoom: 12px. At 285% zoom → ~20px on screen.

---

## 5. Interaction Patterns

### 5.1 Timeline Slider

| Element | Behavior |
|---|---|
| Range | 37 months (Dec 2024 → Dec 2027) |
| Play button | Advances one month every 450ms |
| NOW marker | Green badge at Feb 2026 (index 14) |
| Year labels | 2025, 2026, 2027 below track |
| Map scaling | Map fills viewport (minus 16px insets) at NOW, shrinks proportionally for past months |
| Future overlay | `rgba(15,23,42,0.25)` dims entire viewport when slider past NOW |

### 5.2 Org Level Slider

| Element | Behavior |
|---|---|
| Position | Right side of viewport, vertical |
| Top | Division (default) |
| Middle | BU |
| Bottom | Firm |
| Transition | Resets zoom to 1x, pan to origin, clears selection and all drill-down states |

### 5.3 BU Drill-Down

| Action | Result |
|---|---|
| Click BU tile (BU view) | Enter drill-down: BU's divisions as flat treemap (derived from initiatives) |
| Breadcrumb | `PORTFOLIO / {BU Name}` — click PORTFOLIO to exit |
| Click division (in BU drill-down) | Enter division drill-down (see 5.4) |
| ESC key | Exit BU drill-down (back to BU tiles) |
| Org slider change | Auto-exit all drill-down |
| Animation | Tiles scale-in with `scale(0.92)→scale(1)` over 0.35s (no opacity animation) |

### 5.4 Division Drill-Down

| Action | Result |
|---|---|
| Click division tile (DIV view or BU drill-down) | Enter drill-down: division's initiatives as flat treemap |
| Breadcrumb (from DIV) | `PORTFOLIO / {BU Name} / {Division Name}` — click PORTFOLIO to exit |
| Breadcrumb (from BU) | `PORTFOLIO / {BU Name} / {Division Name}` — click BU name to go back to divisions |
| ESC key | Exit one level (back to divisions or BU tiles) |
| Org slider change | Auto-exit all drill-down |
| Click initiative (in drill-down) | Opens side panel with initiative detail |
| Animation | Tiles scale-in with `scale(0.92)→scale(1)` over 0.35s (no opacity animation) |

### 5.5 Full Navigation Flow

```
BU view:    BU tiles → [click] → Division tiles → [click] → Initiative tiles → [click] → Side panel
DIV view:   Division tiles (nested in BU regions) → [click] → Initiative tiles → [click] → Side panel
Firm view:  Initiative tiles → [click] → Side panel

ESC always goes back one level. Breadcrumb segments are clickable for direct navigation.
```

### 5.6 Zoom and Pan

| Control | Action |
|---|---|
| Scroll wheel | Zoom in/out (0.5x–5.0x) |
| Click and drag | Pan (grab/grabbing cursor) |
| `+`/`−` buttons | Zoom 1.3x / 0.7x (in legend row, right-aligned) |
| Reset button | 1.0x zoom, origin position |

Zoom controls are 32px buttons with 18px font, positioned right-aligned in the legend row.

**Side panel scroll isolation:** `onWheel` stopPropagation on the side panel prevents map zoom when scrolling panel content.

### 5.7 Box Hover

| Property | Value |
|---|---|
| Transform | `scale(1.012)`, 0.25s cubic-bezier |
| Z-index | Elevated to 10 |
| Tooltip (MED zoom) | Name, spend, phase, ROI, budget deviation |

### 5.8 Legend Filtering

| Action | Result |
|---|---|
| Click legend zone | Toggle dim/highlight — matching tiles stay bright, others dim to 10% opacity |
| Click multiple zones | Multiple zones highlighted simultaneously |
| Click "Clear" | Reset all filters, all tiles visible |
| Capital at Risk button | Same dim effect for at-risk tiles (3 worst zones) |

Legend labels: "Live – Performing", "Live – Under-Performing", "Live – Non-Performing", "Building – On Track", "Building – At Risk", "Building – Stalled"

**Technical note:** Dimming uses the computed `zone` variable (with `getZone()` fallback), not `d.zone` directly, because aggregated tiles from `aggregate()` don't have `.zone` set. The `drill-tile` CSS animation only animates `transform` (not `opacity`) to prevent overriding inline dim styles.

### 5.9 Box Click — Side Panel

| View | Click Target | Panel Shows |
|---|---|---|
| Firm | Initiative | LifecycleChart + key numbers + metadata |
| BU | Business unit | **Enters BU drill-down** (see 5.3) |
| BU drill-down | Division | Division aggregate stats, phase breakdown bar, initiative list |
| BU drill-down → Division | Initiative | Same as Firm |
| DIV | Division | **Enters division drill-down** (see 5.4) |
| DIV drill-down | Initiative | Same as Firm |

---

## 6. Division View: Nested Treemap

At DIV org level, divisions are grouped inside BU regions.

### BU Region Borders

| Property | Value |
|---|---|
| Border | `1px solid rgba(255,255,255,.12)` |
| Background | `rgba(255,255,255,.02)` |
| Border radius | 8px / zoom |
| Label | BU full name (uppercase), 13px bold, white, top-left |
| Padding | 22px top (for label), 3px inner sides |

### BU Brand Colors

| BU | Color | Hex |
|---|---|---|
| Wealth Management | Teal | `#0891B2` |
| ISG | Indigo | `#6366F1` |
| Investment Mgmt | Purple | `#7C3AED` |
| Operations | Amber | `#D97706` |
| Technology | Slate | `#475569` |
| Company | Green | `#059669` |

---

## 7. Data Derivation

### Division and BU Tiles — Derived from Initiatives

Division and BU tiles are NOT independent — they are computed by `aggregate()` from their underlying initiatives. This ensures the aggregated view always reconciles with drill-down.

| Property | Source |
|---|---|
| `spend`, `benefit`, `budget` | Sum of underlying initiative snapshots |
| `t12ROI` | `sum(t12Benefit) / sum(t12Spend)` (weighted average) |
| `phase` | Composite: "building" if >50% of initiatives are building, else ROI-based |
| `zone` | NOT set by `aggregate()` — derived at render time via `getZone()` fallback |
| `crimsonRatio` | % of underlying initiatives in `prod_nonperforming` or `build_distressed` |
| `momentum` | ROI change vs 3 months ago |

---

## 8. Story Badges (HIGH Zoom)

Contextual badges that appear on tiles at HIGH zoom, adding narrative depth:

| Badge | Condition | Visual |
|---|---|---|
| **Phase badge** | Always (non-compact) | Colored pill: BUILDING / LIVE (lifecycle stage, color conveys health) |
| **Velocity** | Under-performing zone (`prod_underperforming`) | ▲ / → / ▼ arrow in rounded box |
| **Root cause** | Non-performing zone (`prod_nonperforming`) | Icon for budget/adoption/scope/market |
| **Launch countdown** | Building + <=30 days to go-live | LAUNCH T-Xd badge (green/amber/red confidence) |
| **Surplus** | Performing (`prod_performing`) + surplus > 0 | ▲ +$Xm surplus (green text) |
| **Sunk cost** | Distressed (`build_distressed`) | ⚠ $Xm sunk cost + months dark |

---

## 9. Side Panel — Initiative Detail

### LifecycleChart (352×130 SVG)

Cumulative spend vs benefit chart showing the initiative's full lifecycle story:

| Element | Visual | When Shown |
|---|---|---|
| **Spend curve** | Solid gray area + line | Always — cumulative S-curve peaking slope at go-live, flattening after |
| **Projected benefit** | Dashed green line | Always from go-live — concave ramp toward committed target |
| **Realized benefit** | Solid green area + line | Live projects only, go-live to NOW — scaled by actual ROI performance |
| **Budget envelope** | Dashed gray horizontal | Building projects only — total budget ceiling |
| **GO-LIVE marker** | Dashed green vertical | When go-live date falls within chart range (uses `goLiveQ` key) |
| **NOW marker** | White vertical + dots | Current timeline position |
| **Break-even (B/E)** | Green circle | Where realized benefit crosses spend |
| **Phase bar** | Colored segments (5px) | Bottom of chart — building vs live phases |

**Legend:** Spend (solid gray) / Target (dashed green) / Actual (solid green, live only)

**Spend curve shape:** ~72% of budget spent during building (convex ramp), remaining 28% as maintenance tail (saturating exponential after go-live).

**Benefit performance:** Realized benefit tracks projected shape × performance ratio derived from `t12ROI`. Performing projects (ROI ≥ 0.8x) track close to target; under-performing diverge below.

### Key Numbers Grid (2-column)

**Live projects:**
| Card | Value |
|---|---|
| 12mo ROI | Colored by threshold (green ≥0.8x, amber ≥0.1x, red <0.1x) |
| Lifetime ROI | Same color coding |
| Total Spend | Dollar amount |
| Budget | Dollar amount + over-budget % |
| Live For | "X mo" since go-live (green text) |
| 12mo Net | Benefit minus spend (green/red) |

**Building projects:**
| Card | Value |
|---|---|
| Total Spend | Dollar amount |
| Budget | Dollar amount + over-budget % |
| To Go-Live | "X mo" remaining (gray text) |
| Progress | X/Y milestones |
| Blocker | Dependency name (if any) |
| Confidence | HIGH/MEDIUM/LOW (colored) |

---

## 10. KPI Strip (Top of Dashboard)

Five cards across the top:

| Card | Value | Subtitle |
|---|---|---|
| Total Invested | Aggregate spend | Count of items at current view level |
| Total Benefit | Aggregate benefit | "cumulative realized" |
| Trail 12mo ROI | Portfolio-wide trailing ratio | "current performance" |
| Lifetime ROI | Portfolio-wide all-time ratio | "all-time" |
| Capital at Risk | At-risk spend amount | Click to toggle dim/highlight filter |

---

## 11. Layout & Viewport

| Property | Value |
|---|---|
| Map anchor | Top-left corner, 16px inset from viewport border |
| Transform origin | `top left` |
| Scale factor | `spendRatio × 1.0` — fills viewport (minus 32px insets) at NOW |
| Outer padding | `8px 16px` on main area |
| Map growth direction | Down and right from top-left anchor |
| Future overlay | `rgba(15,23,42,0.25)` over entire viewport when past NOW |
| Side panel width | 400px |
| Viewport height | 480px |

---

## 12. Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Month display | JetBrains Mono | 700 | 30px |
| KPI values | JetBrains Mono | 700 | 22px |
| KPI labels | DM Sans | 600 | 9.5px uppercase |
| Tile title (HIGH full) | DM Sans | 600-700 | 12px base × zInv × tS |
| Tile title (MED) | DM Sans | 600-700 | 10-15px × tS |
| Tile ROI (HIGH) | JetBrains Mono | 600-700 | 13px base × zInv × tS |
| Phase badge | DM Sans | 700 | 7-8px uppercase |
| Side panel heading | DM Sans | 700 | 20px |
| Breadcrumb | DM Sans | 600-700 | 13px |
| Org slider labels | JetBrains Mono | 500-700 | 12px |

**Paper White standard:** All tile text is `#FFFFFF`. No text-shadow, no glow, no gray. Flat, sharp typography.

---

## 13. Color System

### Background and Surface

| Element | Color |
|---|---|
| Page background | `#0F172A` (Deep Midnight Navy) |
| Treemap viewport | `#0F172A` |
| Side panel | `rgba(15,23,42,.95)` + backdrop blur |
| Card backgrounds | `rgba(255,255,255,.06)` |
| Future overlay | `rgba(15,23,42,0.25)` |

### Text

| Element | Color |
|---|---|
| Primary (tile text, values) | `#FFFFFF` |
| Secondary (labels) | `#D1D5DB` |
| Muted (hints, captions) | `#9CA3AF` |
| Disabled | `#64748B` |

### Zone Colors

| Zone | Tile Color | Badge Accent |
|---|---|---|
| Performing | `#1A5C44` | `#7ECDB3` |
| Under-Performing | `#6B5528` | `#D4B46A` |
| Non-Performing | `#6B2828` | `#D98E8E` |
| Building – On Target | `#182B25` | `#7ECDB3` |
| Building – At Risk | `#2B2518` | `#D4B46A` |
| Building – Distressed | `#2B1818` | `#D98E8E` |

---

## 14. Animations and Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Box hover | transform, box-shadow | 0.25s | cubic-bezier(0.4, 0, 0.2, 1) |
| Treemap resize | width, height | 0.5s | ease |
| Side panel slide-in | opacity, translateX | 0.3s | cubic-bezier(0.4, 0, 0.2, 1) |
| Drill-down tile-in | transform (scale only) | 0.35s | cubic-bezier(0.4, 0, 0.2, 1) |
| CrimsonPulse | box-shadow | 2s | ease-in-out (loop) |
| Timeline playback | month advance | 450ms | N/A |
| Progress bar | width | 0.5s | ease |
| Dim/highlight | opacity | 0.4s | linear |

**Note:** Drill-down animation intentionally does NOT animate opacity — only transform. This prevents CSS `animation-fill-mode` from overriding inline opacity used for legend dim/highlight filtering.

---

## 15. Interaction Flow Summary

```
User opens dashboard
  → Sees Division view at Feb 2026 ("NOW")
  → ~51 division tiles nested inside 6 BU border regions
  → BU borders: subtle rgba(.12) border + rgba(.02) fill
  → KPI strip shows portfolio totals
  → Map fills viewport from top-left corner

User hits Play
  → Timeline animates from Dec 2024 forward
  → Map grows from top-left: few tiles → 100+
  → Colors shift as initiatives go live and deliver

User slides timeline past NOW
  → Future overlay dims the entire viewport
  → Projected initiatives show dashed borders

User clicks a legend zone (e.g., "Live – Performing")
  → Non-matching tiles dim to 10% opacity
  → Matching tiles stay bright
  → Works in all views including drill-down

User clicks a division tile (e.g., Fixed Income Division)
  → DRILL-DOWN: map transitions to show 5-10 initiative tiles
  → Breadcrumb: PORTFOLIO / Institutional Securities / Fixed Income Division
  → Tiles animate in with scale-up
  → Division tile color ALWAYS matches the aggregate of its initiatives

User clicks an initiative inside drill-down
  → Side panel (400px) slides in with:
    → LifecycleChart: cumulative spend curve + projected/realized benefit
    → Key numbers grid: ROI, spend, budget, go-live timing
    → Metadata: category, owner, go-live date, target end

User presses ESC
  → Returns to DIV overview (one level back)

User slides org to BU
  → 6 large BU tiles: ISG biggest, OPS/Co smallest

User slides org to Firm
  → ~105 individual initiative tiles
  → Font weight 600, letter-spacing .4px for crisper small text
```

---

## 16. Design Principles

1. **One glance, one answer.** Color = health. Size = spend. Stripes = building. No decoding required.
2. **Decisions, not data.** Surfaces signals (fund, kill, watch) rather than raw numbers.
3. **Progressive disclosure.** Zoom level and click depth control density.
4. **Honest numbers.** "Done" is not "successful." Declining projects show under-performing, not performing.
5. **Paper White clarity.** All text pure white on dark backgrounds. No glow, no shadow. Sharp and legible.
6. **Growth narrative.** Map physically grows from top-left with timeline — the "look how far we've come" story.
7. **Easy on eyes.** Desaturated flat colors at matched lightness. Low cognitive load, psychologically comfortable.
8. **Consistent aggregation.** Division and BU tiles always reconcile with their drill-down — derived from the same underlying data.
9. **Future awareness.** Viewport dims when viewing projected months — clear separation between actual and forecast.
