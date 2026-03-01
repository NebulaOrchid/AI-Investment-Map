# Claude Code: Fix Zoom Text Scaling - CORRECT ROOT CAUSE

## The Real Problem

The treemap uses CSS `transform: scale(zoom)` on the container. This magnifies everything visually, but the layout dimensions don't change. A box that is 80px wide in the treemap layout still has 80px of space for text, even at 345% zoom. The text is truncated/clipped at 80px, then the truncated result is scaled up. So users see a giant "Q..." instead of the full project name.

`transform: scale()` does NOT change layout. It only magnifies pixels. Text overflow, ellipsis, and line wrapping all happen at the original layout size.

## The Fix

Inside each treemap box, the font-size and padding must be divided by the zoom level. This makes text smaller in layout-space, so more characters fit within the box's layout width. Then when CSS transform scales it back up, the text appears at normal reading size but shows the full content.

### Step 1: Compute inverse zoom factor

At the top of the box rendering loop:

```javascript
const zInv = 1 / Math.max(zoom, 0.5); // inverse zoom, clamped
```

### Step 2: Scale all font sizes and padding by zInv

For every font-size and padding value inside the box content div, multiply by zInv:

```javascript
// BEFORE (broken):
padding: "9px 12px"
fontSize: 13

// AFTER (fixed):
padding: `${9 * zInv}px ${12 * zInv}px`
fontSize: 13 * zInv
```

Apply this to ALL of these inside the box:
- The outer content div padding
- The project name font-size
- The phase badge font-size and padding
- The spend/benefit/ROI metric font-sizes
- The over-budget warning font-size
- The line-height values

### Step 3: Adjust content tier thresholds

The content tier should now use effective visual size to decide WHAT to show:

```javascript
const ew = r.w * zoom;
const eh = r.h * zoom;

const hidden = ew < 50 || eh < 35;
const minimal = ew < 85 || eh < 55;
const compact = ew < 130 || eh < 80;
// else: full content
```

### Step 4: Remove aggressive text truncation for larger tiers

For the full content tier, remove `whiteSpace: nowrap` and `textOverflow: ellipsis` on the project name so it can wrap to a second line if needed. Only keep truncation for the minimal tier where space is truly tight.

```javascript
// Full and compact tiers:
whiteSpace: "normal",
wordBreak: "break-word",
overflow: "hidden",
display: "-webkit-box",
WebkitLineClamp: compact ? 1 : 2,  // 1 line for compact, 2 for full
WebkitBoxOrient: "vertical",

// Minimal tier:
whiteSpace: "nowrap",
textOverflow: "ellipsis",
overflow: "hidden",
```

### Step 5: Also scale the BU region labels (division view)

The BU region labels (e.g., "WEALTH MANAGEMENT") inside the nested treemap borders also need the zInv treatment:

```javascript
fontSize: 10 * zInv
```

## What This Achieves

| Zoom Level | Layout Font Size | Visual Font Size | Text Fits |
|------------|-----------------|------------------|-----------|
| 0.5x | 26px (in layout) | 13px (on screen) | Very few chars, most boxes hidden tier |
| 1.0x | 13px | 13px | Normal behavior |
| 2.0x | 6.5px (in layout) | 13px (on screen) | Full names fit easily |
| 3.45x | 3.8px (in layout) | 13px (on screen) | Everything fits, full metrics visible |

The text always LOOKS the same size on screen regardless of zoom. But at higher zoom, more content fits because the layout-space font is smaller.

## Important

- Apply zInv to EVERY font-size and padding inside the treemap boxes
- Apply zInv to the BU region labels too
- Do NOT apply zInv to anything outside the zoomed container (KPI cards, legend, timeline, side panel)
- Do NOT change the zoom/pan transform mechanism itself
- Do NOT change the treemap layout algorithm
- The zoom state variable already exists, just reference it in the box render

## Test

After the fix:
- At 100% zoom: looks exactly like before, no visual change
- At 200% zoom: boxes show full project names and all metrics
- At 345% zoom: every box shows full content, text is readable at normal size
- At 50% zoom: most boxes are color tiles with no text or just initials
