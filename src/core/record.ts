import { getLang, t } from './i18n'

export interface Entry {
  at: number // epoch ms
  key: string
  vars?: { [k: string]: string | number }
}

/** The transcript: every sentence the piece says about the visitor, each one really measured. */
export class Transcript {
  entries: Entry[] = []

  constructor(private show: (text: string) => void) {}

  add(key: string, vars?: { [k: string]: string | number }) {
    const at = Date.now()
    const merged = { ...vars, time: clock(at) }
    this.entries.push({ at, key, vars: merged })
    this.show(t(key, merged))
  }

  lines() {
    return this.entries.map(e => ({ time: clock(e.at), text: t(e.key, e.vars) }))
  }
}

export const clock = (at: number) =>
  new Date(at).toLocaleTimeString(getLang(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
