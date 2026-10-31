import * as THREE from 'three'
import { AudioEngine, type Ambience } from './audio/audio'
import { detectLang, getLang, setLang, t, type Lang } from './core/i18n'
import { Listening } from './core/listening'
import { guessQuality, type QualityName } from './core/quality'
import { clock, Transcript } from './core/record'
import { blank, load, save, type Save } from './core/store'
import { clamp, inOut } from './core/tween'
import { Director, newState } from './engine/director'
import type { Host, SceneDef } from './engine/types'
import { cylinders, deafPoint, RELAY_CODE, type CylinderId } from './episodes/deaf-point'
import * as credits from './episodes/deaf-point/credits'
import { descentPath, flightPath, FOCUS } from './episodes/deaf-point/scenes/headland'
import { register, speech } from './episodes/deaf-point/text'
import type { Built } from './render/kit'
import { Stage } from './render/stage'
import { PLAN_ROUTE, planSvg } from './ui/plan'
import { button, Crank, el, HoldControl, Strip } from './ui/widgets'

const params = new URLSearchParams(location.search)
const FAST = params.has('fast') ? 0.02 : 1 // end-to-end tests run the clock quickly

const hasWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

async function buildStage(name: string, stage: Stage, fallen: number[]): Promise<Built> {
  // Each chapter's scene is its own chunk, fetched when the story reaches it.
  if (name === 'headland') return (await import('./episodes/deaf-point/scenes/headland')).buildHeadland(stage.q)
  if (name === 'wax') return (await import('./episodes/deaf-point/scenes/wax')).buildWax(stage.q)
  if (name === 'spiral') return (await import('./episodes/deaf-point/scenes/spiral')).buildSpiral(stage.q)
  return (await import('./episodes/deaf-point/scenes/other')).buildOther(stage.q, fallen)
}

export class App implements Host {
  ui = document.getElementById('ui')!
  canvas = document.getElementById('stage') as HTMLCanvasElement
  audio = new AudioEngine()
  ear = new Listening()
  data: Save = load()
  rec!: Transcript
  stage?: Stage
  dir!: Director
  strip = new Strip()
  lastInput = performance.now()
  private stageName = ''
  private recordEl = el('div', { cls: 'record', role: 'log', ariaLive: 'polite' })
  private voiceEl = el('div', { cls: 'voice' })
  private spots = el('div', { cls: 'spots' })
  private layer = el('div')
  private flight?: Promise<void>
  private docSeconds = 0
  private sceneNoise = { idle: false, loud: false }
  private hiddenAt = 0
  private paused = false
  private crank?: Crank
  private spotEls = new Map<string, HTMLElement>()
  private chrome = el('div')
  private started = false
  private time = 0

  constructor() {
    setLang(this.data.settings.lang ?? detectLang())
    this.ui.append(this.spots, this.recordEl, this.voiceEl, this.layer, this.chrome)
    this.rec = new Transcript(s => this.showRecord(s))
    if (this.data.settings.reduced === undefined) this.data.settings.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.classList.toggle('reduced', !!this.data.settings.reduced)
    this.watchVisitor()
    this.title()
    const loop = (ms: number) => {
      this.time = ms / 1000
      this.ear.update()
      this.strip.draw(this.time, this.ear.level)
      if (!this.stage) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  // --- title ---------------------------------------------------------------------------------

  private title() {
    const again = this.data.visits > 0
    const root = el('section', { cls: 'title' })
    const langs = el('div', { cls: 'langs' })
    for (const [code, name] of [['en', 'English'], ['es', 'Español']] as [Lang, string][]) {
      const b = button(name, '', () => {
        this.data.settings.lang = code
        setLang(code)
        save(this.data)
        root.remove()
        this.title()
      })
      b.setAttribute('aria-pressed', String(getLang() === code))
      b.lang = code
      langs.append(b)
    }
    const webgl = hasWebGL()
    const main = el(
      'main',
      {},
      el('h1', { cls: 'sentence', ariaLabel: `${t('title.a')} ${t('title.b')}` }, el('span', { textContent: t('title.a') }), this.strip.canvas, el('span', { textContent: t('title.b') })),
      el('p', { cls: 'lead', textContent: t('title.lead') }),
      el('p', { cls: 'notice', textContent: webgl ? t('title.notice') : t('title.nowebgl') }),
      ...(again ? [el('p', { cls: 'again', textContent: t('title.again', { n: 42 + this.data.visits }) })] : []),
      el(
        'div',
        { cls: 'enter' },
        ...(this.data.state && !this.data.state.ending ? [button(t('title.resume'), 'btn', () => this.enter(false, true))] : []),
        button(t('title.sound'), this.data.state && !this.data.state.ending ? 'btn quiet' : 'btn', () => this.enter(false)),
        button(t('title.silence'), 'btn quiet', () => this.enter(true)),
      ),
    )
    root.append(
      el('header', {}, el('span', { textContent: 'Punta Sorda, 2026' }), langs),
      main,
      el('footer', {}, el('span', { textContent: t('title.headphones') }), button(t('title.archive'), 'link', () => this.archive())),
    )
    if (this.data.signal) this.strip.envelope = this.data.signal
    this.ui.append(root)
    root.querySelector<HTMLElement>('.enter .btn')?.focus()
  }

  private async enter(silent: boolean, resume = false) {
    if (this.started) return
    this.started = true
    this.audio.unlock(silent)
    const root = this.ui.querySelector<HTMLElement>('.title')!
    const webgl = hasWebGL()
    const fresh = !resume
    if (fresh) {
      this.data.state = newState(deafPoint)
      this.data.record = []
      if (!resume) this.data.visits += 1
    } else this.rec.entries = this.data.record ?? []
    save(this.data)
    this.dir = new Director(deafPoint, this, this.data.state!, () => this.persist())

    if (webgl) {
      const name = this.data.settings.quality ?? guessQuality()
      this.stage = new Stage(this.canvas, name, !this.data.settings.quality)
      this.stage.reduced = !!this.data.settings.reduced
      this.stage.onFrame = dt => this.frame(dt)
      this.stage.onDowngrade = q => this.fps(q)
      const stageName = deafPoint.scenes[this.dir.state.scene].stage
      if (stageName !== 'none') await this.ensureStage(stageName)
      this.canvas.classList.add('on')
    }
    root.classList.add('out')
    setTimeout(() => root.remove(), 1500)
    this.menuButton()
    if (!fresh) return void this.dir.resume()
    if (this.data.lastAsked) this.rec.add('rec.returning', { name: this.data.lastAsked })
    if (this.data.signal) this.rec.add('rec.signalBack', { seconds: Math.round(this.data.signal.length / 20) })
    this.rec.add(silent ? 'rec.acceptsSilent' : 'rec.accepts')
    void this.dir.start()
  }

  private fps(_q: QualityName) {}

  private async ensureStage(name: string) {
    if (!this.stage || this.stageName === name) return
    const built = await buildStage(name, this.stage, this.fallen())
    this.stageName = name
    this.stage.setBuilt(built)
    built.event('walkerStep', () => {
      const p = this.stage?.camera.position
      if (p) this.audio.tick('step', p.x + 1.4, p.y - 1, p.z + 1.4)
    })
  }

  private fallen() {
    return this.dir.state.asked.map(id => cylinders[id as CylinderId].register as number).filter(i => i >= 0)
  }

  private named() {
    return this.dir.state.asked.flatMap(id => cylinders[id as CylinderId].named ?? [])
  }

  private persist() {
    this.data.state = this.dir.state
    this.data.record = this.rec.entries
    const n = this.named()
    if (n.length) this.data.lastAsked = n[n.length - 1]
    save(this.data)
    this.refreshSpots()
  }

  // --- per-frame ------------------------------------------------------------------------------

  private frame(dt: number) {
    const s = this.stage!
    this.ear.update()
    s.live.level = this.ear.level
    this.crank?.tick(dt)
    const cam = s.camera
    const dir = cam.getWorldDirection(new THREE.Vector3())
    this.audio.listener(cam.position.x, cam.position.y, cam.position.z, dir.x, dir.y, dir.z)
    if (this.stageName === 'spiral') this.audio.spiralDepth(clamp(-cam.position.y / 9))
    this.placeSpots()
    this.noticeVisitor()
    if (this.ui.querySelector('.strip')) this.strip.draw(this.time += dt, this.ear.level)
  }

  private placeSpots() {
    const s = this.stage
    const a = s?.built?.anchors
    if (!s || !a || this.spots.classList.contains('list')) return
    for (const [id, node] of this.spotEls) {
      const p = a[id] ? s.project(a[id]) : null
      node.style.display = p ? '' : 'none'
      if (!p) continue
      const x = clamp(p.x, 40, innerWidth - 40), y = clamp(p.y, 56, innerHeight - 40)
      node.style.transform = `translate(${x}px, ${y}px)`
      node.classList.toggle('flip', x > innerWidth - 240)
    }
  }

  private refreshSpots() {
    const dir = this.dir
    if (!dir) return
    this.spots.textContent = ''
    this.spotEls.clear()
    this.spots.classList.remove('list')
    if (dir.busy || this.paused || !this.layerIdle()) return
    const av = dir.available()
    if (!av.length) return
    if (!this.stage) return this.textStage()
    if (av.length > 4) {
      // seven labelled cylinders on a phone would collide: they become a plain list
      this.spots.classList.add('list')
      const list = el('div', { cls: 'list', role: 'list' })
      for (const h of av) list.append(button(t(h.label), '', () => void dir.activate(h.id)))
      this.spots.append(list)
      return
    }
    for (const h of av) {
      const b = el('button', { cls: 'spot', type: 'button', onclick: () => void dir.activate(h.id) }, el('i'), el('span', { textContent: t(h.label) }))
      b.setAttribute('aria-label', t(h.label))
      this.spots.append(b)
      this.spotEls.set(h.id, b)
    }
    this.placeSpots()
    this.spotEls.values().next().value?.focus({ preventScroll: true })
  }

  private layerIdle() {
    return this.layer.childElementCount === 0
  }

  /** Without WebGL the same director drives a text page: every hotspot becomes a choice. */
  private textStage() {
    const dir = this.dir
    this.layer.querySelector('.textstage')?.remove()
    const scene = dir.scene
    const list = el('div', { cls: 'list', style: 'position:static;transform:none;margin-top:20px;max-height:none;width:100%;max-width:44ch' } as never)
    for (const h of dir.available()) list.append(button(t(h.label), '', () => void dir.activate(h.id)))
    this.spots.append(el('section', { cls: 'textstage' }, el('h2', { textContent: t(scene.title) }), el('p', { textContent: t(scene.describe) }), list))
  }

  // --- the visitor is being watched: all of these are measured, none are scripted -------------

  private watchVisitor() {
    const mark = () => (this.lastInput = performance.now())
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, mark, { passive: true })
    let px = 0, py = 0
    addEventListener('pointermove', e => {
      if (Math.hypot(e.clientX - px, e.clientY - py) > 40) {
        px = e.clientX
        py = e.clientY
        mark()
      }
    })
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.dir) this.toggleMenu()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.hiddenAt = Date.now()
      else if (this.hiddenAt && this.dir) {
        const s = Math.round((Date.now() - this.hiddenAt) / 1000)
        if (s >= 5) this.rec.add('rec.away', { seconds: s })
        this.hiddenAt = 0
      }
    })
  }

  private noticeVisitor() {
    if (!this.dir || this.dir.busy || this.paused) return
    const idle = (performance.now() - this.lastInput) / 1000
    if (idle > 50 && !this.sceneNoise.idle && this.dir.scene.hotspots.length) {
      this.sceneNoise.idle = true
      this.rec.add('rec.idle', { seconds: Math.round(idle) })
    }
    if (this.ear.level > 0.7 && !this.sceneNoise.loud) {
      this.sceneNoise.loud = true
      this.rec.add('rec.loud')
    }
  }

  private showRecord(text: string) {
    const r = this.recordEl
    r.append(el('p', { textContent: text }))
    while (r.childElementCount > 3) r.firstElementChild!.remove()
    ;[...r.children].forEach((c, i, all) => c.classList.toggle('old', i < all.length - 1))
  }

  // --- Host -----------------------------------------------------------------------------------

  say(key: string, vars?: { [k: string]: string | number }) {
    const out: { [k: string]: string | number } = {}
    const f = this.dir.state.flags
    for (const [k, v] of Object.entries(vars ?? {})) {
      if (v === '{docSeconds}') out[k] = this.docSeconds
      else if (v === '{namedCount}') out[k] = this.named().length
      else if (typeof v === 'string' && v.startsWith('{')) out[k] = String(f[v.slice(1, -1)] ?? 0)
      else out[k] = v
    }
    this.rec.add(key, out)
  }

  async voice(key: string, sub?: string) {
    if (sub) this.voiceEl.textContent = t(sub)
    const phon = speech[getLang()][key]
    const dur = phon ? await this.audio.speak(phon, { seed: key.length + 2, wear: key === 'full' ? 0.1 : 0.8 }) : 0
    await this.wait(Math.max(2.4, dur + 0.6))
    this.voiceEl.textContent = ''
  }

  doc(key: string) {
    return new Promise<void>(done => {
      const t0 = performance.now()
      const typed = key === 'box' || key === 'ledger' || key === 'letter'
      const body = el('div', { cls: 'body' })
      const text = t(`doc.${key}.b`)
      text.split('__').forEach((part, i) => {
        if (i) body.append(el('span', { cls: 'gap', ariaLabel: '…' }))
        body.append(part)
      })
      const sheet = el('article', { cls: `sheet${typed ? ' typed' : ''}`, role: 'dialog', ariaLabel: t(`doc.${key}.t`), tabIndex: -1 }, el('h2', { textContent: t(`doc.${key}.t`) }))
      const close = () => {
        this.docSeconds = Math.max(1, Math.round((performance.now() - t0) / 1000))
        wrap.remove()
        this.audio.tick('click')
        removeEventListener('keydown', esc)
        done()
        this.refreshSpots()
      }
      const esc = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && e.target === sheet) close()
      }
      if (key === 'plan' || key === 'gray') {
        const stack = el('div', { cls: 'stack' })
        stack.innerHTML = planSvg()
        const img = el('img', { src: `${import.meta.env.BASE_URL}assets/img/gray-ear.png`, alt: t('doc.gray.b') })
        if (key === 'gray') {
          stack.append(img)
          sheet.append(
            stack,
            button(t('ui.compare'), 'link', () => {
              stack.classList.toggle('laid')
              if (!this.dir.state.flags.compared) this.rec.add('rec.wax.compare')
              this.dir.state.flags.compared = true
            }),
          )
        } else sheet.append(stack)
      }
      sheet.append(body, el('div', { cls: 'row' }, button(t('ui.close'), 'btn', close)))
      const wrap = el('div', { cls: 'sheetwrap' }, sheet)
      this.layer.append(wrap)
      this.spots.textContent = ''
      addEventListener('keydown', esc)
      this.audio.tick('click')
      sheet.querySelector<HTMLElement>('.btn')?.focus({ preventScroll: true })
    })
  }

  ask(key: string, note: string | undefined, labels: string[]) {
    return new Promise<number>(done => {
      const row = el('div', { cls: 'row' })
      const p = el('div', { cls: 'prompt', role: 'dialog' }, el('p', { textContent: t(key) }), ...(note ? [el('small', { textContent: t(note) })] : []), row)
      labels.forEach((l, i) =>
        row.append(
          button(t(l), i ? 'btn quiet' : 'btn', () => {
            p.remove()
            done(i)
          }),
        ),
      )
      this.layer.append(p)
      row.querySelector('button')?.focus({ preventScroll: true })
    })
  }

  /** The Lean. Without a microphone, hold the button. With one, be quiet: a real noise breaks it. */
  lean(seconds: number, kind: 'breath' | 'push') {
    return new Promise<{ held: boolean; seconds: number }>(done => {
      const mic = this.ear.on
      const label = kind === 'push' ? (mic ? t('ui.transmitMic') : t('ui.push')) : mic ? t('ui.holdMic') : t('ui.hold')
      const ctl = new HoldControl(this.layer, label, mic ? '' : t('ui.holdKey'), !mic || kind === 'push')
      const stage = this.stage
      let elapsed = 0, progress = 0
      if (kind === 'breath') {
        this.audio.lean(true)
        this.voiceEl.textContent = ''
      }
      const finish = (held: boolean) => {
        clearInterval(timer)
        ctl.remove()
        if (kind === 'breath') this.audio.lean(false)
        done({ held, seconds: elapsed })
      }
      let grace = 0
      const timer = setInterval(() => {
        if (this.paused) return
        const dt = 0.05 / FAST
        if (kind === 'push') {
          const pushing = ctl.down || this.ear.level > 0.25
          progress = clamp(progress + (pushing ? dt / seconds : -dt / 3))
          ctl.progress(progress)
          stage?.built?.event('push', progress)
          if (stage) stage.leak = progress * 0.8
          if (pushing && Math.random() < dt * 2) this.audio.tick('skin')
          if (progress >= 1) finish(true)
          return
        }
        elapsed += dt
        if (stage) stage.live.lean = Math.min(1, stage.live.lean + dt * 2)
        progress = clamp(elapsed / seconds)
        ctl.progress(progress)
        const breathing = mic ? this.ear.level > 0.22 : !ctl.down
        grace = breathing ? grace + dt : 0
        // a moment to react is fair: the visitor is not punished in the first second
        if (elapsed > 1.2 && grace > (mic ? 0.25 : 0.2)) {
          this.strip.drive = 1
          finish(false)
        } else if (elapsed >= seconds) finish(true)
      }, 50)
    }).then(async r => {
      const s = this.stage
      if (s) await s.tweens.to(0.8 * FAST, k => (s.live.lean = 1 - k))
      return r
    })
  }

  async transition(from: string, to: string, via: string) {
    const s = this.stage
    const nextStage = deafPoint.scenes[to].stage
    this.voiceEl.textContent = ''
    if (!s) return void (await this.wait(1))
    if (via === 'landing') await this.flight
    else if (via === 'descent') {
      await s.fly(descentPath(), new THREE.Vector3(0, FOCUS.y + 0.2, 12), 5.5 * FAST, inOut)
      await s.fadeTo(0, 0.6 * FAST)
      await this.planView(['mirror', 'gallery', 'relay'], 'ch.recording')
      await this.ensureStage(nextStage)
      s.jump('top')
      await s.fadeTo(1, 1.4 * FAST)
    } else if (via === 'membrane') {
      this.audio.tick('skin')
      await s.tweens.to(1.8 * FAST, k => (s.fade = 1 + k * k * 22))
      await this.ensureStage(nextStage)
      s.jump('s1')
      s.leak = 0
      await s.tweens.to(3.2 * FAST, k => (s.fade = 23 - inOut(k) * 22))
    } else if (via === 'fall') {
      const roll = s.reduced ? 0 : Math.PI
      await Promise.all([s.tweens.to(4.5 * FAST, k => (s.roll = inOut(k) * roll)), s.fadeTo(0, 4.5 * FAST)])
      s.roll = 0
      await this.dateline()
      await this.ensureStage(nextStage)
      s.jump('high')
      s.fade = 0
      const shore = s.built!.nodes.shore
      void s.fadeTo(1, 3 * FAST)
      await s.fly([s.built!.nodes.high.pos, new THREE.Vector3(0, 14, 44), shore.pos], shore.look, 6.5 * FAST, k => 1 - (1 - k) ** 3)
    } else if (via === 'horizon') {
      await s.fadeTo(0, 3 * FAST)
      this.canvas.classList.remove('on')
    }
    void from
  }

  private async planView(path: string[], caption: string) {
    const dot = el('b')
    const fig = el('figure')
    fig.innerHTML = planSvg()
    fig.append(dot, el('figcaption', { textContent: t(caption) }))
    const view = el('div', { cls: 'planview' }, fig)
    this.layer.append(view)
    const svg = fig.querySelector('svg')!
    const place = (a: [number, number], b: [number, number], k: number) => {
      const r = svg.getBoundingClientRect()
      dot.style.left = `${((a[0] + (b[0] - a[0]) * k) / 760) * r.width}px`
      dot.style.top = `${((a[1] + (b[1] - a[1]) * k) / 460) * r.height}px`
    }
    place(PLAN_ROUTE[path[0]], PLAN_ROUTE[path[0]], 0)
    await this.wait(1)
    for (let i = 1; i < path.length; i++) {
      const a = PLAN_ROUTE[path[i - 1]], b = PLAN_ROUTE[path[i]]
      await this.stage!.tweens.to(1.8 * FAST, k => place(a, b, inOut(k)))
    }
    await this.wait(0.8)
    view.remove()
  }

  private async dateline() {
    const d = el('div', { cls: 'dateline', textContent: new Date(Date.UTC(1938, 9, 31)).toLocaleDateString(getLang(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) })
    this.layer.append(d)
    await this.wait(4.4)
    d.remove()
  }

  async move(node: string) {
    const s = this.stage
    if (!s) return
    const dur = 3 * FAST
    const steps = window.setInterval(() => this.audio.tick('step', s.camera.position.x, s.camera.position.y - 1.5, s.camera.position.z), 620)
    await s.moveTo(node, dur)
    clearInterval(steps)
  }

  fx(name: string, data?: unknown) {
    const s = this.stage
    const a = this.audio
    switch (name) {
      case 'ambience':
        a.ambience(data as Ambience)
        break
      case 'flight':
        if (s) this.flight = s.fly(flightPath(), new THREE.Vector3(0, FOCUS.y - 2, 0), 27 * FAST, k => k * k * (3 - 2 * k))
        break
      case 'deafen':
        a.deafen()
        break
      case 'chapter': {
        const c = el('p', { cls: 'chapter', textContent: t(data as string) })
        this.ui.append(c)
        setTimeout(() => c.remove(), 5400)
        this.sceneNoise = { idle: false, loud: false }
        break
      }
      case 'cups':
        a.setCups(data as boolean)
        break
      case 'leanStart':
        if (s) s.grain = 0.3
        break
      case 'leanEnd':
        if (s) s.grain = 0
        break
      case 'hatch':
        s?.built?.event('hatch')
        a.tick('hatch')
        break
      case 'door': {
        // always behind and far away: the visitor cannot look at it
        const p = s?.camera.position
        a.tick('door', (p?.x ?? 0) * -1.2, 0, (p?.z ?? 0) * -1.2)
        break
      }
      case 'relay':
        a.tick('lever')
        s?.built?.event('relay')
        a.tick('skin')
        break
      case 'walker':
        s?.built?.event('walker', data)
        break
      case 'lookUp':
        s?.built?.event('lookUp')
        if (s) void s.tweens.to(2.4 * FAST, k => (s.live.lean = Math.sin(k * Math.PI) * 0.3))
        break
      case 'seaReturns':
        a.seaReturns()
        break
    }
  }

  wait(seconds: number) {
    const ms = seconds * 1000 * FAST
    return new Promise<void>(done => {
      const t0 = performance.now()
      let paid = 0
      const tick = () => {
        if (this.paused) paid += 100
        if (performance.now() - t0 - paid >= ms) done()
        else setTimeout(tick, Math.min(100, ms))
      }
      tick()
    })
  }

  async widget(name: string, id?: string): Promise<number | string | void> {
    if (name === 'crank') return this.crankWidget(id as CylinderId)
    if (name === 'dials') return this.dialsWidget()
    if (name === 'transcript') return this.transcriptWidget()
    if (name === 'final') return this.finalWidget()
    if (name === 'mic') return this.micWidget()
  }

  private async micWidget() {
    if (!this.ear.available) return
    const i = await this.ask('q.mic', 'q.mic.note', ['q.mic.yes', 'q.mic.no'])
    const ok = i === 0 && (await this.ear.enable())
    this.rec.add(ok ? 'rec.hall.micYes' : 'rec.hall.micNo')
  }

  private crankWidget(id: CylinderId) {
    return new Promise<number>(done => {
      const crank = (this.crank = new Crank(this.layer))
      const line = t(`cyl.${id}.t`)
      const words = line.split(' ')
      const seed = Object.keys(cylinders).indexOf(id) + 1
      const dur = this.audio.crankStart(speech[getLang()][id] ?? '', seed) || 6
      let pos = 0
      const timer = setInterval(() => {
        if (this.paused) return
        const rate = crank.rate
        this.audio.crankRate(rate)
        this.stage?.built?.event('crank', rate)
        pos += (0.05 * rate) / dur / FAST
        crank.show(words.slice(0, Math.ceil(words.length * pos)).join(' '))
        if (pos >= 1) {
          clearInterval(timer)
          this.audio.crankStop()
          this.stage?.built?.event('crank', 0)
          setTimeout(() => {
            crank.remove()
            this.crank = undefined
            done(1)
          }, 1800 * FAST)
        }
      }, 50)
    })
  }

  private dialsWidget() {
    return new Promise<number>(done => {
      const inputs = ['q.relay.bone1', 'q.relay.bone2', 'q.relay.bone3'].map(k => {
        const input = el('input', { type: 'number', min: '0', max: '9', value: '0', inputMode: 'numeric' })
        input.addEventListener('input', () => {
          this.audio.tick('lever')
          this.stage?.built?.event('dials', inputs.map(x => Number(x.input.value) || 0))
        })
        return { input, label: el('label', {}, t(k), input) }
      })
      const box = el(
        'div',
        { cls: 'dials', role: 'dialog' },
        el('h2', { textContent: t('q.relay.title') }),
        el('div', { cls: 'set' }, ...inputs.map(i => i.label)),
        button(t('q.relay.set'), 'btn', () => {
          const v = inputs.map(x => Number(x.input.value) || 0)
          box.remove()
          done(v[0] * 10 + v[1] === RELAY_CODE[0] && v[2] === RELAY_CODE[1] ? 1 : 0)
        }),
      )
      this.layer.append(box)
      inputs[0].input.focus()
    })
  }

  private transcriptWidget() {
    return new Promise<void>(async done => {
      const list = el('ol', { cls: 'transcript' })
      const sheet = el('article', { cls: 'sheet typed', role: 'dialog', ariaLabel: t('doc.transcript.t', { n: 41 + this.data.visits }) }, el('h2', { textContent: t('doc.transcript.t', { n: 41 + this.data.visits }) }), list)
      const wrap = el('div', { cls: 'sheetwrap' }, sheet)
      this.layer.append(wrap)
      this.spots.textContent = ''
      const lines = this.rec.lines()
      for (const l of lines) {
        const li = el('li', { textContent: `${l.time}  ${l.text}` })
        li.style.marginBottom = '0.7em'
        list.append(li)
        sheet.scrollTop = sheet.scrollHeight
        this.audio.tick('typewriter')
        await this.wait(0.09)
      }
      const named = this.named()
      list.append(el('li', { textContent: named.length ? t('doc.tally.some', { names: named.join('; ') }) : t('doc.tally.none') }))
      const b = button(t('ui.close'), 'btn', () => {
        wrap.remove()
        done()
        this.refreshSpots()
      })
      sheet.append(el('div', { cls: 'row' }, b))
      sheet.scrollTop = sheet.scrollHeight
      b.focus({ preventScroll: true })
    })
  }

  /** The last choice has three exits and only two buttons. The third is doing nothing for forty-one seconds. */
  private finalWidget() {
    return new Promise<string>(done => {
      const strip = this.strip
      const sentence = el('p', { cls: 'sentence', ariaLabel: `${t('title.c')} ${t('title.d')}` }, el('span', { textContent: t('title.c') }), strip.canvas, el('span', { textContent: t('title.d') }))
      const root = el('section', { cls: 'final', ariaLabel: t('ch.last') }, sentence, el('p', { cls: 'next', textContent: t('q.final') }))
      const row = el('div', { cls: 'row' })
      const finish = (r: string) => {
        clearInterval(timer)
        root.remove()
        done(r)
      }
      const send = async () => {
        row.remove()
        const env: number[] = []
        const mic = this.ear.on
        const ctl = new HoldControl(root, mic ? t('ui.transmitMic') : t('ui.transmit'), mic ? '' : t('ui.holdKey'), !mic)
        await new Promise<void>(ok => {
          const iv = setInterval(() => {
            const v = mic ? this.ear.level : ctl.down ? 0.5 + Math.random() * 0.3 : 0
            if (v > 0.08 || env.length) env.push(Math.round(v * 100) / 100)
            strip.drive = v
            ctl.progress(env.length / 120)
            if (env.length >= 120 * Math.max(FAST * 4, FAST === 1 ? 1 : 0)) {
              clearInterval(iv)
              ok()
            }
          }, 50)
        })
        ctl.remove()
        this.data.signal = env
        save(this.data)
        finish('send')
      }
      row.append(
        button(t('q.keep'), 'btn', () => finish('keep')),
        button(t('q.send'), 'btn quiet', () => {
          clearInterval(timer)
          void send()
        }),
      )
      root.append(row)
      this.layer.append(root)
      this.lastInput = performance.now()
      const timer = setInterval(() => {
        const idle = (performance.now() - this.lastInput) / 1000 / FAST
        const quiet = !this.ear.on || this.ear.level < 0.22
        if (!quiet) this.lastInput = performance.now()
        root.classList.toggle('fading', idle > 12)
        strip.gain = clamp(1 - idle / 41)
        if (!this.stage) strip.draw((this.time += 0.05), this.ear.level)
        if (idle >= 41) finish('stop')
      }, 50)
    })
  }

  enterScene(scene: SceneDef) {
    const s = this.stage
    this.sceneNoise = { idle: false, loud: false }
    if (s && scene.stage !== 'none') {
      if (this.stageName !== scene.stage) {
        void this.ensureStage(scene.stage).then(() => {
          s.jump(scene.start)
          this.dir.state.node = scene.start
          this.refreshSpots()
        })
      } else if (scene.id === 'recording') void s.moveTo('floor', 7 * FAST)
      else if (scene.id !== 'hall' && scene.id !== 'other') s.jump(scene.start)
    }
    this.refreshSpots()
  }

  async end(id: string) {
    this.spots.textContent = ''
    this.recordEl.textContent = ''
    if (!this.data.endings.includes(id)) this.data.endings.push(id)
    const named = this.named()
    const taken = this.fallen()
    const hold = el('div')
    const story = t(`end.${id}.b`, { time: clock(Date.now()) })
    const names = el('ol', { cls: 'names' }, ...register.map((n, i) => el('li', { cls: taken.includes(i) ? 'taken' : '', textContent: n })))
    const left = 41 - named.length
    const root = el(
      'section',
      { cls: 'end' },
      el('h2', { textContent: t(`end.${id}.t`) }),
      el('p', { cls: 'story', textContent: story }),
      el('h3', { textContent: t('end.register') }),
      el('p', { cls: 'tally', textContent: t('end.saved', { n: left }) }),
      names,
      hold,
      el('p', { textContent: named.length ? t('end.again') : t('end.more') }),
      el('div', { cls: 'row' }, button(t('ui.begin'), 'btn', () => this.restart()), button(t('ui.archive'), 'btn quiet', () => this.archive())),
    )
    this.layer.append(root)
    this.data.state = undefined
    this.data.record = []
    save(this.data)
    root.querySelector<HTMLElement>('.btn')?.focus({ preventScroll: true })
  }

  private restart() {
    this.data.state = undefined
    this.data.record = []
    save(this.data)
    location.reload()
  }

  // --- menu & archive -------------------------------------------------------------------------

  private menuButton() {
    this.chrome.append(button(t('ui.menu'), 'menubtn', () => this.toggleMenu()))
  }

  private menuEl?: HTMLElement

  private toggleMenu() {
    if (this.menuEl) {
      this.menuEl.remove()
      this.menuEl = undefined
      this.setPaused(false)
      return
    }
    this.setPaused(true)
    const set = this.data.settings
    const persist = () => save(this.data)
    const vol = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(set.volume) })
    vol.setAttribute('aria-label', t('ui.volume'))
    vol.oninput = () => {
      set.volume = Number(vol.value)
      this.audio.setMuted(false)
      this.audio.setVolume(set.volume)
      persist()
    }
    const toggle = (label: string, get: () => boolean, change: (v: boolean) => void | Promise<void>) => {
      const b = el('button', { cls: 'switch', type: 'button', textContent: get() ? t('ui.on') : t('ui.off') })
      b.setAttribute('aria-pressed', String(get()))
      b.setAttribute('aria-label', label)
      b.onclick = async () => {
        await change(!get())
        b.textContent = get() ? t('ui.on') : t('ui.off')
        b.setAttribute('aria-pressed', String(get()))
        persist()
      }
      return el('div', { cls: 'field' }, el('span', { textContent: label }), b)
    }
    const quality = el('select', {}, ...['auto', 'cinematic', 'balanced', 'lite'].map(q => el('option', { value: q, textContent: q === 'auto' ? 'Auto' : t(`quality.${q}`), selected: (set.quality ?? 'auto') === q })))
    quality.setAttribute('aria-label', t('ui.quality'))
    quality.onchange = () => {
      const v = quality.value
      set.quality = v === 'auto' ? undefined : (v as QualityName)
      this.stage?.setQuality(set.quality ?? guessQuality(), v === 'auto')
      persist()
    }
    const lang = el('select', {}, el('option', { value: 'en', textContent: 'English', selected: getLang() === 'en' }), el('option', { value: 'es', textContent: 'Español', selected: getLang() === 'es' }))
    lang.setAttribute('aria-label', t('ui.language'))
    lang.onchange = () => {
      set.lang = lang.value as Lang
      setLang(set.lang)
      persist()
      this.toggleMenu()
      this.toggleMenu()
    }
    const menu = el(
      'aside',
      { cls: 'menu', ariaLabel: t('ui.menu') },
      el('h2', { textContent: t('ui.menu') }),
      el('p', { textContent: t('ui.pause') }),
      el('div', { cls: 'field' }, el('span', { textContent: t('ui.volume') }), vol),
      toggle(t('ui.subtitles'), () => set.subtitles, v => {
        set.subtitles = v
        this.voiceEl.style.display = v ? '' : 'none'
      }),
      el('div', { cls: 'field' }, el('span', { textContent: t('ui.quality') }), quality),
      toggle(t('ui.motion'), () => !!set.reduced, v => {
        set.reduced = v
        if (this.stage) this.stage.reduced = v
        document.documentElement.classList.toggle('reduced', v)
      }),
      el('div', { cls: 'field' }, el('span', { textContent: t('ui.language') }), lang),
      toggle(t('ui.mic'), () => this.ear.on, async v => {
        if (v) await this.ear.enable()
        else this.ear.disable()
      }),
      el(
        'div',
        { cls: 'actions' },
        button(t('ui.resume'), 'btn', () => this.toggleMenu()),
        button(t('ui.archive'), 'btn quiet', () => this.archive()),
        button(t('ui.restart'), 'btn quiet', () => this.restart()),
        button(t('ui.exit'), 'btn quiet', () => location.reload()),
      ),
    )
    this.menuEl = menu
    this.ui.append(menu)
    menu.querySelector<HTMLElement>('input,select,button')?.focus()
  }

  private setPaused(p: boolean) {
    this.paused = p
    if (this.stage) this.stage.paused = p
    this.audio.pause(p)
    this.refreshSpots()
  }

  private archive() {
    const table = (rows: credits.Credit[]) => {
      const tb = el('table')
      tb.innerHTML = `<tr><th>Work</th><th>Source</th><th>Licence</th></tr>`
      for (const r of rows) {
        const a = el('a', { href: r.url, textContent: r.title, target: '_blank', rel: 'noopener' })
        tb.append(el('tr', {}, el('td', {}, a), el('td', { textContent: r.by }), el('td', { textContent: r.licence })))
      }
      return tb
    }
    const root = el(
      'section',
      { cls: 'archive', ariaLabel: t('archive.title') },
      el('div', { cls: 'back' }, button(t('archive.back'), 'btn', () => root.remove())),
      el('h2', { textContent: t('archive.title') }),
      el('p', { cls: 'lead', textContent: t('archive.lead') }),
      el('h3', { textContent: t('archive.real') }),
      table([...credits.recordings, ...credits.images]),
      el('h3', { textContent: t('archive.tex') }),
      table(credits.materials),
      el('h3', { textContent: t('archive.fonts') }),
      table(credits.fonts),
      el('h3', { textContent: t('archive.made') }),
      el('p', { cls: 'made', textContent: t('archive.madeB') }),
      el('p', { cls: 'made', textContent: t('archive.code') }),
      el('h3', { textContent: t('archive.refs') }),
      table(credits.reading),
    )
    this.ui.append(root)
    root.querySelector<HTMLElement>('.btn')?.focus()
  }
}

export const resetSave = () => save(blank())
