import type { Episode, Hotspot, Host, SceneDef, State, Step } from './types'

export const newState = (ep: Episode): State => ({
  scene: ep.first,
  node: ep.scenes[ep.first].start,
  flags: {},
  asked: [],
})

// Walks an episode. Knows nothing about Three.js or the DOM, so whole playthroughs can run in a unit test.
export class Director {
  busy = false
  constructor(
    readonly ep: Episode,
    readonly host: Host,
    public state: State,
    private onChange: (s: State) => void = () => {},
  ) {}

  get scene(): SceneDef {
    return this.ep.scenes[this.state.scene]
  }

  available(): Hotspot[] {
    const s = this.state
    return this.scene.hotspots.filter(h => h.at === s.node && (!h.when || h.when(s)))
  }

  async start() {
    this.host.enterScene(this.scene)
    await this.lock(this.scene.enter)
  }

  /** Re-enter the saved scene at its start. Used when a saved story is resumed. */
  async resume() {
    this.state.node = this.scene.start
    this.host.enterScene(this.scene)
    this.onChange(this.state)
  }

  async activate(id: string) {
    if (this.busy || this.state.ending) return
    const h = this.available().find(x => x.id === id)
    if (!h) return
    await this.lock([...(h.to ? [{ move: h.to }] : []), ...(h.steps ?? [])])
  }

  private async lock(steps: Step[]) {
    this.busy = true
    this.onChange(this.state)
    await this.run(steps)
    this.busy = false
    this.onChange(this.state)
  }

  private async run(steps: Step[]): Promise<void> {
    const { host, state } = this
    for (const step of steps) {
      if ('say' in step) await host.say(step.say, step.vars)
      else if ('voice' in step) await host.voice(step.voice, step.sub)
      else if ('doc' in step) await host.doc(step.doc)
      else if ('ask' in step) {
        const i = await host.ask(step.ask, step.note, step.options.map(o => o.label))
        await this.run(step.options[i].then)
      } else if ('set' in step) state.flags[step.set] = step.to
      else if ('lean' in step) {
        const r = await host.lean(step.lean.seconds, step.lean.kind)
        state.flags[step.lean.flag] = r.held
        state.flags[`${step.lean.flag}Seconds`] = Math.round(r.seconds)
      } else if ('goto' in step) {
        const next = this.ep.scenes[step.goto]
        await host.transition(state.scene, step.goto, step.via)
        state.scene = step.goto
        state.node = next.start
        host.enterScene(next)
        this.onChange(state)
        await this.run(next.enter)
        return
      } else if ('move' in step) {
        await host.move(step.move)
        state.node = step.move
      } else if ('fx' in step) host.fx(step.fx, step.data)
      else if ('wait' in step) await host.wait(step.wait)
      else if ('when' in step) await this.run(step.when(state) ? step.then : (step.else ?? []))
      else if ('widget' in step) {
        const r = await host.widget(step.widget, step.id)
        if (step.widget === 'crank' && step.id && r === 1 && !state.asked.includes(step.id)) state.asked.push(step.id)
        if (step.widget === 'dials') state.flags.relay = r === 1
        if (step.widget === 'final') state.flags.final = String(r)
      } else if ('end' in step) {
        state.ending = step.end
        await host.end(step.end)
        return
      }
      this.onChange(state)
    }
  }
}
