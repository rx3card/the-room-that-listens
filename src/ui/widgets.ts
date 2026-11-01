import { clamp } from '../core/tween'
import { t } from '../core/i18n'

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...kids: (Node | string)[]) {
  const { cls, ...rest } = props
  const e = document.createElement(tag)
  if (cls) e.className = cls
  Object.assign(e, rest)
  e.append(...kids)
  return e
}

export const button = (label: string, cls: string, onClick: () => void) => el('button', { cls, type: 'button', textContent: label, onclick: onClick })

const GITHUB_MARK = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'

export function githubLink(label: string) {
  const a = el('a', { cls: 'source', href: 'https://github.com/rx3card/the-room-that-listens', target: '_blank', rel: 'noopener' })
  a.innerHTML = `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="${GITHUB_MARK}"/></svg>`
  a.append(el('span', { textContent: label }))
  return a
}

/** The live signal: a canvas that stands in the title sentence. A flat line until something moves it. */
export class Strip {
  canvas = el('canvas', { cls: 'strip' })
  private c = this.canvas.getContext('2d')!
  private hist = new Float32Array(180)
  private head = 0
  drive = 0
  envelope?: number[]
  gain = 1

  draw(time: number, level: number) {
    const cv = this.canvas
    const w = cv.clientWidth, h = cv.clientHeight
    if (!w) return
    const dpr = Math.min(devicePixelRatio, 2)
    if (cv.width !== w * dpr) {
      cv.width = w * dpr
      cv.height = h * dpr
    }
    const ctx = this.c
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const env = this.envelope ? this.envelope[Math.floor(time * 20) % this.envelope.length] : 0
    const a = Math.max(level, this.drive, env, 0.09 + Math.abs(Math.sin(time * 0.7)) * 0.08 + (Math.sin(time * 0.31) * Math.sin(time * 0.17)) ** 8 * 0.5)
    this.hist[this.head] = a * this.gain
    this.head = (this.head + 1) % this.hist.length
    this.drive *= 0.92
    ctx.strokeStyle = level > 0.02 ? '#ffaa55' : '#e8e3dd'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const n = this.hist.length
    for (let i = 0; i < n; i++) {
      const v = this.hist[(this.head + i) % n]
      const x = (i / (n - 1)) * w
      const y = h / 2 + Math.sin(i * 0.9 + time * 9) * v * h * 0.48 * Math.sin((i / n) * Math.PI)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
  }
}

/** Press and hold, by pointer or Space. progress is fed from outside so a microphone can drive it too. */
export class HoldControl {
  root: HTMLElement
  down = false
  private fill: SVGCircleElement
  private textEl: HTMLParagraphElement
  private smallEl: HTMLElement
  private key = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || e.repeat) return
    e.preventDefault()
    this.set(e.type === 'keydown')
  }

  constructor(parent: HTMLElement, label: string, hint: string, showButton: boolean) {
    this.root = el('div', { cls: 'hold', role: 'group' })
    const btn = el('button', { type: 'button', ariaLabel: label })
    btn.innerHTML = `<svg viewBox="0 0 104 104"><circle class="track" cx="52" cy="52" r="46"/><circle class="fill" cx="52" cy="52" r="46"/></svg>`
    this.fill = btn.querySelector('.fill')!
    this.textEl = el('p', { textContent: label })
    this.smallEl = el('small', { textContent: hint })
    if (!showButton) btn.style.visibility = 'hidden'
    this.root.append(btn, this.textEl, this.smallEl)
    parent.append(this.root)
    btn.addEventListener('pointerdown', e => {
      e.preventDefault()
      btn.setPointerCapture(e.pointerId)
      this.set(true)
    })
    btn.addEventListener('pointerup', () => this.set(false))
    btn.addEventListener('pointercancel', () => this.set(false))
    btn.addEventListener('contextmenu', e => e.preventDefault())
    addEventListener('keydown', this.key)
    addEventListener('keyup', this.key)
    btn.focus()
  }

  private set(v: boolean) {
    this.down = v
    this.root.classList.toggle('down', v)
  }

  progress(k: number) {
    this.fill.style.strokeDashoffset = String(289 * (1 - clamp(k)))
  }

  remove() {
    removeEventListener('keydown', this.key)
    removeEventListener('keyup', this.key)
    this.root.remove()
  }
}

/** Circular drag on the handle. Keyboard and one-finger visitors can keep Space or the wheel held instead. */
export class Crank {
  root: HTMLElement
  rate = 0 // 1 is the right speed
  private wheel: HTMLElement
  private knob: HTMLElement
  private ang = 0
  private last?: number
  private vel = 0
  private held = false
  private said: HTMLElement
  private key = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || e.repeat) return
    e.preventDefault()
    this.held = e.type === 'keydown'
  }

  constructor(parent: HTMLElement) {
    this.said = el('p', { cls: 'said', ariaLive: 'polite' })
    this.wheel = el('div', { cls: 'wheel', role: 'button', tabIndex: 0, ariaLabel: t('ui.crank') })
    this.knob = el('div', { cls: 'knob' })
    this.wheel.innerHTML = `<svg viewBox="0 0 104 104"><circle class="track" cx="52" cy="52" r="46" fill="none" stroke="#77747f" stroke-width="2"/></svg>`
    this.wheel.append(this.knob)
    this.root = el('div', { cls: 'crank' }, this.said, this.wheel, el('small', { textContent: `${t('ui.crank')}. ${t('ui.crankKey')}` }))
    parent.append(this.root)
    const angle = (e: PointerEvent) => {
      const r = this.wheel.getBoundingClientRect()
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
    }
    let dragging = false
    this.wheel.addEventListener('pointerdown', e => {
      dragging = true
      this.last = angle(e)
      this.wheel.setPointerCapture(e.pointerId)
    })
    this.wheel.addEventListener('pointermove', e => {
      if (!dragging) return
      const a = angle(e)
      let d = a - this.last!
      if (d > Math.PI) d -= Math.PI * 2
      if (d < -Math.PI) d += Math.PI * 2
      this.last = a
      this.vel += Math.abs(d) * 1.4
      this.ang += d
    })
    const up = () => (dragging = false)
    this.wheel.addEventListener('pointerup', up)
    this.wheel.addEventListener('pointercancel', up)
    addEventListener('keydown', this.key)
    addEventListener('keyup', this.key)
    this.wheel.focus()
  }

  tick(dt: number) {
    if (this.held) {
      this.vel = 0.05
      this.ang += dt * 6
    }
    this.rate += ((this.held ? 1 : clamp(this.vel / dt / 8, 0, 1.6)) - this.rate) * Math.min(1, dt * 8)
    this.vel *= 0.5
    const r = this.wheel.clientWidth / 2 - 14
    this.knob.style.transform = `translate(${Math.cos(this.ang) * r}px, ${Math.sin(this.ang) * r}px)`
  }

  show(text: string) {
    this.said.textContent = text
  }

  remove() {
    removeEventListener('keydown', this.key)
    removeEventListener('keyup', this.key)
    this.root.remove()
  }
}
