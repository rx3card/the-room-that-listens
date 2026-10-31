import { describe, expect, it } from 'vitest'
import { en, es, register, speech } from '../../src/episodes/deaf-point/text'
import { cylinders } from '../../src/episodes/deaf-point'
import { phonemes, speak } from '../../src/audio/voder'

describe('text', () => {
  it('English and Spanish have the same keys and placeholders', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
      expect(vars(es[k]), k).toEqual(vars(en[k]))
    }
  })

  it('the register holds forty-one names and every cylinder points at its own', () => {
    expect(register.length).toBe(41)
    expect(new Set(register).size).toBe(41)
    for (const c of Object.values(cylinders)) if (c.named) expect(register[c.register]).toBe(c.named)
  })

  it('every spoken line exists in both languages', () => {
    expect(Object.keys(speech.es).sort()).toEqual(Object.keys(speech.en).sort())
  })
})

describe('voder', () => {
  it('parses digraphs before single letters', () => {
    expect(phonemes('shee').length).toBe(2)
  })

  it('renders non-silent, normalised audio', () => {
    const a = speak('pleez stop lisning')
    const peak = a.reduce((m, x) => Math.max(m, Math.abs(x)), 0)
    expect(a.length).toBeGreaterThan(8000)
    expect(peak).toBeCloseTo(1, 3)
    expect(Number.isFinite(a.reduce((s, x) => s + x, 0))).toBe(true)
  })
})
