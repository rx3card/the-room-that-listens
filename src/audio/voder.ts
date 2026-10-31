// A small formant speech synthesiser in the manner of the 1939 Voder. Phonetic text in, Float32Array out.
// The result is barely intelligible on purpose: with the subtitle in front of you, you hear the words anyway.
export interface Phone {
  f: [number, number, number] // formants, Hz
  v: number // voicing 0..1
  n: number // noise 0..1
  nf: number // noise centre, Hz
  d: number // duration, s
}

const V = (a: number, b: number, c: number, d = 0.11): Phone => ({ f: [a, b, c], v: 1, n: 0, nf: 0, d })
const S = (nf: number, n: number, v = 0, d = 0.09): Phone => ({ f: [400, 1500, 2500], v, n, nf, d })
const N = (a: number, b: number, d = 0.08): Phone => ({ f: [a, b, 2500], v: 0.8, n: 0, nf: 0, d })
const P = (nf: number, v = 0): Phone => ({ f: [300, 1500, 2400], v, n: 0.65, nf, d: 0.05 })

const TABLE: Record<string, Phone> = {
  a: V(730, 1090, 2440), e: V(530, 1840, 2480), i: V(300, 2200, 2960), o: V(500, 900, 2400), u: V(330, 870, 2240),
  ee: V(280, 2250, 2890, 0.16), oo: V(310, 870, 2240, 0.16), uh: V(560, 1200, 2390, 0.09), aw: V(570, 840, 2410, 0.16),
  ai: V(450, 1950, 2500, 0.17), ow: V(650, 1100, 2300, 0.18),
  s: S(5400, 0.5), z: S(4800, 0.3, 0.5), f: S(3800, 0.28), v: S(3200, 0.2, 0.6), sh: S(2700, 0.55), ch: S(2900, 0.55, 0, 0.08),
  th: S(4200, 0.18), j: S(3100, 0.45, 0.2, 0.09), h: S(1500, 0.14, 0, 0.06),
  m: N(280, 1100), n: N(280, 1700), ng: N(280, 2300), l: N(360, 1100, 0.07), r: N(460, 1250, 0.06), w: N(300, 700, 0.06), y: N(280, 2200, 0.05),
  b: P(800, 0.5), B: N(400, 1100, 0.05), d: P(1800, 0.5), g: P(1700, 0.5), p: P(900), t: P(3200), k: P(2000),
}
const KEYS = Object.keys(TABLE).sort((a, b) => b.length - a.length)

export function phonemes(text: string): (Phone | null)[] {
  const out: (Phone | null)[] = []
  for (let i = 0; i < text.length; ) {
    if (text[i] === ' ' || text[i] === '.') {
      out.push(null)
      i++
      continue
    }
    const key = KEYS.find(k => text.startsWith(k, i))
    if (key) out.push(TABLE[key])
    i += key ? key.length : 1
  }
  return out
}

function resonator(freq: number, bw: number, sr: number) {
  const r = Math.exp((-Math.PI * bw) / sr)
  const c = -r * r
  const b = 2 * r * Math.cos((2 * Math.PI * freq) / sr)
  return { a: 1 - b - c, b, c }
}

/** Renders text at sample rate sr. pitch in Hz; seed gives each speaker its own wobble. */
export function speak(text: string, sr = 22050, pitch = 104, seed = 1): Float32Array {
  const seq = phonemes(text)
  let dur = 0.1
  for (const p of seq) dur += p ? p.d * 1.5 : 0.14
  const out = new Float32Array(Math.ceil(dur * sr))
  let rand = seed * 2654435761 >>> 0
  const noise = () => {
    rand = (rand * 1664525 + 1013904223) >>> 0
    return rand / 2147483648 - 1
  }

  const f = [500, 1500, 2500]
  const y1 = [0, 0, 0]
  const y2 = [0, 0, 0]
  let nLow = 0
  let phase = 0
  let v = 0
  let n = 0
  let t = 0
  const bws = [90, 110, 170]
  let coef = [0, 1, 2].map(k => resonator(f[k], bws[k], sr))
  for (const p of seq) {
    const len = Math.floor((p ? p.d * 1.5 : 0.14) * sr)
    const nCoef = p ? Math.min(0.9, (2 * Math.PI * p.nf) / sr) : 0.1
    for (let i = 0; i < len && t < out.length; i++, t++) {
      const ease = 0.0016
      if (p) for (let k = 0; k < 3; k++) f[k] += (p.f[k] - f[k]) * ease
      if (t % 32 === 0) coef = [0, 1, 2].map(k => resonator(f[k], bws[k], sr)) // formants move slowly
      v += ((p?.v ?? 0) - v) * 0.0035
      n += ((p?.n ?? 0) - n) * 0.008

      const decline = 1 - (t / out.length) * 0.22
      const jitter = 1 + Math.sin(t * 0.0009 * seed) * 0.03 + noise() * 0.008
      phase += (pitch * decline * jitter) / sr
      if (phase >= 1) phase -= 1
      const glottal = phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) ** 2 - 0.25 : -0.25

      nLow += (noise() - nLow) * nCoef
      const src = glottal * v
      let s = 0
      for (let k = 0; k < 3; k++) {
        const { a, b, c } = coef[k]
        const y = a * src + b * y1[k] + c * y2[k]
        y2[k] = y1[k]
        y1[k] = y
        s += y * [1, 0.7, 0.3][k]
      }
      out[t] = s + nLow * n * 0.5
    }
  }
  let peak = 1e-4
  for (const x of out) peak = Math.max(peak, Math.abs(x))
  for (let i = 0; i < out.length; i++) out[i] /= peak
  return out
}
