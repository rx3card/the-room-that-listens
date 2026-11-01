# Technical architecture

## Stack

TypeScript, Vite, Three.js r187, `postprocessing`, `n8ao`, Web Audio API. No backend, no UI framework. Vitest and Playwright for tests.

Why not the suggested React Three Fiber: scenes here are imperative timelines with authored cameras, and the UI is small. A reconciler would add weight and no capability. GSAP and Howler are skipped for similar reasons; see RESEARCH.md.

## Layers

```text
src/
  engine/      Director and types. Pure, no DOM or Three.js.
  episodes/    One folder per episode: data, text, credits, 3D scenes.
  core/        Record, microphone, quality tiers, save, i18n, tweens.
  audio/       AudioEngine and the formant voice.
  render/      Stage (renderer, grade, camera rig, plates) and kit (materials, sky, dust).
  ui/          Widgets and the section plan.
  app.ts       Implements Host: connects the Director to everything else.
```

The rule: **an episode is data**. A scene lists hotspots and steps. `Director` walks them and asks a `Host` to do things. `App` is the real host; the unit tests use a fake one, which is why whole playthroughs run in milliseconds in Vitest, and why the no-WebGL text path is the same story with no extra code.

## Step vocabulary

`say`, `voice`, `doc`, `ask`, `set`, `lean`, `goto`, `move`, `fx`, `wait`, `when`, `widget`, `end`. See `src/engine/types.ts`.

## Rendering

- `RenderPass` to half-float, then N8AO on Balanced and Cinematic, then `EffectPass(Bloom, Grade)`.
- `Grade` is one custom effect: exposure, vignette, print-style split tone, ACES curve, grain. Grain and fringing rise only on story events. The Effect pipeline encodes sRGB itself: do not add gamma in `Grade`.
- Each camera node may carry its own `exposure`.
- Scenes are dynamic imports and are disposed on leaving.

## Matte plates

If `public/assets/plates/<stage>-<node>.webp` exists, `Stage.showPlate` hangs it in the world in front of that node at `renderOrder 1` with no depth test. Objects at `renderOrder 2` (dust, rain, beams, wires) stay live on top. `Built.light()` drives its brightness, so a painted lamp flickers with the real one. Moving away cross-fades back to 3D.

`tools/plates.mjs` shoots the references at 1.45 × the node's field of view in 3:2. Those constants must match `PLATE_FOV` and `PLATE_ASPECT`.

## Audio graph

Sources into buses (`amb`, `sfx`, `voice`), into a `ConvolverNode` with a generated impulse per room plus a dry path, through a lowpass for the listening cups, a limiter at -16 dB, and master gain. Nothing is created before `unlock()` runs inside a click. Positioned sources use HRTF panners and the listener follows the camera.

## Microphone

`Listening` connects the stream to an `AnalyserNode` and nothing else. It reads RMS, calibrates against 0.7 s of room tone, and keeps a single smoothed number. No samples are stored or transmitted. A transmission in the final chapter stores only that loudness curve, in `localStorage`.

## Save

`localStorage`, one JSON key. Fails silently in private windows.

## Scripts

```bash
pnpm dev
```

```bash
pnpm build
```

```bash
pnpm test
```

```bash
pnpm test:e2e
```

`pnpm test:e2e` needs a production build and a Chromium; set `BROWSER_PATH` if it is not at `/usr/bin/brave`. `?fast` shortens every wait to 2% and exposes `window.room` for tests.

`node tools/fetch-assets.mjs` re-downloads and re-encodes third-party media. `node tools/shoot.mjs` walks the story and saves screenshots.
