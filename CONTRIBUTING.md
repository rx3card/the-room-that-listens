# Contributing

## Add an episode

1. Copy `src/episodes/deaf-point` to a new folder.
2. Describe the scenes in `index.ts`: hotspots and steps. No rendering belongs here.
3. Put every string in `text.ts`, in both languages. A test enforces matching keys and placeholders.
4. Build each 3D place as a function returning `Built` (see `src/render/kit.ts`).
5. Add its stage to `buildStage` in `src/app.ts`.
6. Add a headless playthrough for each ending to `tests/unit`.

## Rules of this project

- What the piece says it noticed, it must really have measured.
- Every interaction has a narrative consequence. No decorative controls.
- Every sound has a text or visual equivalent.
- No strobing and no sudden loudness.
- Microphone data never leaves `Listening`, and only a loudness number leaves the analyser.
- Log every third-party file in `ASSET_SOURCES.md`, `CREDITS.md` and `src/episodes/deaf-point/credits.ts`.

## Before a pull request

```bash
pnpm check
```

```bash
pnpm build && pnpm test:e2e
```

Look at your change in a real browser. `node tools/shoot.mjs` needs the dev server on port 5199.

## Code style

Match what is there: plain TypeScript, small functions, short comments that say why. Add a dependency only when a few lines cannot replace it.
