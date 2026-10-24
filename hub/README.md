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

Firmware reviewed on 2026-10-24: `85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7` (one repository commit, dated August 31, 2026). Board model is not identified by that source. UNO R4 WiFi is a prior project report, pending physical confirmation. Time-of-flight device model, interface, wiring and library are unknown. Original firmware is unchanged.

Read-only animation references: existing LayerLane `components/particles/ParticleStudio.tsx`, `ParticleCanvas.tsx` and `BrandParticleField.tsx`. Reused safe architectural patterns: isolated pointer-transparent background, capped pixel density, low-amplitude layered drift. The implementation uses Canvas 2D rather than bringing the React/WebGL application into this static project. No unrelated code, data or credentials were copied. Stars are capped at 200, drawn at at most 30fps, and stopped in hidden documents or reduced-motion mode. The motion control also pauses the decorative staircase animation.

Browser API documentation consulted: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). Deployment follows Vercel's [static files API workflow](https://vercel.com/docs/platforms/multi-project-platforms/reference).

## Browser checks

`test.mjs` uses Playwright and an isolated headless Edge profile. Install/use Playwright from an approved local toolchain, set `NODE_PATH` to that toolchain if needed, then run `node hub/test.mjs` while the local server is running. Set `BASE_URL` for deployed checks. No existing browser session is used or closed. Tests cover chapters, heading focus, keyboard navigation, Escape, browser Back/Forward, local links, actual firmware download byte integrity, external URLs, six responsive widths, motion control, reduced motion and measured canvas draw cost. Screenshots and JSON results are in ignored `hub/evidence/`.
