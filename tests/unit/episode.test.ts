import { describe, expect, it } from 'vitest'
import { Director, newState } from '../../src/engine/director'
import type { Host, SceneDef, State } from '../../src/engine/types'
import { cylinders, deafPoint, type CylinderId } from '../../src/episodes/deaf-point'

type Answers = { crank?: boolean; ask?: (key: string) => number; lean?: boolean; dials?: number; final?: string }

function fakeHost(a: Answers) {
  const log: string[] = []
  const host: Host = {
    say: k => void log.push(k),
    voice: async () => {},
    doc: async k => void log.push(`doc:${k}`),
    ask: async k => a.ask?.(k) ?? 0,
    lean: async (s, kind) => ({ held: kind === 'push' || (a.lean ?? true), seconds: s }),
    transition: async (f, t) => void log.push(`go:${f}>${t}`),
    move: async () => {},
    fx: () => {},
    wait: async () => {},
    widget: async n => (n === 'crank' ? 1 : n === 'dials' ? (a.dials ?? 1) : n === 'final' ? (a.final ?? 'stop') : undefined),
    enterScene: (_: SceneDef) => {},
    end: async id => void log.push(`end:${id}`),
  }
  return { host, log }
}

const walk = async (d: Director, ids: string[]) => {
  for (const id of ids) {
    const found = d.available().some(h => h.id === id)
    expect(found, `${id} reachable at ${d.state.scene}/${d.state.node}`).toBe(true)
    await d.activate(id)
  }
}

const toRecording = ['pier', 'hole']
const silentRoute = ['desk', 'ledger', 'notebook', 'gray', 'backDesk', 'relay', 'dials', 'skin', 'push']
const spiral = ['on1', 'slit', 'on2', 'on3', 'up', 'on4', 'fall']
const other = ['chairs', 'desk2', 'page', 'letter']

async function play(a: Answers, wax: string[] = silentRoute): Promise<{ state: State; log: string[] }> {
  const { host, log } = fakeHost(a)
  const d = new Director(deafPoint, host, newState(deafPoint))
  await d.start()
  await walk(d, [...toRecording, ...wax, ...spiral, ...other])
  return { state: d.state, log }
}

describe('Deaf Point', () => {
  it('can be finished without asking for anyone, on reading alone', async () => {
    const { state, log } = await play({ final: 'stop' })
    expect(state.asked).toEqual([])
    expect(state.ending).toBe('stopped')
    expect(log).toContain('rec.ot.none')
  })

  it('every cylinder played by name is remembered as asked for', async () => {
    const wax = ['shelf', 'cyl.prado', 'cyl.alma', 'backShelf', ...silentRoute]
    const { state, log } = await play({ final: 'keep' }, wax)
    expect(state.asked).toEqual(['prado', 'alma'])
    expect(log).toContain('rec.ot.fallen')
    expect(state.ending).toBe('kept')
  })

  it('unnamed cylinders are safe', async () => {
    const { state } = await play({ final: 'send' }, ['shelf', 'cyl.vale', 'cyl.blank', 'backShelf', ...silentRoute])
    const named = state.asked.filter(id => cylinders[id as CylinderId].named)
    expect(state.asked.length).toBe(2)
    expect(named).toEqual([])
    expect(state.ending).toBe('sent')
  })

  it('leaving a cylinder on the shelf asks for nobody', async () => {
    const { state } = await play({ ask: k => (k.startsWith('cyl.') ? 1 : 0) }, ['shelf', 'cyl.prado', 'backShelf', ...silentRoute])
    expect(state.asked).toEqual([])
  })

  it('the skin stays shut until the relay is set', async () => {
    const { host } = fakeHost({ dials: 0 })
    const d = new Director(deafPoint, host, newState(deafPoint))
    await d.start()
    await walk(d, [...toRecording, 'relay', 'dials', 'backRelay', 'skin'])
    expect(d.available().map(h => h.id)).not.toContain('push')
  })

  it('breathing in the spiral is recorded', async () => {
    const { state, log } = await play({ lean: false })
    expect(state.flags.caught).toBe(true)
    expect(log).toContain('rec.hall.heard')
  })

  it('every hotspot of every scene names a real node', () => {
    for (const scene of Object.values(deafPoint.scenes)) for (const h of scene.hotspots) expect(typeof h.at).toBe('string')
  })
})
