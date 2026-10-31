import type { State } from '../engine/types'
import type { Entry } from './record'
import type { Lang } from './i18n'
import type { QualityName } from './quality'

export interface Settings {
  lang?: Lang
  volume: number
  subtitles: boolean
  quality?: QualityName
  reduced?: boolean
}

export interface Save {
  state?: State
  record?: Entry[]
  visits: number
  lastAsked?: string
  signal?: number[] // last transmission: loudness envelope only, never audio
  endings: string[]
  settings: Settings
}

const KEY = 'the-room-that-listens.v1'
export const blank = (): Save => ({ visits: 0, endings: [], settings: { volume: 0.8, subtitles: true } })

// Private windows may refuse storage. The story then simply does not persist.
export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank()
  } catch {
    return blank()
  }
}

export function save(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* see load() */
  }
}
