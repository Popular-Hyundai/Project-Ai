# LUMO RING

A scroll-driven product story for a fictional sleep and recovery ring. The default build runs the waitlist in demo mode. Valid submission displays “Form works. Nothing was saved.”

## Run locally

Use Node 24 and npm. Install dependencies with `npm install`, then run `npm run dev`. Open the URL Vite prints.

| Command | Result |
| --- | --- |
| `npm run build` | Strict type check, production bundles and pre-rendered HTML in `dist/` |
| `npm run preview` | Serve the production build |
| `npm run check:placeholders` | Scan source, HTML and available build output |
| `npm run verify` | Rebuild, run the browser matrix, axe, form and Lighthouse checks, then verify GPU fallbacks |
| `npm run check:gpu` | Run the fallback and off-screen pause checks against an existing build |

Browser checks use installed Chrome on Windows or Linux. Set `CHROME_PATH` to a Chrome executable on other systems, or run `npx playwright install chromium`. Screenshots and machine-readable measurements go to `qa-output/`. Set `QA_DIR` to override the output directory. Run demo verification with `VITE_WAITLIST_URL` empty.

## Project map

- `src/content.ts` holds brand and company details, product language, launch wording and privacy copy.
- `src/sections/Story.tsx` contains the semantic sections, sticky labels, finish selection and waitlist form.
- `src/state.ts` and `src/motion.ts` measure sections and drive scroll progress.
- `src/scene/Scene.tsx` builds rounded toroidal profiles, an open battery arc, a four-strip PMREM studio and an instanced TSL waveform. Three’s RenderPipeline combines scene colour and bloom.
- `src/style.css` defines the six palette tokens, local typefaces and responsive layouts.
- `public/` contains licensed fonts, local detect-gpu benchmarks, ring posters and social artwork.
- `tests/` contains the production pre-render step and executable QA gates. The optional `tools/render-posters.py` regenerates the WebP posters with Python, NumPy and Pillow.

## Swap these before a real launch

1. Update the brand name, product language, specification facts, company details and year in `src/content.ts`. Confirm the statements about publishing validation results and specifications. Replace the fictional-brand disclosure when appropriate.
2. Update the six CSS tokens and corresponding scene material colours together. Replace the local fonts, licence files, preload links and font declarations together.
3. Set `SITE_ORIGIN` to the production origin for absolute Open Graph artwork. Refresh `public/social.jpg` for the real brand.
4. Set `VITE_WAITLIST_URL` before building to enable JSON POST submissions containing only `email`. The endpoint must return success only after accepting the address. A cross-origin endpoint must allow the page origin and JSON POST requests. Keep credentials on the server.
5. Review the real operator’s privacy language, deletion contact or process, and launch-only use before connecting a live database. Blank address and email fields are omitted.

## Renderer checks

Use `?tier=high`, `mid`, `low` or `poster` to inspect quality paths, and `?renderer=webgl` to force WebGL2. `?renderer=webgpu` prefers WebGPU with automatic fallback. Reduced motion and software rendering take precedence over quality overrides. Mobile waits for interaction before starting the scene. The `window.lumo` diagnostic exposes frame count, backend and maximum scene-frame draw calls.

The source ZIP excludes dependencies, Git metadata and build output. See `QA.md` for release measurements and verification scope.

