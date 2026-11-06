# Sidebar editor design

Preserve the existing Ukrainian, light, blue-and-white Leaflet editor. The
redesign makes the sidebar denser and moves secondary settings into one native
dialog. No framework, icon package, font download, or new dependency is added.

## Tokens

All UI colors are declared as CSS custom properties in `index.html` inside
`style#app-styles`. Application JavaScript lives in `script#app-script` in the
same file, so publishing or opening `index.html` needs no sibling assets or local
server. Leaflet loads from its pinned CDN URL; it and OpenStreetMap tiles require
an internet connection. The
existing palette remains the source of truth:

- Ink `#1d2b42`, muted ink `#52637a`, white panel `#ffffff`.
- Canvas `#edf1f6`, control surface `#f4f7fb`, selected wash `#e4eeff`.
- Primary blue `#3268ce`, hover blue `#295bb9`.
- Neutral borders `#dce4ef` and `#e8edf5`; danger ink `#a63146`.
- Spacing follows a 4px scale from 4px through 32px.
- Compact desktop controls are 32px high; standard buttons are 36px. Narrow
  layouts use 40px controls, with the tightest header rows never below 36px.
  Point headers have no extra vertical padding, so their desktop row is 32px.
- Radii use 6px, 8px, 10px, and 12px roles. Shadows retain a cool navy tint.
- The UI font remains the existing system sans stack with Inter as a local
  fallback. Labels are 11–12px, control text 12–13px, and the card title 16px.

## Layout and scroll ownership

The app occupies `100dvh`; document scrolling is disabled. On desktop the shell
is a two-column grid with a 380px sidebar and a fluid map. The sidebar is a
three-row shell: fixed title header, the only vertical scroll owner `.scroll`,
and a fixed import footer. Its grid and flex descendants retain `min-height: 0`
and `min-width: 0` where content must shrink.

The collapse and save controls are tabs outside the sidebar on the map edge.
When the sidebar closes, both tabs move to the left viewport edge. The sidebar
slides left with `transform`, while the desktop grid column contracts so the map
can use the released width. The map remains responsible for its own redraw;
JavaScript toggles `.settings-closed`, sets `side.inert`, and invalidates Leaflet
through the map `ResizeObserver`.

At 760px and below the map fills the viewport and the sidebar becomes a left
overlay no wider than 356px, always leaving 96px for the two adjacent outside
tabs. The
outside tabs remain reachable and do not overlap Leaflet's top-right zoom
control; the zoom stack moves below the tab row on narrow layouts. The save
menu anchors to the viewport's right inset at this width so its 196px panel
cannot overflow. Printing hides the sidebar, tabs, save menu, mode badge, and
map zoom.

## Sidebar anatomy

The header shows the project title as `#cardTitleText`. The bound
`#cardTitle` input starts hidden and is revealed only for inline title editing.
The point-list heading contains the count, a global visibility control, and a
global settings gear.

Point cards are keyboard-focusable list items. Their compact header contains a
truncated plain-text name, inline name editor, visibility control, center
control, and the collapse chevron as the final action. Deleting a point is a
full-width danger button at the end of the card body, separated from routine
header actions.
Collapsed cards reserve touch gestures for reordering; expanded cards retain
normal panel scrolling. Buttons and inputs never initiate a reorder.

Coordinates are normally one compact text button. Editing reveals the labelled
latitude/longitude form. The main ring row exposes only maximum distance and
step; visual ring properties live behind its gear. Sector rows expose only start
and end angles, plus settings and delete controls. Landmark rows expose only a
name, edit control, and delete control. Long point and landmark names truncate
with an ellipsis instead of widening the sidebar.

The footer contains only the visible project-import action. Save and export
actions live in `#saveMenu`, opened from the adjacent outside save tab.

## Settings dialog and inheritance

One native modal `#settingsDialog` serves every gear. JavaScript supplies the
heading, scope text, and generated `.field` / `.cols2` controls inside
`#settingsFields`. Native `showModal()` provides focus containment; the explicit
close button and Escape provide dismissal.

Settings use the narrowest applicable scope:

1. Global settings define defaults for newly created points and items.
2. Point-level ring, sector-default, and landmark-default gears inherit the
   current global values, then store overrides for that point.
3. A sector or landmark gear inherits its point defaults, then stores overrides
   for that item.
4. Reset removes the current scope's overrides and immediately reveals the
   inherited values. Save commits the generated fields for the active scope.

This inheritance changes settings data only; it does not change coordinates,
visibility, collapse state, names, or existing geometry ownership.

## Motion and state

Panel and outside-tab movement uses a 220ms standard easing. Button feedback and
surface-color changes use 140ms. Spatial sidebar movement is transform-based;
the desktop grid column transitions in parallel so the map expands without a
hard jump. Input remains available throughout the transition.

Under `prefers-reduced-motion: reduce`, transitions collapse to an effectively
instant state change. No decorative animation, loop, blur animation, or motion
unrelated to an interaction is introduced.

Selected point headers use the existing blue tonal wash, never a colored edge.
All controls have hover, pressed, and visible keyboard-focus states. Icon-only
buttons have accessible names and native title hints. Inputs retain visible
labels, except angle labels that are visually hidden but remain bound and
announced with degree units.

## Empty states and copy

The only instructional prose in the sidebar is the empty point-list message and
the no-sectors message. Other guidance belongs in control labels, titles, dialog
scope text, or dynamic validation.

## JavaScript contract

Markup retains `pointTemplate`, `zoneTemplate`, `landmarkTemplate`, `pointList`,
`emptyPoints`, `pointCount`, `toggleSettings`, `settingsPanel`, `map`,
`modeBadge`, `filePicker`, `importJSON`, `exportJSON`, `exportPoints`,
`exportGeoJSON`, and `print`.

The redesigned templates intentionally require the paired JavaScript
implementation to populate plain-text names, coordinate summaries, generated
settings fields, save-menu state, title edit state, visibility state, and
settings inheritance. JavaScript must use text/value assignment rather than
HTML insertion for user-provided names.
