import { clamp } from './tween'

/** Loudness only. The stream goes into an analyser and nowhere else: nothing is stored or sent. */
export class Listening {
  on = false
  level = 0 // 0 quiet room, 1 speech at the microphone
  private ctx?: AudioContext
  private stream?: MediaStream
  private analyser?: AnalyserNode
  private buf?: Float32Array<ArrayBuffer>
  private floor = -60

  get available() {
    return !!navigator.mediaDevices?.getUserMedia
  }

  async enable(): Promise<boolean> {
    if (this.on) return true
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      })
    } catch {
      return false
    }
    this.ctx = new AudioContext()
    await this.ctx.resume()
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.buf = new Float32Array(this.analyser.fftSize)
    src.connect(this.analyser)
    this.on = true
    // calibrate against the room as it is right now
    let sum = 0
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 60))
      sum += this.db()
    }
    this.floor = sum / 12
    return true
  }

  disable() {
    this.stream?.getTracks().forEach(tr => tr.stop())
    void this.ctx?.close()
    this.on = false
    this.level = 0
  }

  private db() {
    this.analyser!.getFloatTimeDomainData(this.buf!)
    let e = 0
    for (const x of this.buf!) e += x * x
    return 10 * Math.log10(e / this.buf!.length + 1e-10)
  }

  update() {
    if (!this.on) return
    const v = clamp((this.db() - this.floor - 6) / 30)
    this.level += (v - this.level) * (v > this.level ? 0.4 : 0.06)
  }
}
