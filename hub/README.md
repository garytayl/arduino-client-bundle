# Staircase project library

A static, dependency-free hub for the staircase project. HTML, CSS and Canvas 2D; no backend, account system, analytics or secrets. Intended public URL: `https://stairs.layerlane.studio`.

## Run

Requires Node.js and Git. From the repository root:

```powershell
node hub/build.mjs
node hub/serve.mjs
```

Open `http://127.0.0.1:4173`. The build writes only `hub/dist/`. Deploy that directory to Vercel with the Other framework preset and no server runtime. The included `vercel.json` supplies response security and download headers.

## Updating the library

- **Code & Versions:** add a real revision to `content/project.json` with its full Git commit, source path, date and unique download filename. The build reads the committed Git object, so old version downloads cannot silently change. Do not invent releases from plans or branch names. Keep referenced commits in repository history.
- **Hardware & Wiring:** edit `src/index.html` when component models, electrical details or pinouts have been verified. Label source-derived signal assignments separately from physical wiring evidence.
- **Testing:** add performed results to `src/index.html`, including date, firmware commit, exact hardware/library versions, steps and actual observations. Current entries are proposed checks, not passes.
- **Notes & Next Steps:** update the `notes` array in `content/project.json`. Keep proposed changes and unknowns explicit.
- Rebuild, inspect changes, run browser checks, commit and deploy `dist/`. Future deployment automation may be added separately; this version does not install a persistent GitHub integration.

Never add house/network diagrams, addresses, device IPs, private access links, credentials or client information. This is a public site. A difficult-to-guess link is not access control.

## Evidence and provenance

Original firmware reviewed on 2026-10-24: `85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7` (one firmware revision, dated August 31, 2026). Board model is not identified by that source. Later project photo identification confirms UNO R4 WiFi and four-pin HW-870 reflective IR modules, not ToF devices. Inventory label ratings and unresolved electrical details are recorded in Hardware & Wiring. Original firmware is unchanged.

## Separate sensor bench

The practical page is `https://stairs.layerlane.studio/#bench`, authored in `src/bench.html`. Its separate source is `../bench/HW870_Sensor_Bench_v1/HW870_Sensor_Bench_v1.ino`; build copies it to `downloads/HW870_Sensor_Bench_v1.ino`. Do not silently change this v1 file after publication; add a new named diagnostic when needed. It is not part of the original staircase version history.

The sketch is statically reviewed but uncompiled: no Arduino CLI/IDE backend or installed UNO R4 core was found in the inspected local toolchain locations. No hardware was accessed. A real UNO R4 WiFi compile and user-chosen upload remain separate from site/browser tests. See `../bench/README.md`. Keep private photos off the public site.

## Separate ToF bench

The new CQRobot carrier is a strong visual match for CQRWX00744US / VL53L1X, not a confirmed SKU or chip ID. Its independent page is `https://stairs.layerlane.studio/#tof` (`src/tof.html`). Source and validation notes are in `../bench/VL53L1X_ToF_Bench_v1/`. Build publishes `downloads/VL53L1X_ToF_Bench_v1.ino`. This preserves the HW-870 diagnostic and original firmware. It uses Pololu VL53L1X 1.3.1, with architecture metadata and Renesas Wire API checked; no board compile, flash or physical test is claimed. Wiring remains unconfirmed. No private photos are included.

Read-only animation references: existing LayerLane `components/particles/ParticleStudio.tsx`, `ParticleCanvas.tsx` and `BrandParticleField.tsx`. Reused safe architectural patterns: isolated pointer-transparent background, capped pixel density, low-amplitude layered drift. The implementation uses Canvas 2D rather than bringing the React/WebGL application into this static project. No unrelated code, data or credentials were copied. Stars are capped at 200, drawn at at most 30fps, and stopped in hidden documents or reduced-motion mode. The motion control also pauses the decorative staircase animation.

Browser API documentation consulted: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). Deployment follows Vercel's [static files API workflow](https://vercel.com/docs/platforms/multi-project-platforms/reference).

## Browser checks

`test.mjs` uses Playwright and an isolated headless Edge profile. Install/use Playwright from an approved local toolchain, set `NODE_PATH` to that toolchain if needed, then run `node hub/test.mjs` while the local server is running. Set `BASE_URL` for deployed checks. No existing browser session is used or closed. Tests cover chapters, heading focus, keyboard navigation, Escape, browser Back/Forward, local links, actual firmware download byte integrity, external URLs, six responsive widths, motion control, reduced motion and measured canvas draw cost. Screenshots and JSON results are in ignored `hub/evidence/`.


## October 24 combined bench and next visit

Current chapters: `#progress`, `#firmware`, `#roadmap`, `#layout`, `#parts`. The current downloadable source is `bench/releases/2026-10-24/ToF_Rainbow_Ripple_90_Smooth_v2.ino`, preserved byte for byte from the Mac's final uploaded version. The 60-pixel recovery ZIP is separate and unchanged. Neither is a 4–5 sensor implementation. The chosen next prototype uses a TCA9548A mux with one ToF per channel; installation gates remain untested.

Amazon links were researched October 24, 2026. A bounded signed-out US browser check confirmed sensor $19.99 sold by CQRobot and jumper kit $6.98 sold by ELEGOO Official US, both in stock and shipped by Amazon. The specified Adafruit mux listing was currently unavailable, without a purchase price or seller. These are dated observations, not guaranteed offers or a checkout total. Keep the existing original source and published diagnostic downloads unchanged. `dist/site-version.json` records the Git commit built for live verification.
