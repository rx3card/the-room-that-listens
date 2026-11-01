export type QualityName = 'cinematic' | 'balanced' | 'lite'

export interface Quality {
  name: QualityName
  dpr: number
  shadows: number // shadow map size, 0 = none  taste-skill-ignore
  bloom: boolean
  msaa: number
  dust: number
  rain: number
  wires: number
  seaDetail: number
}

const TIERS: Record<QualityName, Omit<Quality, 'name'>> = {
  cinematic: { dpr: 2, shadows: 2048, bloom: true, msaa: 4, dust: 900, rain: 1600, wires: 9000, seaDetail: 3 },
  balanced: { dpr: 1.25, shadows: 1024, bloom: true, msaa: 2, dust: 450, rain: 700, wires: 5000, seaDetail: 2 },
  lite: { dpr: 1.5, shadows: 0, bloom: false, msaa: 0, dust: 160, rain: 220, wires: 2400, seaDetail: 1 },
}

export const quality = (name: QualityName): Quality => ({ name, ...TIERS[name] })

/** A first guess from what the browser admits. The stage corrects it from real frame times. */
export function guessQuality(): QualityName {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mobile = matchMedia('(pointer: coarse)').matches
  const mem = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency ?? 4
  if (mobile) return mem >= 6 && cores >= 8 ? 'balanced' : 'lite'
  return mem >= 8 && cores >= 12 ? 'cinematic' : 'balanced'
}
