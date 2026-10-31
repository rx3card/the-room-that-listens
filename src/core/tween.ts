export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** One frame-driven tween. Resolves when done; the stage ticks these, so pausing freezes them. */
export class Tweens {
  private list: { t: number; dur: number; fn: (k: number) => void; done: () => void }[] = []
  to(dur: number, fn: (k: number) => void) {
    return new Promise<void>(done => {
      if (dur <= 0) {
        fn(1)
        done()
      } else this.list.push({ t: 0, dur, fn, done })
    })
  }
  tick(dt: number) {
    for (const a of [...this.list]) {
      a.t = Math.min(a.dur, a.t + dt)
      a.fn(a.t / a.dur)
      if (a.t >= a.dur) {
        this.list.splice(this.list.indexOf(a), 1)
        a.done()
      }
    }
  }
}
