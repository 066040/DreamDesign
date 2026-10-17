# Contributing

Thanks for helping! DreamDesign is a plain-JavaScript web app (no framework, no bundler) plus an optional Python server.

## Setup

```bash
git clone https://github.com/066040/DreamDesign && cd DreamDesign
cd tests && npm install        # jsdom + three@0.128.0 for tests
```

## Workflow

1. Edit files in `app/src/` (`head.html` = UI + CSS, `pure.js` = math/mesh code without DOM, `app1.js`…`app7.js` = app code in load order).
2. Rebuild: `node app/src/build.js` → regenerates `docs/index.html`. **Commit it** (CI fails if it is stale).
3. Run tests: `cd tests && npm test`. Put DOM-free logic in `pure.js` and test it in `test_pure.js`; UI behaviour goes in `test_ui.js`.
4. Server changes: `python tests/server_mock/t.py` (uses stub torch/TripoSR) and `python tests/test_meshfix.py`.

## Conventions

- Units are millimetres, Z is up. Parts live in the `parts` array; every state change must be visible to the undo system (`stateData()` in `app5.js`) – new persistent state needs adding there.
- Keep the app a single static page (loads three.js from a CDN). No build tooling beyond `build.js`.
- UI strings are Turkish today; English i18n is on the roadmap – please don't hard-code new user-facing text in more places than necessary.

## Reporting bugs

Open an issue with: what you did, what you expected, browser + OS, and for photo-to-3D: GPU/VRAM and the server console output.
