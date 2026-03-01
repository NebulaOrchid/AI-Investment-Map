# AI Investment Portfolio Heatmap — UX Specification

**Version:** 3.0
**Last Updated:** February 28, 2026
**Author:** Katie (Product Owner, AI Intelligence Dashboard)
**Status:** Prototype Complete, Pending Stakeholder Review

---

## 1. Product Overview

### Purpose

An interactive executive dashboard that visualizes the firm's entire AI investment portfolio as a treemap heatmap. Designed for boardroom decision-making: capital allocation, ROI tracking, decommission signals, and cross-BU comparison.

### Target Users

- C-suite executives (CEO, CFO, CTO, COO)
- Business unit heads
- AI strategy leads
- Finance / portfolio management

### Core Question It Answers

> "How much have we spent on AI, is it working, what's on fire, and where should we double down or kill?"

---

## 2. Information Architecture

### Three Axes of Navigation

| Axis | Control | What It Does |
|---|---|---|
| **Time** | Horizontal timeline slider (bottom) | Moves through quarters from 2023 Q1 to 2028 Q4. All numbers, box sizes, colors, and phases update per quarter. |
| **Org Level** | Vertical org slider (right side) | Three levels: Firm (all initiatives), BU (5 business units), Division (~56-100 divisions nested in BU regions). |
| **Depth** | Click any box | Opens side panel with detail drill-down. Content adapts based on org level. |

### Org Hierarchy

```
Firm (top level)
├── Wealth Management (BU)
│   ├── Private Banking (Division)
│   ├── Advisory Solutions (Division)
│   ├── Financial Planning (Division)
│   └── ... (12 divisions total)
├── ISG (BU)
│   ├── Equity Research (Division)
│   ├── Fixed Income (Division)
│   └── ... (12 divisions total)
├── Investment Mgmt (BU)
│   ├── Portfolio Mgmt (Division)
│   ├── Quant Strategies (Division)
│   └── ... (8 divisions total)
├── Operations (BU)
│   ├── Trade Operations (Division)
│   ├── Doc Processing (Division)
│   └── ... (12 divisions total)
└── Technology (BU)
    ├── AI/ML Platform (Division)
    ├── Data Engineering (Division)
    └── ... (10 divisions total)
```

---

## 3. Visual Encoding Framework

### 3.1 Box Size = Cumulative Investment

The area of each box is proportional to cumulative dollars invested to date. Biggest box = biggest financial commitment. Box sizes change as the timeline slider moves forward (spend accumulates). At BU and Division level, box size reflects the aggregate spend of all initiatives within that unit.

### 3.2 Box Color = Composite Health Score

One color, one answer to "is this working?" Color is driven by **trailing 12-month ROI** adjusted for budget deviation.

| Color | Hex | Condition | Board Reads As |
|---|---|---|---|
| Deep green | `#047857` | Trailing 12mo ROI >= 2.0x | Strong performer |
| Green | `#059669` | ROI >= 1.2x | Healthy |
| Medium green | `#10B981` | ROI >= 0.8x | On track |
| Light green | `#34D399` | ROI >= 0.5x | Early returns visible |
| Yellow | `#FBBF24` | ROI >= 0.3x | Watch list |
| Amber | `#F59E0B` | ROI >= 0.1x | Underperforming |
| Orange | `#F97316` | ROI > 0 but < 0.1x | Struggling |
| Red | `#EF4444` | ROI near 0 or negative effective | At risk |
| Light gray | `#E2E8F0` | Building phase | Pre-production, not yet judgeable |
| Warm cream | `#FEF3C7` | Declining phase (12mo ROI < 0.8x after commitment met) | Needs review / decommission signal |

**Budget deviation penalty:** Over-budget projects have their effective ROI reduced for color calculation. Over 25% = -0.35 penalty. Over 15% = -0.15 penalty. This means an over-budget project with a 1.0x ROI may still show yellow instead of green.

### 3.3 Box Border = Budget Deviation

Separate from fill color. Visible even on healthy projects.

| Border | Style | Condition |
|---|---|---|
| Thick red | `3px solid #DC2626` | Over budget by > 25% |
| Thick orange | `3px solid #EA580C` | Over budget by 15-25% |
| Medium amber | `2.5px solid #FBBF24` | Over budget by 5-15% |
| Thin blue | `2px solid #0EA5E9` | Under budget by > 2% |
| Amber (declining) | `2.5px solid #D97706` | Declining phase |
| Subtle gray | `1.5px solid rgba(0,0,0,0.05)` | On budget |
| Light gray | `1.5px solid #E2E8F0` | Building / Future phase |

### 3.4 Fill Level = Benefit Realization

A translucent overlay that rises from the bottom of each box.

- **Value capture phase:** Fill height = % of committed benefit realized (0-100%)
- **Commitment met phase:** Fill switches to show surplus value beyond commitment
- **Dashed line** at top of fill when < 98% realized (visual gap indicator)
- **No fill** for building phase boxes

### 3.5 Stage Label = Project Phase

Small uppercase text badge on each box. Four lifecycle phases:

| Phase | Label | Visual Treatment | ROI Shown? |
|---|---|---|---|
| **Building** | `BUILDING` | Diagonal stripe pattern (`repeating-linear-gradient` at 135deg), muted opacity (0.6) | No. Only spend + expected go-live date. |
| **Live (Value Capture)** | `LIVE` | Solid health color, full opacity | Yes. Trailing 12mo ROI. |
| **Delivering (Commitment Met)** | `DELIVERING` | Solid deep green, inner glow effect | Yes. Plus surplus value. |
| **Review (Declining)** | `REVIEW` | Warm cream fill, amber border | Yes. With warning indicator. |

### 3.6 Growing Treemap = Portfolio Scale Over Time

The treemap physically grows on screen as total portfolio spend increases.

- Canvas (viewport) is fixed size
- Treemap area within the canvas scales proportionally to `sqrt(currentSpend / maxSpend)`
- Minimum scale: 25% of canvas (prevents invisible map in early quarters)
- Early quarters: small cluster centered on white canvas, sparse and bold
- Late quarters: dense map approaching full canvas
- Transition animation: 0.5s ease on width/height changes

---

## 4. Interaction Patterns

### 4.1 Timeline Slider

| Element | Behavior |
|---|---|
| **Slider track** | Horizontal range input, full width. 5px height, `#E2E8F0` background. |
| **Thumb** | 22px circle, `#0F172A` fill, shadow ring on hover. |
| **Year labels** | Below slider. Active year is bold `#0F172A`, inactive years are `#94A3B8`. Font: JetBrains Mono, 9px. |
| **Play button** | 40px circle, left of slider. Toggles play/pause. Advances one quarter every 450ms. Resets to Q1 if at end. |
| **Data update** | All KPIs, box sizes, colors, phases, and side panel data recalculate on every quarter change. |

### 4.2 Org Level Slider

| Element | Behavior |
|---|---|
| **Position** | Right side of treemap viewport, vertically centered. |
| **Three dots** | Connected by 2px vertical lines. Active dot: `#0F172A` filled, 1.2x scale. Inactive: white with `#CBD5E1` border. |
| **Labels** | `FIRM` (top), `BU` (middle), `DIV` (bottom). Active label is `#0F172A` bold. |
| **Transition** | Switching org level resets zoom to 1x and pan to center. Clears any selected box. |

**View at each level:**

| Level | Treemap Shows | Box Count | Grouping |
|---|---|---|---|
| Firm | Individual AI initiatives | 15-20 | Flat (no grouping) |
| BU | Business unit aggregates | 5 | Flat (each box = 1 BU) |
| Division | Division aggregates | 56-100 | Nested inside BU border regions |

### 4.3 Zoom and Pan

| Control | Action |
|---|---|
| **Scroll wheel up** | Zoom in (multiply by 1.1x) |
| **Scroll wheel down** | Zoom out (multiply by 0.9x) |
| **Click and drag** | Pan the map (cursor changes to grab/grabbing) |
| **Zoom range** | 0.5x to 5.0x |
| **Zoom controls (bottom-left)** | `+` button (1.3x), `−` button (0.7x), percentage display, reset `⟲` button |
| **Reset** | Returns to 1.0x zoom, center position |
| **Pan during animation** | Disabled (no transition on transform during drag) |

### 4.4 Box Hover

| Property | Value |
|---|---|
| **Transform** | `scale(1.012)` with `cubic-bezier(0.4, 0, 0.2, 1)` |
| **Shadow** | `0 8px 32px rgba(0,0,0,0.1)`, plus 2px ring in box color |
| **Z-index** | Elevated to 10 |
| **Cursor** | Pointer |
| **Transition** | 0.25s |

### 4.5 Box Click (Side Panel)

Click any box to open a detail panel that slides in from the right.

**Animation:** `translateX(20px) → translateX(0)`, 0.3s cubic-bezier.
**Width:** 360px.
**Close:** X button (top-right) or click same box again.

---

## 5. Side Panel Content by Org Level

### 5.1 Firm Level (Click an Initiative)

```
┌─────────────────────────────┐
│ [PHASE BADGE]               │
│ Initiative Name        [✕]  │
│ Category · Owner            │
│                             │
│ ┌──────────┐ ┌──────────┐  │
│ │Trail 12mo│ │ Lifetime  │  │
│ │  1.42x   │ │  1.85x   │  │
│ │ current  │ │ all-time  │  │
│ └──────────┘ └──────────┘  │
│                             │
│ Budget ──────────── $14M    │
│ [████████░░] +8% over       │
│                             │
│ 12mo Cost      $3.2M       │
│ 12mo Benefit   $4.5M       │
│ ─────────────────────       │
│ Net            $1.3M       │
│                             │
│ Go-live      2025 Q2        │
│ Target End   2026 Q2        │
│ Owner        Wealth Mgmt    │
│ Category     Revenue        │
└─────────────────────────────┘
```

### 5.2 BU Level (Click a Business Unit)

```
┌─────────────────────────────┐
│ BU Color Label              │
│ [PHASE BADGE]               │
│ Business Unit Name     [✕]  │
│ X divisions · Y initiatives │
│                             │
│ ┌──────────┐ ┌──────────┐  │
│ │Trail 12mo│ │ Lifetime  │  │
│ │  0.92x   │ │  1.15x   │  │
│ └──────────┘ └──────────┘  │
│                             │
│ Budget ──────────── $45M    │
│ [████████░░] +12% over      │
│                             │
│ Phase Breakdown             │
│ [██ BUILD ██ LIVE ██ DELIV] │
│ Build: 2  Live: 4  Deliv: 1│
│                             │
│ ── Initiatives ──────────── │
│ ┌ Trading Analytics    2.1x │
│ ┌ Samaya Research      1.3x │
│ ┌ Equity Platform     BUILD │
│ ┌ Research Copilot     0.6x │
└─────────────────────────────┘
```

Each initiative row shows:
- Left color bar = health color
- Name
- Spend amount
- Trailing 12mo ROI (or BUILD badge)
- Sorted by spend descending

### 5.3 Division Level (Click a Division)

Same structure as BU level but scoped to the division. Shows the division's aggregate stats and lists initiatives within that division.

---

## 6. Division View: Nested Treemap with BU Borders

At the Division org level, boxes are grouped inside BU regions.

### BU Region Borders

| Property | Value |
|---|---|
| Border | `2px solid {BU_COLOR}22` (BU brand color at 13% opacity) |
| Background | `{BU_COLOR}06` (BU brand color at 2.4% opacity, very subtle tint) |
| Border radius | 10px |
| Label | BU name in uppercase, 10px bold, positioned top-left with 4px/8px offset |
| Label color | BU brand color at 85% opacity |

### BU Brand Colors

| Business Unit | Color | Hex |
|---|---|---|
| Wealth Management | Teal | `#0891B2` |
| ISG | Indigo | `#6366F1` |
| Investment Mgmt | Purple | `#7C3AED` |
| Operations | Amber | `#D97706` |
| Technology | Slate | `#475569` |

### Nesting Layout

1. First pass: treemap algorithm partitions the canvas into 5 BU regions sized by aggregate spend
2. Each BU region reserves 22px top padding for the BU label
3. Inner padding of 3px on all sides
4. Second pass: division boxes are laid out within each BU region's remaining space

---

## 7. Four-Phase Lifecycle Model

Every project, whether bounded or perpetual, follows the same four phases.

### Phase Definitions

| Phase | Entry Condition | Exit Condition | What Board Sees |
|---|---|---|---|
| **Building** | Project started, before go-live date | Reaches go-live quarter | Spend accumulating, no ROI shown. Expected go-live date displayed. |
| **Value Capture (Live)** | Go-live reached, benefit realization < 95% of commitment | Benefit realization reaches 95% of committed amount | ROI shown. Fill bar tracks % of committed benefit realized. Health color active. |
| **Delivering (Commitment Met)** | Benefit >= 95% of commitment AND trailing 12mo ROI >= 0.8x | Trailing 12mo ROI drops below 0.8x | Deep green. Surplus value displayed. Side panel shows "Value Beyond Commitment." |
| **Review (Declining)** | Commitment was met but trailing 12mo ROI has fallen below 0.8x | Project is decommissioned or ROI recovers | Amber/cream color with warning border. Signals potential decommission. |

### Post-Commitment Behavior

Once a project achieves its committed benefit:
- The fill bar label switches from "Benefit Realization" to "Value Beyond Commitment"
- The fill bar shows surplus dollars as a proportion (scaled to 50% of committed benefit for visual range)
- The ROI number keeps running (lifetime ROI climbs)
- The trailing 12mo ROI becomes the primary decision metric: "Is this still earning its keep?"
- If trailing 12mo ROI drops below 0.8x, the project transitions to Review phase

### Perpetual Programs

Programs like M365 Copilot, ChatGPT Enterprise, and Debrief never "complete." They follow the same four phases:
- Building → Live once benefits start materializing
- Live → Delivering once cumulative benefit exceeds commitment
- Delivering → Review if annual returns start declining relative to annual cost

The trailing 12-month ROI is the primary metric for renewal decisions on perpetual programs.

---

## 8. Metrics Definitions

### Box-Level Metrics

| Metric | Definition | When Shown |
|---|---|---|
| **Cumulative Investment** | Total dollars spent on this initiative from inception to selected quarter | Always |
| **Realized Benefit** | Total dollar value of benefits captured from inception to selected quarter | Live, Delivering, Review phases |
| **Trailing 12-Month ROI** | (Sum of benefit over last 4 quarters) / (Sum of cost over last 4 quarters) | Live, Delivering, Review phases. Primary metric on box face. |
| **Lifetime ROI** | (Total cumulative benefit) / (Total cumulative spend) | Side panel only |
| **Budget Deviation** | (Actual spend - Original budget) / Original budget, expressed as percentage | Shown on box face only if > 5% over |
| **Benefit Realization %** | Cumulative benefit / Committed benefit target | Value Capture phase |
| **Surplus Value** | Cumulative benefit minus committed benefit (only when commitment met) | Delivering phase |

### Aggregate Metrics (BU and Division Level)

| Metric | Definition |
|---|---|
| **Total Invested** | Sum of cumulative spend across all initiatives in the unit |
| **Total Benefit** | Sum of cumulative benefit across all initiatives |
| **Trailing 12mo ROI** | Sum of trailing 4Q benefit / Sum of trailing 4Q cost across all initiatives |
| **Lifetime ROI** | Total benefit / Total spend |
| **Budget Deviation** | (Total spend - Sum of original budgets) / Sum of original budgets |
| **Phase Breakdown** | Count of initiatives in each phase (Building, Live, Delivering, Review) |

### KPI Strip (Top of Dashboard)

| Card | Value | Subtitle |
|---|---|---|
| Total Invested | Aggregate spend at selected quarter | Count of items at current org level |
| Total Benefit | Aggregate benefit at selected quarter | "cumulative" |
| Trailing 12mo ROI | Portfolio-wide trailing 4Q ratio | "current performance" |
| Lifetime ROI | Portfolio-wide all-time ratio | "all-time" |
| Budget Status | Over-budget amount or "On Track" | Color-coded red if over |

---

## 9. Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Page title | DM Sans | 700 | 28px |
| Section label (uppercase) | DM Sans | 600 | 10px, letter-spacing 1.5px |
| Quarter display | JetBrains Mono | 700 | 30px |
| KPI values | JetBrains Mono | 700 | 22px |
| KPI labels | DM Sans | 600 | 9.5px uppercase |
| KPI subtitles | DM Sans | 400 | 10.5px |
| Box title (large box) | DM Sans | 700 | 12-14px |
| Box title (medium box) | DM Sans | 700 | 10-11px |
| Box title (small box) | DM Sans | 700 | 8-9px |
| Box metrics | JetBrains Mono | 600-700 | 11-18px |
| Phase badge | DM Sans | 700 | 7-8px uppercase, letter-spacing 1.2px |
| Side panel heading | DM Sans | 700 | 20px |
| Side panel body | DM Sans | 400-600 | 11-12px |
| Legend items | DM Sans | 400 | 10-11px |
| Org slider labels | DM Sans | 600 | 9px |
| Year labels | JetBrains Mono | 400-700 | 9px |
| Category pills | DM Sans | 600 | 11px |

---

## 10. Color System

### Background and Surface

| Element | Color | Hex |
|---|---|---|
| Page background | White to off-white gradient | `#FFFFFF → #F8FAFC` |
| Treemap viewport | White | `#FFFFFF` |
| KPI cards | White | `#FFFFFF` |
| Side panel | White | `#FFFFFF` |
| Secondary surface | Off-white | `#F8FAFC` |
| Tertiary surface | Light gray | `#F1F5F9` |

### Text

| Element | Color | Hex |
|---|---|---|
| Primary text | Near black | `#0F172A` |
| Secondary text | Dark slate | `#1E293B` |
| Tertiary text | Medium slate | `#475569` |
| Muted text | Gray | `#64748B` |
| Disabled / label text | Light gray | `#94A3B8` |

### Borders

| Element | Color | Hex |
|---|---|---|
| Card borders | Near-invisible | `rgba(0,0,0,0.04)` |
| Dividers | Light gray | `#E2E8F0` |
| Active selection ring | Near black | `#0F172A` (3px solid) |

### Health Colors (Full Spectrum)

```
Red        #EF4444  ─── At Risk
Orange     #F97316  ─── Struggling
Amber      #F59E0B  ─── Underperforming
Yellow     #FBBF24  ─── Watch
Lt Green   #34D399  ─── Early Returns
Med Green  #10B981  ─── On Track
Green      #059669  ─── Healthy
Dk Green   #047857  ─── Strong Performer
```

### Semantic Colors

| Purpose | Color | Hex |
|---|---|---|
| Positive / benefit | Green | `#059669` |
| Warning | Amber | `#D97706` |
| Danger / over budget | Red | `#DC2626` |
| Under budget | Blue | `#0EA5E9` |
| Neutral / building | Gray | `#94A3B8` |
| Info / accent | Indigo | `#6366F1` |

---

## 11. Responsive Behavior

### Box Content Progressive Disclosure

Box content adapts based on rendered pixel size:

| Box Size | Content Shown |
|---|---|
| **Large** (w >= 110px, h >= 80px) | Name, phase badge, spend, benefit returned, trailing 12mo ROI, over-budget warning |
| **Medium** (w 70-110px, h 55-80px) | Name, spend amount only |
| **Small** (w < 70px, h < 55px) | Name only (truncated) |

### Text Shadows

- On dark backgrounds (health colors green through red): `0 1px 2px rgba(0,0,0,0.08)` for readability
- On light backgrounds (building, yellow): no text shadow

### Zoom-Dependent Readability

- At zoom < 0.8x, users rely on color patterns for insight; text is supplementary
- At zoom 1.0x, medium and large boxes are fully readable
- At zoom > 1.5x, most boxes become large enough for full content display

---

## 12. Animations and Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Box hover scale | transform | 0.25s | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Box hover shadow | box-shadow | 0.25s | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Benefit fill height | height | 0.5s-0.6s | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Treemap size (growing) | width, height | 0.5s | ease |
| Side panel slide-in | opacity, translateX | 0.3s | `cubic-bezier(0.4, 0, 0.2, 1)` |
| KPI card hover | box-shadow, transform | 0.25s | default |
| Timeline playback | Quarter advance | 450ms interval | N/A |
| Category pill state | all | 0.2s | default |

---

## 13. Component Inventory

| Component | Description |
|---|---|
| **KPI Strip** | 5 cards across top. Each has label, value (JetBrains Mono), subtitle. Hover lifts card. |
| **Legend Bar** | Horizontal row of color dot + label pairs. Below KPI strip, right-aligned. |
| **Category Filters** | Pill buttons. Active state: `#0F172A` fill, white text. Only visible at Firm org level. |
| **Treemap Viewport** | White rounded container (border-radius 20px) with subtle shadow. Contains the zoomable/pannable treemap. |
| **Treemap Box** | Rounded rectangle (8-10px radius) with layered fills: background color, benefit fill overlay, content text. |
| **BU Region Border** | At Division view only. Subtle tinted border around grouped divisions. |
| **Side Detail Panel** | 360px slide-in from right. Adapts content to org level and phase. |
| **Phase Breakdown Bar** | Mini stacked horizontal bar showing initiative count per phase. Shown in side panel at BU/Div level. |
| **Initiative List** | Ranked list in side panel showing each initiative with color bar, name, spend, and ROI. |
| **Org Slider** | Three vertically-connected dots. Right side of treemap. |
| **Timeline Slider** | Play button + range slider + year labels. Bottom of page. |
| **Zoom Controls** | Floating pill in bottom-left of treemap viewport. +, −, %, reset. |

---

## 14. Interaction Flow Summary

```
User opens dashboard
  → Sees Firm view at current quarter (2026 Q1)
  → KPI strip shows portfolio totals
  → Treemap shows ~18 initiative boxes

User hits Play
  → Timeline animates from 2023 Q1 forward
  → Treemap grows as portfolio expands
  → Colors shift as phases transition
  → Boxes appear as initiatives start

User clicks a red box
  → Side panel slides in
  → Shows trailing 12mo ROI, lifetime ROI
  → Shows budget overrun status
  → Shows benefit realization gap

User slides Org to BU
  → Treemap reorganizes into 5 BU boxes
  → Colors reflect weighted aggregate health
  → KPI strip recalculates for BU-level totals

User clicks Operations BU box
  → Side panel shows OPS aggregate stats
  → Phase breakdown bar reveals 3 Live, 2 Building
  → Initiative list shows 6 projects ranked by spend
  → Two projects flagged with red health indicators

User slides Org to Division
  → 5 BU regions appear with labeled borders
  → ~56 division boxes fill the regions
  → User zooms into Operations region
  → Identifies Doc Processing division in red
  → Clicks it: side panel shows it's 28% over budget

User adjusts timeline to 2028
  → Treemap fills more of the viewport
  → Several projects now in Delivering phase (deep green)
  → AIMS Search shows declining amber: 12mo ROI dropped below threshold
  → Clear decommission signal
```

---

## 15. Data Requirements

### Required Fields Per Initiative

| Field | Type | Description |
|---|---|---|
| `initiative_id` | String | Unique identifier |
| `name` | String | Display name |
| `business_unit` | String | Parent BU (WM, ISG, IM, OPS, Tech) |
| `division` | String | Parent division |
| `category` | String | Productivity, Revenue, Compliance, Automation, Infrastructure |
| `owner` | String | Responsible team or individual |
| `original_budget` | Number | Approved budget at inception |
| `committed_benefit` | Number | Projected total benefit from business case |
| `start_quarter` | String | Project start (e.g., "2024Q2") |
| `go_live_quarter` | String | Expected or actual production date |
| `end_quarter` | String | Expected completion (for bounded projects) |
| `quarterly_spend` | Number[] | Actual spend per quarter |
| `quarterly_benefit` | Number[] | Realized benefit per quarter |

### Derived Calculations

All ROI, phase, and aggregate metrics are computed from the raw fields above. No pre-computed scores needed.

---

## 16. Future Enhancements

| Enhancement | Description | Priority |
|---|---|---|
| **Tooltip on hover** | Quick-glance metrics without opening side panel | High |
| **ROI trend sparkline** | Mini line chart in side panel showing trailing 12mo ROI over time | High |
| **BU-to-Division animation** | Smooth subdivision transition when sliding from BU to Division | Medium |
| **Export / screenshot** | One-click export of current view for board decks | Medium |
| **Comparison mode** | Select two BUs and view side-by-side | Medium |
| **Scenario modeling** | "What if we cut this project?" impact simulation | Low |
| **Mobile responsive** | Tablet-optimized layout for on-the-go executives | Low |
| **Real-time data connection** | Live feed from firm's portfolio management system | Future |

---

## 17. Design Principles

1. **One glance, one answer.** Every visual encoding maps to one question. Color = health. Size = spend. Border = budget. No decoding required.

2. **Decisions, not data.** The dashboard surfaces signals (what to fund, what to kill, what to watch) rather than raw numbers.

3. **Progressive disclosure.** Zoom level and click depth control information density. The board never sees more than they need at any altitude.

4. **Honest numbers.** "Done" is not "successful." Completed projects that underdelivered show yellow or red, not green. Lifetime ROI doesn't hide a declining run rate.

5. **Drama with clarity.** Saturated health colors against a clean white canvas. The contrast creates visual urgency without clutter.
