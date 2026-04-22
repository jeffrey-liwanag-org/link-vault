# Design Spec: Clean Ink Palette + Tag Filter UX

**Date:** 2026-04-22  
**Status:** Approved

## Problem

1. **Color palette** — Current "Softly" design (cream `#FDFCF8`, coral `#FFB7B2`) reads as soft/feminine. Jeff wants something sharper, more neutral, and technical.
2. **Tag UX** — All tags render as a horizontal chip cloud above the bookmark grid. With 45+ tags, this consumes hundreds of pixels before cards even start. No user-friendly filtering experience.

## Approved Design

### 1. Clean Ink Palette

Replace the Softly palette with a Clean Ink system:

| Token | Value | Use |
|---|---|---|
| `ink-950` | `#111318` | Nav background, headings, primary text |
| `ink-700` | `#1F2937` | Nav hover backgrounds |
| `ink-200` | `#E5E7EB` | Card borders, dividers, input borders |
| `ink-100` | `#F3F4F6` | Image placeholders, subtle fills |
| `ink-50`  | `#F8F9FA` | Page background |
| `ink-0`   | `#FFFFFF` | Card backgrounds, nav (light areas) |
| `slate-500`| `#6B7280` | Secondary text, metadata |
| `slate-400`| `#9CA3AF` | Placeholder text, muted labels |
| `indigo-600`| `#4F6BED` | Primary accent: active tags, CTA, logo dot, focus rings |
| `indigo-50`| `#EEF2FF` | Tag pill backgrounds |

**Nav:** Near-black (`#111318`) background, white text, indigo dot logo. Replaces the white/frosted glass pill nav.

**Cards:** White background, `#E5E7EB` border, `0 1px 3px rgba(0,0,0,0.06)` shadow, `border-radius: 12px`. Tag pills use indigo-50 bg + indigo-600 text.

**Body background:** `#F8F9FA` (near-white gray, not cream).

**Remove entirely:** `coral`, `cream`, `sage`, `lavender`, `warm-*` tokens. Remove grain overlay (`.grain`). Remove blob animations on hero.

**Fonts:** Keep Outfit (sans) + JetBrains Mono. Drop Reenie Beanie (cursive — no longer needed without the "remembered." hero text).

### 2. Tag Filter UX

Replace the flat chip cloud with a filter button + popover pattern.

**Controls row** (search | view toggle | sort | filter — all on one line):
```
[ 🔍 Search bookmarks…  ] [ ⊞ ≡ – ] [ Newest ↓ ] [ ⧉ Filter ]
```

**Filter button states:**
- Idle: `⧉ Filter` — white bg, ink-200 border
- Active (tags selected): `⧉ Filter · 2` — indigo bg, white text, count badge

**Active tag pills** (shown below controls row, only when filters active):
```
[ ai × ] [ trading × ]  Clear all
```
- Indigo-50 bg, indigo-600 text, `×` removes that tag
- "Clear all" link resets all filters
- Row hidden entirely when no filters active — no empty space wasted

**Filter popover** (opens on button click, closes on outside click or Escape):
- Anchored below the Filter button, `max-width: 320px`
- Search input at top: `Search tags…`
- Scrollable tag list: tag name left, count right, checkmark when selected
- Selected tags highlighted with indigo-50 bg + indigo-600 text + `✓`
- List sorted: selected first, then by count descending
- All 45+ tags accessible via search — no truncation needed
- Clicking a tag toggles it; popover stays open for multi-select

**Filtering behavior:** Client-side. Cards with `data-tags` attribute are shown/hidden in JS when filter changes. Works alongside existing sort + view mode.

### Files to modify

**Tailwind config:**
- `tailwind.config.mjs` — replace palette (coral/cream/sage → ink/indigo tokens), drop Reenie Beanie font family

**Global styles:**
- `src/styles/global.css` — remove `.grain`, body bg to `#F8F9FA`, update reveal animation (keep), remove blob keyframes if any

**Layout:**
- `src/layouts/BaseLayout.astro` — nav: black bg, white text, remove frosted glass classes

**Components:**
- `src/components/BookmarkCard.astro` — card border-radius 12px, indigo tag pills, ink text colors; add `data-tags` attribute (JSON array) for JS filtering
- `src/components/TagChip.astro` — indigo active state (already close), update inactive border/text colors to ink palette
- `src/components/SearchBar.astro` — ink border, indigo focus ring
- `src/components/ViewModeToggle.astro` — ink active state (already black — likely minimal change)
- `src/components/SortToggle.astro` — ink border, update colors

**New component:**
- `src/components/TagFilter.astro` — filter button + popover + active pills (self-contained, owns all filter state + DOM filtering logic)

**Pages:**
- `src/pages/bookmarks/index.astro` — remove old `{allTags.map(tag => <TagChip …/>)}` block; import + render `<TagFilter {allTags} {tagCounts} />` in controls row; remove `allTags`/`tagCounts` passing to grid (TagFilter owns that)
- `src/pages/bookmarks/[slug].astro` — ink text colors, remove coral CTA → indigo CTA
- `src/pages/tags/index.astro` — ink text colors
- `src/pages/tags/[tag].astro` — ink text colors
- `src/pages/index.astro` — hero: remove blob animations, remove Reenie Beanie, update heading/CTA to ink palette; keep parallax stars or replace with clean dark-ink hero (to decide at implementation — default: keep stars, just recolor text/CTAs)

### TagFilter component spec

```
TagFilter
  props: allTags: string[], tagCounts: Record<string, number>
  state (client JS):
    selectedTags: Set<string>   — persisted to localStorage 'linkVaultTags'
    search: string              — filters the popover list
    open: boolean               — popover visible

  DOM filtering:
    On selectedTags change → for each .bookmark-card[data-tags]:
      parse data-tags as JSON array
      if selectedTags.size === 0 → show all
      else → show only if card tags include ANY selected tag (OR logic, matches current behavior)

  Active pills:
    Render only when selectedTags.size > 0
    Each pill: tag label + × button → removes from selectedTags

  Popover list:
    Full tag list, filtered by search string
    Sort: selected first, then by count desc
    Click tag → toggle in selectedTags
```

## Verification

1. **Build clean** — `npm run build` zero errors, 340 pages.
2. **Color audit** — no coral/cream/sage colors visible anywhere in browser. Nav is near-black. Cards white. Tags indigo.
3. **Grain gone** — no SVG noise overlay.
4. **Filter idle** — `/bookmarks` loads, zero tags shown above cards, no extra whitespace.
5. **Filter active** — click Filter → popover opens with full tag list; select "ai" → popover stays open; close popover → "ai ×" pill shows; grid filtered to 47 ai-tagged cards.
6. **Filter persist** — refresh page → "ai" still selected (localStorage).
7. **Clear all** — "Clear all" link resets, all 99 cards visible, pill row gone.
8. **Filter + sort** — select "trading" then sort Title A–Z → filtered AND sorted correctly.
9. **Filter + search** — select "ai" then type "claude" in search → results respect both.
10. **Mobile** — filter button tappable, popover scrollable, pills wrap correctly at 375px.
