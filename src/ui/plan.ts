import { t } from '../core/i18n'

// Vale's section through the headland. Sea left, mirror, gallery, membrane, relay, spiral: drawn to lie over Gray's Fig. 904.
export const PLAN_ROUTE: Record<string, [number, number]> = {
  sea: [40, 300],
  mirror: [188, 210],
  gallery: [320, 232],
  membrane: [420, 250],
  relay: [470, 214],
  spiral: [585, 292],
  apex: [612, 310],
}

export function planSvg() {
  const label = (x: number, y: number, key: string) => `<text x="${x}" y="${y}">${t(key)}</text>`
  return `<svg class="plan" viewBox="0 0 760 460" role="img" aria-label="${t('doc.plan.t')}">
    <path class="sea" d="M0 330 H118" />
    <path class="rock" d="M118 330 C126 300 118 270 130 240 C138 214 132 190 150 176 C160 150 196 96 240 92 H760 V460 H150 C140 420 128 380 118 330Z" />
    <path class="void" d="M170 142 C232 160 232 280 170 300 C150 262 150 180 170 142Z" />
    <path class="void" d="M228 214 C290 226 360 232 412 236 L420 268 C360 258 290 252 228 246Z" />
    <path class="void" d="M428 226 C440 196 472 170 500 186 C528 200 526 232 498 244 C470 254 436 262 430 276Z" />
    <path class="void" d="M532 250 C574 226 640 240 648 292 C654 340 590 360 556 330 C530 306 560 268 596 282 C624 294 616 326 590 324 C572 322 574 300 590 300" stroke-width="26" fill="none" />
    <path class="skin" d="M420 228 L428 280" />
    <path class="bone" d="M444 214 L470 196 M470 196 L486 232 M486 232 L528 248" />
    ${label(30, 320, 'plan.sea')}${label(150, 128, 'plan.mirror')}${label(280, 216, 'plan.gallery')}${label(392, 306, 'plan.membrane')}${label(462, 170, 'plan.relay')}${label(620, 214, 'plan.spiral')}
  </svg>`
}
