// An episode is plain data: scenes, hotspots and steps. Rendering, audio and UI live behind Host.
export type Flags = Record<string, boolean | number | string | undefined>

export interface State {
  scene: string
  node: string
  flags: Flags
  asked: string[] // cylinders the visitor played, in order
  ending?: string
}

export type Cond = (s: State) => boolean

export type Step =
  | { say: string; vars?: Record<string, string | number> }
  | { voice: string; sub?: string }
  | { doc: string }
  | { ask: string; note?: string; options: { label: string; then: Step[] }[] }
  | { set: string; to: boolean | number | string }
  | { lean: { seconds: number; flag: string; say?: string; kind: 'breath' | 'push' } }
  | { goto: string; via: string }
  | { move: string }
  | { fx: string; data?: unknown }
  | { wait: number }
  | { when: Cond; then: Step[]; else?: Step[] }
  | { widget: 'crank' | 'dials' | 'transcript' | 'final' | 'mic'; id?: string }
  | { end: string }

export interface Hotspot {
  id: string
  label: string
  at: string // node where it is reachable
  when?: Cond
  to?: string // plain walk to another node
  steps?: Step[]
}

export interface SceneDef {
  id: string
  title: string
  describe: string
  start: string
  stage: string // which 3D scene builds this chapter
  enter: Step[]
  hotspots: Hotspot[]
}

export interface Episode {
  id: string
  first: string
  scenes: Record<string, SceneDef>
}

// Everything an episode can ask of the outside world.
export interface Host {
  say(key: string, vars?: Record<string, string | number>): void | Promise<void>
  voice(key: string, sub?: string): Promise<void>
  doc(key: string): Promise<void>
  ask(key: string, note: string | undefined, labels: string[]): Promise<number>
  lean(seconds: number, kind: 'breath' | 'push'): Promise<{ held: boolean; seconds: number }>
  transition(from: string, to: string, via: string): Promise<void>
  move(node: string): Promise<void>
  fx(name: string, data?: unknown): void
  wait(seconds: number): Promise<void>
  widget(name: string, id?: string): Promise<number | string | void>
  enterScene(scene: SceneDef): void
  end(id: string): Promise<void>
}
