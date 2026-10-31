# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated. The brief proposes React Three Fiber and allows a justified alternative. Chosen: TypeScript, Vite and Three.js without a UI framework, Web Audio API directly, Vitest and Playwright. No backend. See TECHNICAL_ARCHITECTURE.md for the reasoning.

## Users

Primary: adults who follow interactive web work (Awwwards, The FWA, CSSDA, creative developers on GitHub) and horror audiences, arriving alone, usually at night, with 15 to 25 minutes, on a laptop or a phone. Secondary: developers who open the repository to learn how it is made or to contribute an episode.

## Product Purpose

An original interactive horror story that runs in the browser. Success is the visitor asking "what is this place and what happens if I keep going?", finishing the story, and being unsettled by something it noticed about them.

## Positioning

The site really listens to the visitor. Every sentence of narration is a live transcript of what this visitor actually did, and the optional microphone lets actual silence and actual noise change events.

## Operating Context

Solo, private, usually headphones or laptop speakers, sometimes with no sound at all. Mid-range laptops and phones are common; powerful GPUs are not assumed.

## Capabilities and Constraints

- First complete episode: intro, four chapters, ending, restart, integrated Archives & Credits.
- English and Spanish, selectable; subtitles always available.
- Optional microphone: level measurement only, processed on the device, never recorded or transmitted. A hold-to-hold-your-breath control replaces it completely.
- Enter with sound or in silence. No audio before a user gesture. Fully playable muted.
- Controls required: subtitles, volume, pause, restart, quality, reduced motion, exit.
- Quality tiers: CINEMATIC, BALANCED, LITE. A no-WebGL reading path must exist.
- Episode system: story data separated from assets, logic and rendering so future episodes can be added.
- Open source. Code licence differs from media licences. Nothing published, pushed or deployed without the owner's authorisation.
- The user generates AI images in ChatGPT from prompts in ASSETS_TO_GENERATE.md; no image tool runs in this build.

## Brand Commitments

- Working name THE ROOM THAT LISTENS, provisional until name collisions are cleared.
- Halloween palette from the brief: #050507, #0B0B10, #261231, #FF6A00, #FFAA55, #55151D, #77747F, #E8E3DD, never all at once, light physically credible, no neon.
- Elegant, dark, cinematic. No party Halloween, skulls, decorative monsters, or repeated jump scares.

## Evidence on Hand

No existing assets, recordings, press or audience. No stars, awards or usage numbers may be invented. All third-party media must be licensed and recorded.

## Product Principles

- Dread before event: unsettling before anything supernatural happens.
- The story leads; every scene, sound and control exists because the narrative needs it.
- Every interaction has narrative consequence; nothing decorative looks clickable.
- Nobody is excluded by hardware, hearing, sight of motion, or refusal of a permission.
- Honest instrumentation: what the place claims to have noticed, it really measured.

## Accessibility & Inclusion

Adult content notice at entry (death, confinement, interrogation). No strobing; no extreme loudness jumps. Keyboard, touch and one-finger paths through the whole story. Reduced-motion mode. No single sensory dependency: every sound event has a text or visual equivalent.
