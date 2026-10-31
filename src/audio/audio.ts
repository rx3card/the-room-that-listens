import { speak } from './voder'

export type Ambience = 'sea' | 'hall' | 'wax' | 'spiral' | 'other' | 'last' | 'title'
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

interface Layer {
  stop(t: number): void
}

// Everything audible goes through here. No sound exists until unlock() runs inside a user gesture.
export class AudioEngine {
  ctx?: AudioContext
  private master!: GainNode
  private amb!: GainNode
  private sfx!: GainNode
  private voiceBus!: GainNode
  private wet!: GainNode
  private conv!: ConvolverNode
  private cups!: BiquadFilterNode
  private layers: Layer[] = []
  private noiseBuf!: AudioBuffer
  private pinkBuf!: AudioBuffer
  private files = new Map<string, Promise<AudioBuffer | null>>()
  private spatial = new Map<string, PannerNode>()
  private crank?: { src: AudioBufferSourceNode; gain: GainNode }
  private sea?: GainNode
  volume = 0.8
  muted = true

  unlock(muted: boolean) {
    this.muted = muted
    if (!this.ctx) {
      const ctx = (this.ctx = new AudioContext({ latencyHint: 'playback' }))
      this.noiseBuf = this.makeNoise(4, false)
      this.pinkBuf = this.makeNoise(6, true)
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -16 // no sudden loudness: the piece never peaks above this shelf by much
      limiter.ratio.value = 12
      limiter.attack.value = 0.003
      limiter.release.value = 0.25
      this.master = ctx.createGain()
      this.cups = ctx.createBiquadFilter()
      this.cups.type = 'lowpass'
      this.cups.frequency.value = 20000
      this.amb = ctx.createGain()
      this.sfx = ctx.createGain()
      this.voiceBus = ctx.createGain()
      this.conv = ctx.createConvolver()
      this.wet = ctx.createGain()
      this.wet.gain.value = 0.5
      for (const b of [this.amb, this.sfx, this.voiceBus]) {
        b.connect(this.cups)
        b.connect(this.conv)
      }
      this.conv.connect(this.wet).connect(this.cups)
      this.cups.connect(limiter).connect(this.master).connect(ctx.destination)
      this.setRoom('deaf')
    }
    this.master.gain.value = muted ? 0 : this.volume
    void this.ctx.resume()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05)
  }

  pause(p: boolean) {
    if (!this.ctx) return
    void (p ? this.ctx.suspend() : this.ctx.resume())
  }

  private makeNoise(seconds: number, pink: boolean) {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        if (!pink) d[i] = w
        else {
          b0 = 0.99765 * b0 + w * 0.099046
          b1 = 0.963 * b1 + w * 0.2965164
          b2 = 0.57 * b2 + w * 1.0526913
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
        }
      }
    }
    return buf
  }

  /** Each space has its own impulse response, grown from shaped noise. The headland's is almost nothing. */
  setRoom(room: 'deaf' | 'wax' | 'spiral' | 'other') {
    const ctx = this.ctx
    if (!ctx) return
    const spec = { deaf: [0.18, 7000, 0.12], wax: [1.7, 2400, 0.42], spiral: [5.5, 3800, 0.8], other: [3.4, 900, 0.5] }[room]
    const [len, cutoff, wet] = spec
    const n = Math.floor(ctx.sampleRate * len)
    const ir = ctx.createBuffer(2, n, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      let low = 0
      const k = Math.min(1, (2 * Math.PI * cutoff) / ctx.sampleRate)
      for (let i = 0; i < n; i++) {
        const t = i / n
        low += (Math.random() * 2 - 1 - low) * k * (1 - t * 0.8)
        d[i] = low * (1 - t) ** 3.2
      }
    }
    this.conv.buffer = ir
    this.wet.gain.setTargetAtTime(wet, ctx.currentTime, 0.6)
  }

  // --- generators ---------------------------------------------------------------------------

  private noise(pink = true) {
    const s = this.ctx!.createBufferSource()
    s.buffer = pink ? this.pinkBuf : this.noiseBuf
    s.loop = true
    s.start(0, Math.random() * 3)
    return s
  }

  private lfo(freq: number, depth: number, target: AudioParam) {
    const o = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    o.frequency.value = freq
    g.gain.value = depth
    o.connect(g).connect(target)
    o.start()
    return o
  }

  private fadeOut(g: GainNode, nodes: { stop(t?: number): void }[]): Layer {
    return {
      stop: t => {
        const ctx = this.ctx!
        g.gain.cancelScheduledValues(ctx.currentTime)
        g.gain.setTargetAtTime(0, ctx.currentTime, t / 3)
        for (const n of nodes) n.stop(ctx.currentTime + t * 2)
      },
    }
  }

  /** Surf: pink noise through a filter that breathes like water on rock. */
  private surf(level: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(level, ctx.currentTime, 3)
    const nodes: { stop(t?: number): void }[] = []
    for (const [rate, f, q] of [[0.07, 520, 0.4], [0.11, 1400, 0.3]]) {
      const src = this.noise()
      const bp = ctx.createBiquadFilter()
      bp.type = 'lowpass'
      bp.frequency.value = f
      bp.Q.value = q
      const wave = ctx.createGain()
      wave.gain.value = 0.5
      nodes.push(this.lfo(rate, 0.42, wave.gain), this.lfo(rate * 1.7, 240, bp.frequency), src)
      src.connect(bp).connect(wave).connect(g)
    }
    g.connect(this.amb)
    return { gain: g, layer: this.fadeOut(g, nodes) }
  }

  /** A recording as an ambient layer. The gain exists at once, so it can be faded before the file arrives. */
  private loop(rel: string, level: number, opts: { rate?: number; dest?: AudioNode; fade?: number } = {}) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(level, ctx.currentTime, opts.fade ?? 3)
    g.connect(opts.dest ?? this.amb)
    const nodes: { stop(t?: number): void }[] = []
    void this.file(rel).then(b => {
      if (!b) return
      const s = ctx.createBufferSource()
      s.buffer = b
      s.loop = true
      s.playbackRate.value = opts.rate ?? 1
      s.connect(g)
      s.start()
      nodes.push(s)
    })
    return { gain: g, layer: this.fadeOut(g, nodes) }
  }

  /** A slow beating drone. Detuned sines, never a melody. */
  private drone(freqs: number[], level: number, type: OscillatorType = 'sine', cutoff = 500) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(level, ctx.currentTime, 4)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cutoff
    const nodes: { stop(t?: number): void }[] = []
    freqs.forEach((f, i) => {
      for (const det of [-3, 2.5]) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = f
        o.detune.value = det + i
        o.connect(lp)
        o.start()
        nodes.push(o)
      }
    })
    nodes.push(this.lfo(0.031, cutoff * 0.4, lp.frequency))
    lp.connect(g).connect(this.amb)
    return this.fadeOut(g, nodes)
  }

  private wind(level: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(level, ctx.currentTime, 3)
    const src = this.noise()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 420
    bp.Q.value = 1.2
    const l1 = this.lfo(0.09, 180, bp.frequency)
    const l2 = this.lfo(0.23, 90, bp.frequency)
    const l3 = this.lfo(0.13, level * 0.45, g.gain)
    src.connect(bp).connect(g).connect(this.amb)
    return this.fadeOut(g, [src, l1, l2, l3])
  }

  /** Wax surface: hiss plus random ticks. Lives in the phonograph's panner. */
  private rainOn(level: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(level, ctx.currentTime, 3)
    const src = this.noise(false)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3200
    src.connect(hp).connect(g).connect(this.amb)
    return this.fadeOut(g, [src])
  }

  /** Spatial source at a world position, HRTF where the browser has it. */
  panner(id: string, x: number, y: number, z: number) {
    const ctx = this.ctx!
    let p = this.spatial.get(id)
    if (!p) {
      p = ctx.createPanner()
      p.panningModel = 'HRTF'
      p.distanceModel = 'inverse'
      p.refDistance = 1.5
      p.rolloffFactor = 1.3
      p.connect(this.sfx)
      this.spatial.set(id, p)
    }
    p.positionX.value = x
    p.positionY.value = y
    p.positionZ.value = z
    return p
  }

  listener(px: number, py: number, pz: number, fx: number, fy: number, fz: number) {
    const l = this.ctx?.listener
    if (!l || !l.positionX) return
    const t = this.ctx!.currentTime
    l.positionX.setTargetAtTime(px, t, 0.05)
    l.positionY.setTargetAtTime(py, t, 0.05)
    l.positionZ.setTargetAtTime(pz, t, 0.05)
    l.forwardX.setTargetAtTime(fx, t, 0.05)
    l.forwardY.setTargetAtTime(fy, t, 0.05)
    l.forwardZ.setTargetAtTime(fz, t, 0.05)
  }

  ambience(name: Ambience) {
    if (!this.ctx) return
    for (const l of this.layers) l.stop(2.5)
    this.layers = []
    this.sea = undefined
    const add = (l: Layer) => this.layers.push(l)
    if (name === 'sea') {
      this.setRoom('deaf')
      const s = this.loop('audio/sea.mp3', 0.8)
      this.sea = s.gain
      add(s.layer)
      add(this.surf(0.12).layer)
      add(this.wind(0.1))
    } else if (name === 'hall') {
      this.setRoom('deaf')
      add(this.drone([41, 61.7], 0.1))
      add(this.rainOn(0.006))
      add(this.loop('audio/rain.mp3', 0.5).layer)
      this.tick('hum', 50)
    } else if (name === 'wax') {
      this.setRoom('wax')
      add(this.drone([55, 82.4, 110.5], 0.05, 'triangle', 240))
      add(this.loop('audio/music-feeling-watched.mp3', 0.2, { fade: 6 }).layer)
      // real voices from 1890 behind the shelves, too quiet to make out
      add(this.loop('audio/cylinder-1890.mp3', 0.16, { dest: this.panner('shelves', 6, 2, -7) }).layer)
    } else if (name === 'spiral') {
      this.setRoom('spiral')
      add(this.drone([36.7, 73.6, 146.8], 0.08, 'sine', 900))
      add(this.tonotopic())
      add(this.loop('audio/music-sensory-deprivation.mp3', 0.22, { fade: 6 }).layer)
    } else if (name === 'other') {
      this.setRoom('other')
      add(this.drone([32.7, 49], 0.12))
      add(this.loop('audio/wind-mars.mp3', 0.5, { rate: 0.7, fade: 4 }).layer)
      add(this.loop('audio/music-perceptual-isolation.mp3', 0.26, { fade: 8 }).layer)
    } else if (name === 'last') {
      add(this.drone([65.4], 0.035))
      // the oldest recorded voice there is, a recording never meant to be played
      add(this.loop('audio/phonautogram-1860.mp3', 0.12, { rate: 0.6, fade: 8 }).layer)
    }
  }

  private tonoFilter?: BiquadFilterNode

  /** Base of the spiral rings high, the apex low, as in a real cochlea. position() moves it. */
  private tonotopic() {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.09, ctx.currentTime, 3)
    const src = this.noise()
    const bp = (this.tonoFilter = ctx.createBiquadFilter())
    bp.type = 'bandpass'
    bp.frequency.value = 3200
    bp.Q.value = 34
    src.connect(bp).connect(g).connect(this.amb)
    return this.fadeOut(g, [src])
  }

  spiralDepth(d: number) {
    if (this.tonoFilter && this.ctx) this.tonoFilter.frequency.setTargetAtTime(3200 * Math.pow(0.05, d), this.ctx.currentTime, 0.8)
  }

  /** Short, one-off sound by name. Levels stay low; dread comes from placement. */
  tick(name: 'hum' | 'door' | 'step' | 'latch' | 'click' | 'thud' | 'hatch' | 'skin' | 'breath' | 'typewriter' | 'lever', x = 0, y = 0, z = 0) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const burst = (dur: number, f: number, gain: number, q = 1, type: BiquadFilterType = 'lowpass', dest: AudioNode = this.sfx) => {
      const s = this.noise(false)
      const fl = ctx.createBiquadFilter()
      fl.type = type
      fl.frequency.value = f
      fl.Q.value = q
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain, t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      s.connect(fl).connect(g).connect(dest)
      s.stop(t + dur + 0.05)
    }
    const thump = (f: number, dur: number, gain: number, dest: AudioNode = this.sfx) => {
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(f * 1.8, t)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05)
      const g = ctx.createGain()
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(dest)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
    const dest = name === 'step' || name === 'door' ? this.panner(name, x, y, z) : this.sfx
    switch (name) {
      case 'door':
        thump(60, 1.1, 0.32, dest)
        burst(0.6, 500, 0.08, 1, 'lowpass', dest)
        break
      case 'step':
        thump(90, 0.14, 0.32, dest)
        burst(0.09, 1200, 0.12, 1, 'lowpass', dest)
        break
      case 'hatch':
        thump(45, 2, 0.3)
        burst(1.6, 300, 0.1, 6, 'bandpass')
        break
      case 'latch':
      case 'lever':
        burst(0.03, 3200, 0.14, 3, 'bandpass')
        thump(170, 0.1, 0.08)
        break
      case 'click':
        burst(0.02, 4500, 0.05, 2, 'bandpass')
        break
      case 'thud':
        thump(50, 0.7, 0.2)
        break
      case 'skin': {
        thump(38, 3, 0.34)
        burst(2.4, 200, 0.14)
        break
      }
      case 'typewriter':
        burst(0.022, 2400, 0.2, 2.2, 'bandpass')
        thump(320, 0.03, 0.06)
        break
      case 'hum': {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = x || 50
        const lp = ctx.createBiquadFilter()
        lp.frequency.value = 420
        const g = ctx.createGain()
        g.gain.value = 0
        g.gain.setTargetAtTime(0.018, t, 3)
        const p = this.panner('lamp', 0, 9, -4)
        o.connect(lp).connect(g).connect(p)
        o.start()
        this.layers.push(this.fadeOut(g, [o]))
        break
      }
      case 'breath':
        burst(1.2, 900, 0.03, 0.7, 'bandpass')
        break
    }
  }

  /** The Lean: every layer ducks to almost nothing, in a third of a second. Silence is the event. */
  lean(on: boolean) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.amb.gain.setTargetAtTime(on ? 0.02 : 1, t, on ? 0.08 : 1.2)
    this.sfx.gain.setTargetAtTime(on ? 0.6 : 1, t, 0.3)
  }

  /** The headland swallows the surf: it fades as the camera crosses the shoreline. */
  deafen() {
    if (this.sea && this.ctx) this.sea.gain.setTargetAtTime(0, this.ctx.currentTime, 1.4)
  }

  /** Ending "Deaf Point": the sea the whole piece has denied the visitor finally arrives. */
  seaReturns() {
    if (!this.ctx) return
    for (const l of this.layers) l.stop(1.5)
    this.layers = [this.loop('audio/sea.mp3', 0.9, { fade: 4 }).layer]
    this.setRoom('deaf')
  }

  /** Listening cups: muffles the world, as the visitor sits at the focus. */
  setCups(on: boolean) {
    if (!this.ctx) return
    this.cups.frequency.setTargetAtTime(on ? 1100 : 20000, this.ctx.currentTime, 0.2)
    if (on) this.line = this.loop('audio/cylinder-1888.mp3', 0.5, { fade: 1 }).layer
    else this.line?.stop(1)
  }

  private line?: Layer

  /** Real footsteps on a spiral stair, placed in the dark ahead of the visitor. */
  footfalls(x: number, y: number, z: number) {
    if (this.ctx) this.layers.push(this.loop('audio/steps-spiral.mp3', 1.4, { dest: this.panner('walker', x, y, z), fade: 1 }).layer)
  }

  sample(rel: string, gain = 0.5) {
    void this.playFile(rel, gain)
  }

  private file(rel: string) {
    if (!this.ctx) return Promise.resolve(null)
    let p = this.files.get(rel)
    if (!p) {
      p = fetch(`${import.meta.env.BASE_URL}assets/${rel}`)
        .then(r => r.arrayBuffer())
        .then(a => this.ctx!.decodeAudioData(a))
        .catch(() => null) // a missing recording never stops the story; the subtitle still carries it
      this.files.set(rel, p)
    }
    return p
  }

  /** Voder line through a wax-cylinder chain. The returned promise ends with the line. */
  async speak(text: string, opts: { pitch?: number; seed?: number; wear?: number; rate?: number; x?: number; y?: number; z?: number } = {}) {
    const ctx = this.ctx
    if (!ctx) return 0
    const { pitch = 96, seed = 3, wear = 0.5, rate = 1 } = opts
    const data = speak(text, 22050, pitch, seed)
    const buf = ctx.createBuffer(1, data.length, 22050)
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 280
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3400 - wear * 1400
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(257)
    for (let i = 0; i < 257; i++) curve[i] = Math.tanh(((i - 128) / 128) * 2.5)
    shaper.curve = curve
    const g = ctx.createGain()
    g.gain.value = 0.34
    src.connect(hp).connect(lp).connect(shaper).connect(g).connect(this.voiceBus)
    src.start()
    // surface hiss rides under every line
    const hiss = this.noise(false)
    const hg = ctx.createGain()
    hg.gain.value = 0.006 + wear * 0.012
    const hb = ctx.createBiquadFilter()
    hb.type = 'bandpass'
    hb.frequency.value = 2400
    hiss.connect(hb).connect(hg).connect(this.voiceBus)
    hiss.stop(ctx.currentTime + buf.duration / rate + 0.4)
    return buf.duration / rate
  }

  /** Crank-driven voice: progress is the visitor's hand. Stutters and drops pitch when turned too slowly. */
  crankStart(text: string, seed: number) {
    const ctx = this.ctx
    if (!ctx) return 0
    const data = speak(text, 22050, 88 + seed * 9, seed)
    const buf = ctx.createBuffer(1, data.length, 22050)
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = 0
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 300
    const lp = ctx.createBiquadFilter()
    lp.frequency.value = 2600
    const g = ctx.createGain()
    g.gain.value = 0.32
    const p = this.panner('horn', 0, 1.6, 0)
    src.connect(hp).connect(lp).connect(g).connect(p)
    src.start()
    this.crank = { src, gain: g }
    return buf.duration
  }

  crankRate(rate: number) {
    if (this.crank && this.ctx) this.crank.src.playbackRate.setTargetAtTime(clamp(rate, 0, 1.6), this.ctx.currentTime, 0.04)
  }

  crankStop() {
    this.crank?.src.stop()
    this.crank = undefined
  }

  /** The real 1860 phonautogram and 1890 cylinder sit, untouched but for level, inside the station. */
  async playFile(rel: string, gain = 0.3) {
    const b = await this.file(rel)
    if (!b || !this.ctx) return
    const s = this.ctx.createBufferSource()
    s.buffer = b
    const g = this.ctx.createGain()
    g.gain.value = gain
    s.connect(g).connect(this.voiceBus)
    s.start()
    return b.duration
  }
}
