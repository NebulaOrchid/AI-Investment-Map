# Claude Code: Fix Zoom-Aware Text - SURGICAL FIX

The zoom-aware text scaling is NOT working. Look at the screenshot: boxes are large on screen (user has zoomed in) but still only showing truncated single letters like "K...", "R...", "C". The full content (name, spend, ROI) should be visible at this zoom level.

## Root Cause

Somewhere in the box rendering code, the content tier decision uses the raw treemap layout dimensions:

```javascript
// WRONG - ignores zoom
const sm = r.w < 90 || r.h < 65;
const xs = r.w < 55 || r.h < 40;
```

These values are the DATA layout size, not what the user actually sees on screen. When zoom = 2.0, a box that's 60px in the layout is 120px on screen. It should show full content, but the code still thinks it's 60px.

## Exact Fix

Find EVERY place where box width/height is compared against pixel thresholds for content visibility. Replace with effective size:

```javascript
// CORRECT - factors in zoom
const ew = r.w * zoom;  // effective visual width
const eh = r.h * zoom;  // effective visual height

const hidden = ew < 55 || eh < 40;     // no text at all
const minimal = ew < 90 || eh < 60;    // name only
const compact = ew < 130 || eh < 85;   // name + spend
// else: full content (name, phase, spend, benefit, ROI, warnings)
```

The `zoom` state variable already exists in the component. Make sure it is accessible in the map/render function where boxes are drawn.

## Verify

After the fix:
- At zoom 1.0x with 100+ boxes, small boxes should show just color or name
- At zoom 2.0x, most boxes should show full metrics (name, spend, ROI, phase)
- At zoom 0.5x, most boxes should be pure color tiles with no text

Search the entire file for any hardcoded pixel comparisons on `r.w`, `r.h`, `box.w`, `box.h` used for content visibility decisions and fix ALL of them.

Do NOT rewrite the entire file. Only change the lines that compute content visibility tiers.
