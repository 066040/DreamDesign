# Changelog

## Unreleased – tidy advanced mode, stable camera and move; printing and pricing removed
- **Removed from the design tool**: the *Baskı* tab (printer fit, support preview, auto-orientation, price), and the price / order strip in simple mode. Simple mode now ends with *STL olarak indir*. The standalone quote page (`docs/bastir.html`) and shop page are unchanged and no longer linked from the app.
- **Top bar**: four core tools plus menus (*Biçim ver*, *Ekle / çıkar*, *Ölç*, *Görünüm*) with shortcuts shown; a selection filter (part / edge and corner / edge only / corner only). Choosing a tool opens only that tool's panel in *Düzenle*.
- **Camera**: turntable orbit (no roll), wheel zooms toward the cursor in perspective and orthographic views, right or middle button pans; top view now has +Y up.
- **Move / rotate**: no free-drag handles; 1 mm and 5° steps (Alt for free); live readout of how far the part moved or turned; moving sideways keeps the part on the bed; arrow keys nudge by 1 mm (Shift 10 mm), PageUp / PageDown for height.
- **Side panel**: *Parça* tab = part list, size / position / rotation, step list; *Ekle* tab = shapes, file import, KiCad enclosure, multi-view, shelf; rarely used part settings folded away; general messages visible on every tab.

## Unreleased – enclosure from a KiCad board
- **KiCad kartından kutu** (Model tab, or drop a `.kicad_pcb`): reads Edge.Cuts outline (lines, arcs, rects, circles, polygons), board thickness, mounting holes, and each footprint's side, body box and height; KiCad 6–10 files.
- Builds a tray (outline offset by clearance + wall), standoffs with pilot holes under every mounting hole, wall openings for edge USB / buttons / connectors (chosen per part), and a lipped press-fit lid placed beside the tray, flat side down.
- Suggests the space below and above the board from the tallest parts and from USB plug size; either board face can point up.
- Board preview part is excluded from STL/OBJ/GLB export, print preparation and pricing.
- The generated tray and lid are normal parts: holes, rounding etc. are added and edited through the step list.
- Tests: `tests/test_pcb.js`.

## Unreleased – step list (parametric history)
- **Yapılanlar (step list)**: each part keeps a recipe (base shape + steps). Shown in the Model tab and in simple mode ("Yaptıkların"). *Değiştir* edits a step's size, *Sil* removes it; the part is rebuilt from its base with every remaining step re-applied, and stays where it was.
- Recorded steps: primitives and rounded box, holes and bosses, round/chamfer, make cup, resize after other steps, 90° turns. Holes are tied to the surface they were drilled into, so a blind hole keeps its depth when the body's height changes.
- Free-form edits lock earlier steps (still listed, no longer editable); new steps can be added on top of the locked shape.
- A step that no longer fits (e.g. a hole left outside a shrunk body) reports which step failed and leaves the part unchanged.
- Recipes are saved in project files, restored by undo/redo, and copied with *Kopyasını yap*.
- Tests: `tests/test_history.js`.

## 0.3.0 – simple mode, instant print quote and print preparation
- **Basit (simple) mode**, now the default: plain-Turkish panel for beginners (add shape, size in mm, colour, move on bed, turn, lay down, copy, delete, make cup, drill hole, round corners, join all, live price and order). Switch to Gelişmiş any time; choice is remembered, `?mod=` overrides. First visit clears the large advanced demo scene and shows a three-step guide.
- **New Baskı (print) tab in DreamDesign**: printer presets and custom bed, fit check with shrink-to-fit, overhang/support analysis with red highlight, support grams and bed contact, *lay with least support* auto-orientation (undoable), tablaya oturt, live price, hand-off to the quote page.
- Shared `printAnalyze` / `bestDown` in `app/src/quote/price.js` (DreamDesign and quote page give the same price); support material is part of the price.
- **New page `docs/bastir.html`**: upload STL/OBJ, resize (slider or mm), choose material, colour, strength and quantity, see the print price live. Plain Turkish, large touch targets, works on phones.
- Price from mesh volume and surface area (shell + infill model), print-time estimate, editable price table (`QUOTE_CFG`).
- Fit-to-printer, open-mesh and cm/inch warnings; "too expensive?" one-click suggestion.
- Order via WhatsApp summary + scaled STL download, or `postMessage` when embedded in an iframe.
- Tests: `tests/test_quote.js`; CI checks the built page is up to date.

## 0.2.0 – edges, holes, booleans
- **Edge / corner tool (`B`)**: grab a single sharp edge or corner and drag. *Move* tilts the neighbouring faces (they stay flat, the far side stays put); *Bend* turns the edge into an exact circular arc. Live arc angle, radius, sag and arc length; numeric input by vector or by bend angle; reach slider; axis lock.
- Hovering an edge shows its length and the angle between its two faces; curved edges also show their arc angle and radius.
- **Holes and bosses (`H`)**: click a face, set diameter, depth (or through) and position in mm; drill or add a boss.
- **Real boolean operations**: union, subtract, intersect between parts (manifold-3d, WASM, loaded on first use). Volume and mass are exact; the old weld-only merge is kept as "fast mesh merge".
- **Three-point angle measurement**, saved with the project.
- **Rounded box** primitive with a true corner radius in mm (rebuild after resizing).
- Fix: normals/UVs were not resized when a mesh's vertex count changed on undo.

## 0.1.0 – first public beta
- Model from front/side/top silhouettes (intersection) or a single inflated view.
- Optional photo-to-3D server (TripoSR): correct upright orientation, X–Y centring, base on Z=0, floater removal, smoothing, low-VRAM chunking with automatic fallback.
- Lattice-cage reshaping with symmetry, grab-and-pull, numeric transforms.
- Cut, merge, mirror, clone; outline/section/centre-line views; orthographic cameras; measurements bound to parts.
- 2D sketch area (extrude, revolve, photo outline tracing), shelf with drag-to-mount, joints and poses.
- Mass, centre of gravity and flight calculators; STL/OBJ/GLB export; project save/load.
- Global undo/redo (Ctrl+Z / Ctrl+Y); experimental webcam hand gestures.
- Install scripts for Windows and Linux/macOS; CI.
