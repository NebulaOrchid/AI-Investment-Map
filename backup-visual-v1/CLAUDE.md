# AI Investment Heatmap — Project Context

## What This Is

A React component (`ai-heatmap.jsx`) that visualizes 200+ AI initiatives at a large investment bank as a dynamic treemap heatmap, inspired by S&P 500 market maps. Built for CEO-level boardroom presentations projected on screen.

Target audience: Senior leadership (C-suite) at a large US financial services / investment banking firm.

## File

- `ai-heatmap.jsx` — Single-file React component, no external chart library. Uses Tailwind CSS utilities + injected CSS via template literal.

## Core Concept

Each box in the treemap = one AI initiative (project or perpetual license like M365 Copilot). Box size = cumulative budget/investment. A timeline slider (Q1 2026 through Q4 2030) lets the viewer scrub through time and watch the portfolio grow, shrink, and evolve.

## Architecture

### Tech Stack
- React functional component with hooks: useState, useMemo, useCallback, useRef, useEffect
- Tailwind CSS for layout and utility classes
- No external chart library. Treemap uses a custom squarify algorithm built from scratch.
- CSS animations injected as a template literal string via `<style>{STYLES}</style>`

### Data Model
- ~225 AI initiatives generated procedurally by `genData()`
- 20 quarters (Q1 2026 through Q4 2030)
- Each initiative has: id, ticker (e.g. "RIS-001"), name, category, division, budget, perpetual flag, start/end quarter, quarterly data array (`qd`), owner, risk level, hours/month
- Quarterly data per initiative (`qd[quarterIndex]`): cumulative spend (`cum`), cumulative realization (`cumR`), phase (dev/pilot/live/completed), over-budget flag (`over`), realization percentage (`rpct`)

### Categories
Risk & Compliance, Operations, Revenue Growth, Customer Experience, Data & Analytics, Infrastructure, Wealth Management, Trading & Markets

### Divisions
Risk, Ops, Credit, CX, Marketing, Finance, Legal, WM, Trading, Tech, HR, Compliance

## Key Features

### 1. Dynamic Treemap
- Custom squarify layout algorithm (function `treemap()`)
- Boxes sized by cumulative spend (`val = d.cum`)
- Active initiatives render as treemap boxes; completed ones become gold "graduated badges" below the map

### 2. Timeline Slider
- Range input from 0 to 19 (20 quarters)
- Moving the slider recalculates which initiatives are active, their phases, spend, and realization
- Year labels shown below the slider track

### 3. Dynamic Map Scaling
- The map container itself grows as total investment increases
- `growthFactor = Math.sqrt(currentTotalBudget / q1TotalBudget)`
- Base dimensions: 800x500px, multiplied by growthFactor
- Creates a dramatic visual effect: the map physically expands as the slider advances
- "MAP SCALE" indicator with progress bar shown in the timeline bar

### 4. Scroll-to-Zoom
- Mouse wheel on the map viewport adjusts zoom from 20% to 400%
- Uses native DOM event listener via useEffect (passive: false to allow preventDefault)
- Zoom percentage shown in top HUD bar

### 5. Color System
The `boxColor()` function encodes multiple signals:
- **Completed**: dark green bg, gold border, gold glow
- **Over budget**: red bg (intensity varies), red border, red inner glow. Also gets a thicker left border (3px red).
- **Live with realization**: green bg that brightens as rpct increases (100 + rpct * 155 green channel), matching border, green inner glow that intensifies
- **Pilot**: amber/yellow, low opacity
- **Dev**: blue, low opacity
- Each box also has a thin realization progress bar at the bottom edge (green, glows brighter as rpct grows)

### 6. Box Content (Responsive)
- Shows ticker if box is wide enough (>45px) and tall enough (>25px)
- Shows name if box is >75px wide and >45px tall
- Shows spend amount + realization % if box is >55px wide and >35px tall
- Font sizes scale dynamically with box dimensions: `Math.max(8, Math.min(11, width / 10))`

### 7. Bottom Detail Drawer
- 180px fixed height, appears when a box is clicked
- 4 sections side by side:
  1. Identity: ticker, name, division, category, owner, phase/status badges
  2. Financials: budget, actual spend, variance %, realized value, realization %
  3. Budget Curve: sparkline bar chart showing all 20 quarters, current quarter highlighted in cyan, over-budget bars in red, realization overlay in green
  4. Status: risk level, start date, target date, full ROI date, hours/month, realization progress bar

### 8. AI Strategist Chat Panel
- Right side panel, 256px wide, toggleable via "INTEL" button
- Keyword-based response system (not LLM-connected):
  - "summary" — portfolio overview
  - "over"/"red"/"risk" — over-budget initiatives
  - "top"/"best" — top performers by realization %
  - "growth" — portfolio growth narrative
- Quick-query buttons: Summary, Over budget, Top performers, Growth

### 9. Graduated Badges
- Completed/fully-realized initiatives shrink to small gold badge chips below the treemap
- Show ticker only, gold dot indicator
- Clickable (opens detail drawer)
- Capped at 50 visible, overflow shows "+N" count
- Toggleable via "BADGES" button

### 10. HUD Top Bar
- Compact single-row header with:
  - AI logo + title
  - 6 metrics: Active count, Graduated count, Deployed $, Realized $, ROI %, Over-budget count
  - Color legend (DEV, PILOT, LIVE, OVER $, DONE)
  - Zoom % display
  - BADGES and INTEL toggle buttons

## Current Visual Style (Cyberpunk/Gaming — TO BE CHANGED)

The current style is a gaming/cyberpunk aesthetic that needs to be replaced with something more boardroom-appropriate. Here's what exists now so you know what to swap out:

### Colors
- Background: pure black (`bg-black`)
- Primary accent: cyan/teal (`#00ffc8`, `rgba(0,255,200,...)`)
- Text: cyan shades (cyan-300 for primary, cyan-800 for labels, cyan-900 for subtle)
- Borders: cyan-900/20 to cyan-900/30

### Typography
- Font: monospace throughout (`font-mono` on root div)
- Label sizes: 9px for micro labels, 10px for data, text-xs/text-sm for headers
- Uppercase tracking-wider on titles

### CSS Animations (in STYLES template literal)
- `scanline`: 2px horizontal line sweeping vertically across screen (8s loop)
- `pulse-glow`: opacity oscillation 0.3 to 0.6
- `data-flow`: horizontal gradient slide (3s loop)
- `.grid-overlay`: faint 40px grid pattern
- `.neon-border`: inset + outer box-shadow glow
- `.hud-corner`: pseudo-element corner brackets (::before top-left, ::after bottom-right)
- `.glow-text`: text-shadow with cyan
- `.slider-neon`: custom webkit slider thumb (18px circle, cyan with glow) and track (4px, gradient)
- `.box-glow`: hover state with cyan box-shadow
- `.box-selected`: stronger cyan glow on selected box
- `.data-stream`: animated horizontal gradient background

### Hover/Selection Effects
- Boxes: cyan glow on hover (`.box-glow`), stronger glow on selected (`.box-selected`)
- Graduated badges: amber background on hover
- Text shadows use `currentColor` for metric values

## Style Direction (Pending Decision)

Four options were discussed for replacing the cyberpunk style. The style should be:
- Dramatic but professional
- Modern and sleek
- Easy on the eyes for boardroom viewing
- Projector-optimized (dark charcoal/navy preferred over pure black, since pure black washes out on mid-tier projectors)
- "Wow factor" for senior banking leadership

Options considered:
1. **Bloomberg Terminal** — Dark navy + amber/white. Finance-native language. High projector readability.
2. **Mission Control** — Slate gray + electric blue + white. NASA/SpaceX aesthetic. Clean grid layout.
3. **Glass Morphism** — Frosted panels + blur effects over deep gradient (teal to midnight blue). Most visually striking.
4. **Monochrome Luxury** — Near-black + single accent color (emerald or gold). Minimal animation. Restraint as the statement.

When restyling, the key elements to update are:
- Root background color
- The `STYLES` template literal (all CSS animations and custom classes)
- `boxColor()` function (all bg, border, glow values)
- Tailwind color classes throughout JSX (cyan-300, cyan-800, cyan-900, etc.)
- Slider styling (`.slider-neon` classes)
- Font family (currently mono, may change)
- Bottom drawer colors and borders
- Chat panel colors
- Legend colors array

## Stats Object

Computed per quarter via useMemo:
```
stats = {
  tb: total cumulative budget (all active + graduated),
  tr: total cumulative realization,
  ac: active initiative count,
  gc: graduated initiative count,
  ob: over-budget count,
  ar: at-risk count (dev phase for >4 quarters),
  rr: realization ratio (tr / tb)
}
```

## Dependencies

- React (useState, useMemo, useCallback, useRef, useEffect)
- Tailwind CSS (utility classes only, no custom config needed beyond defaults)
- No other libraries

## How to Run

This is a React component with a default export. It expects to be rendered in an environment with React and Tailwind CSS available. It fills the viewport (`h-screen`).

Typical setup: Vite + React + Tailwind, or Next.js, or any React scaffold. Import and render `<AIHeatMap />` as a full-page component.
