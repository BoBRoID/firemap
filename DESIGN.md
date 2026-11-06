# Existing editor design

Preserve the existing Ukrainian, light, blue-and-white Leaflet editor. This is
a point-list editor using the existing palette and controls. No new framework
or dependencies.

## Layout

The app occupies 100dvh. The desktop sidebar is 380px wide. Only `.scroll`
scrolls; its flex ancestors and itself must have min-height: 0. The brand and
status stay fixed. The map fills the remaining width and full viewport height.
On narrow screens a left overlay is at most 356px wide and leaves at least 48px
of map visible. The sidebar still has full viewport height and its own scroll.
The chevron toggle lives in the top brand block while open. While closed, it
becomes a small tab flush with the left viewport edge. Map zoom controls live
at the top right, away from this tab. Document scrolling is disabled.
Printing hides settings and uses the whole page for the map.
There is no title card overlay on the map; the title remains project metadata.

## Existing tokens and primitives

- System sans with Inter fallback; body ink #1d2b42; white panel.
- Primary action #3268ce, secondary action #f4f7fb, border #dce4ef.
- Labels 12px, inputs 13px, headings 16px; existing spacing is retained.
- `.field`, `.cols2`, `.btn`, `.section`, `.distance-label` are shared primitives.
- Point cards use neutral borders and a tonal selected header. Each header has
  a collapse chevron, an editable name, a crosshair fit button and a delete icon.
- A grip reorders points using pointer dragging (including touch), with edge
  autoscroll. A focused grip also supports Arrow Up/Down. Order is preserved in
  the project, CSV and GeoJSON.
- An eye toggles the entire point's map visibility, independently of collapse.
  Hidden points retain settings, sectors and landmarks. Centering or map
  placement explicitly reveals that point. Visibility is saved in the project.
- Point bodies contain a coordinate form, independent ring settings and a list
  of sector editors. Each sector has its own fields and delete button. A plus
  adds a sector below that point, and the pencil retains two-click map drawing.
- Landmarks have their own list below the sectors. A plus enters map placement
  mode within the point's outer ring. Each landmark has an editable name and a
  delete icon. Its map label and list row show its name, distance and azimuth.
- Only the selected center is draggable. Its coordinates, rings, sectors and
  landmark readings update while dragging; landmark coordinates stay fixed.
- Collapsing a point hides its whole body, including sectors, without deleting
  or hiding its map geometry. Map clicks expand the selected point.
- Inputs retain visible blue focus borders and rings. Buttons retain hover states.
- Selected centers use a filled blue dot and white border, not an edge stripe.
- Distance labels retain the existing white surface, shadow, radius and bold text;
  horizontal and vertical padding become user settings. Labels stay centered on
  their geographical anchor regardless of padding.

## Behavior and accessibility

All added controls have explicit labels. Settings and point toggles expose their
expanded state and controlled region. Point headers work with the keyboard.
Editable names are inserted as text or input values, never HTML.
Existing map pan and zoom remain available; scrolling settings does not move it.
No new motion. Themes remain as originally implemented: light only.

## Accepted scope

Preserve geometry, printing and exports. Project v3 stores names, individual
settings, landmarks, visibility and collapse state. V1/v2 and older v3 files
without landmarks or visibility import with empty landmarks and visible points.
CSV includes names
with proper quoting. The former map-wide fit button is removed; each point has
its own fit action, with 50px map padding around rings, sectors and landmarks.
On narrow screens fitting hides the overlay so it does not obscure the point.
Deleting a point removes its sectors and landmarks too. The existing
scroll-body shell remains the layout.
