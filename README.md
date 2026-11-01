# The Room That Listens

An interactive horror story in the browser. About twenty minutes, in English and Spanish, for adults.

A signal arrives from an address that does not exist. It leads to a concrete listening station on a headland where the sea makes no sound. You go through it room by room, playing wax cylinders of people who disappeared in 1938, while a stenographer's record describes everything you do.

The record is real. Every sentence about you is measured: how long you read, when you held your breath, when you left the tab. With your permission, the station can also hear how loud your actual room is. Only loudness, on your device; nothing is recorded or sent.

There are three endings. One of them has no button.

> The word "story" here is literal: there are no lives, scores or failure states, and it can be finished with one finger.

## Run it

Requires Node 22 and pnpm.

```bash
pnpm install
```

```bash
pnpm dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Type-check and production build |
| `pnpm test` | Unit tests, including whole headless playthroughs |
| `pnpm test:e2e` | Browser tests against the build; set `BROWSER_PATH` to a Chromium |
| `node tools/fetch-assets.mjs` | Download and re-encode third-party media |
| `node tools/shoot.mjs` | Walk the story and save screenshots |
| `node tools/plates.mjs` | Export reference views for painted plates |

## How it is built

TypeScript, Vite, Three.js, Web Audio. No backend and no UI framework. An episode is plain data walked by a small director, so stories can be added without touching the renderer. See [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md).

Some things worth a look if you read code:

- `src/audio/voder.ts`: a formant speech synthesiser in the manner of the 1939 Voder.
- `src/engine/director.ts`: the story engine, testable with no browser.
- `src/render/stage.ts`: the camera rig, the grade, and matte plates hung in front of 3D.
- `src/episodes/deaf-point/scenes/spiral.ts`: tens of thousands of wires that part around things that are not there.

## Accessibility

Playable without sound, without a microphone, without WebGL (the whole story becomes text), by keyboard, by one finger, and with reduced motion. See [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Documents

[PRODUCT](PRODUCT.md) · [DESIGN](DESIGN.md) · [Story bible, spoilers](STORY_BIBLE.md) · [Experience map](EXPERIENCE_MAP.md) · [Audio](AUDIO_DESIGN.md) · [Research](RESEARCH.md) · [Performance](PERFORMANCE.md) · [Validation](VALIDATION.md) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

## Licences

The code is MIT. Media keep their own licences, listed in [LICENSES.md](LICENSES.md) and [CREDITS.md](CREDITS.md).

## En español

Una historia interactiva de terror en el navegador. Una estación de escucha en un cabo donde el mar no suena, y una transcripción de todo lo que haces, medida de verdad. Instalación y scripts arriba; la documentación creativa está en español.
