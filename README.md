# DreamDesign

**Photo to 3D, edit, and design anything.** A free, open-source, Fusion-360-style 3D design workspace that runs in your browser: turn photos and silhouettes into 3D models, then reshape, cut, measure, rig and export them. Start with a flying car, a robot dog or a humanoid — the only limit is your imagination.

[Türkçe README](README.tr.md) · **[Try it online](https://066040.github.io/DreamDesign/)** · [Report a problem](https://github.com/066040/DreamDesign/issues)

![DreamDesign: a car built from front, side and top silhouettes](docs/img/multiview.png)

> **Status: beta (v0.1).** It works and is tested, but it is young. The interface is currently **Turkish only** (English UI is the first roadmap item); the docs are bilingual. Your browser's "translate page" works well in the meantime.

## What you can do

- **Model from several views** – give a front, side and/or top photo or drawing; DreamDesign intersects the silhouettes into a real, measured solid. One view only? It inflates the shape and you tell it how deep it should be.
- **Photo to 3D (optional backend)** – drop in a single photo and [TripoSR](https://github.com/VAST-AI-Research/TripoSR) builds a 3D model locally on your own GPU (works on 4 GB cards, or CPU).
- **Reshape like clay** – a lattice *cage* lets you pull the roof down, stretch a nose or a mug handle, with left/right symmetry. There is also local grab-and-pull, numeric move/scale, and 90° re-orientation.
- **Cut, merge, mirror, clone** – exact plane cuts with caps, welding, mirrored copies.
- **See it your way** – painted, triangle skeleton, silhouette outline, section lines, centre line; perspective or true orthographic; one-key X/Y/Z views; grid and live dimensions.
- **Sketch → solid** – 2D sketch area with lines, rectangles, circles and typed dimensions; extrude or revolve into a part, or trace a photo outline at real size.
- **Assemble** – a shelf of parts you drag onto the model (they snap to the surface); revolute and sliding joints with poses.
- **Engineering numbers** – volume, mass per material, centre of gravity, hover power / disk loading / endurance / stall speed for aircraft concepts.
- **Measure** – click two points on the model; measurements stay attached to their part.
- **Undo/redo everything** – `Ctrl+Z` / `Ctrl+Y` cover edits, sketches, joints and measurements.
- **Import / export** – GLB, OBJ, STL in; STL, OBJ, GLB and a project file out.
- **Hand gestures (experimental)** – orbit, zoom and pan with your webcam via MediaPipe (local server only).

## Quick start

### 1. Just the design tools (no install)

Open **<https://066040.github.io/DreamDesign/>**, or download this repository and open `docs/index.html` in a browser. Everything except single-photo-to-3D and webcam gestures works this way.

### 2. With photo-to-3D (local server)

Needs Python 3.11 and (recommended) an NVIDIA GPU; CPU works but is slow.

- **Windows:** double-click `scripts/install.bat`, then `scripts/run.bat`.
- **Linux/macOS:** `scripts/install.sh`, then `scripts/run.sh`.

The browser opens at <http://localhost:8000>. The first run downloads the model weights (~1.7 GB). Drop a photo on the viewport.

> The installer scripts follow the manual steps we used to get TripoSR running on Windows with a 4 GB GPU. Linux/macOS scripts are less tested — please open an issue if something fails.

Server settings (environment variables): `TSR_DEVICE=cpu`, `TSR_RES` (mesh resolution, default 192), `TSR_QCHUNK`, `TSR_SMOOTH`. If the GPU runs out of memory the server automatically retries at lower resolution.

## Keyboard shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| `1` `2` `3` / `0` | X / Y / Z view / isometric | `Q` `G` `R` `S` | select / move / rotate / scale |
| `F` | fit to view | `E` | grab-and-pull |
| `P` | perspective ⇄ orthographic | `K` | lattice cage |
| `W` | triangle skeleton on/off | `M` | measure |
| `D` | sketch area | `Ctrl+Z` / `Ctrl+Y` | undo / redo |

## Honest limits

- A **single photo cannot show the back of an object.** TripoSR guesses it; the result is a plausible model, not a measurement. Use two or three views for measured results.
- No true boolean operations yet (overlapping parts are counted twice in mass); cut caps can be imperfect on very concave cross-sections.
- The sketcher has no constraint solver and no holes.
- Mass and volume assume closed surfaces, so AI-generated meshes give approximate values.
- Hand gestures have only been exercised with simulated input, not on many real webcams.
- Tested with the author's setup (Windows, 4 GB NVIDIA GPU). Other setups: please report.

## Project layout

```
app/src/     web app source (plain JS, no framework) – build.js bundles it
docs/        built single-file app (served by GitHub Pages) + screenshots
server/      optional photo-to-3D backend (FastAPI + TripoSR) and mesh clean-up
scripts/     install / run scripts
tests/       unit + jsdom UI tests, server mock test
```

## Development

```bash
node app/src/build.js          # writes docs/index.html
cd tests && npm install && npm test
python tests/test_meshfix.py   # needs: numpy trimesh scikit-image
```

Edit files in `app/src/`, rebuild, and commit the regenerated `docs/index.html` (CI checks it is up to date). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

1. English interface (i18n) and more languages
2. Template fitting – start from a car / aircraft / humanoid skeleton and fit it to your silhouettes
3. Pluggable, stronger image-to-3D backends (local or cloud)
4. Real boolean operations, sketch constraints, holes
5. Mobile / touch polish, example projects

Ideas and pull requests are welcome.

## Credits

[three.js](https://threejs.org) (MIT) · [TripoSR](https://github.com/VAST-AI-Research/TripoSR) (MIT) · [MediaPipe](https://developers.google.com/mediapipe) (Apache-2.0) · [rembg](https://github.com/danielgatis/rembg) (MIT) · scikit-image, trimesh, FastAPI.

## License

[MIT](LICENSE). Third-party models and weights keep their own licenses — check them before commercial use.
