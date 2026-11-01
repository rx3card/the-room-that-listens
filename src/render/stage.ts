import * as THREE from 'three'
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import { clamp, inOut, lerp, smooth, Tweens } from '../core/tween'
import { quality, type Quality, type QualityName } from '../core/quality'
import type { Built, CamNode, Live } from './kit'

// One effect does the whole grade: exposure, tone curve, vignette, and film grain that spikes on story events only.
class Grade extends Effect {
  constructor() {
    super(
      'Grade',
      /* glsl */ `
      uniform float uExposure, uGrain, uFringe, uLeak, uTime;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
      float r(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        vec3 c=inputColor.rgb;
        if(uFringe>0.){ vec2 o=(uv-.5)*uFringe*.012; c.r=texture2D(inputBuffer,uv+o).r; c.b=texture2D(inputBuffer,uv-o).b; }
        c*=uExposure;
        vec2 q=uv-.5; c*=1.-dot(q,q)*1.3;
        // print stock: cool, slightly lifted shadows, warm highlights
        float l=dot(c,vec3(.2126,.7152,.0722));
        c=mix(c,c*vec3(.86,.96,1.08)+vec3(.0016,.0022,.0034),smoothstep(.22,.0,l));
        c=mix(c,c*vec3(1.05,1.,.93),smoothstep(.2,.9,l));
        c+=vec3(1.,.42,.1)*uLeak*smoothstep(.2,1.,uv.x)*.2;
        // per-channel ACES turns amber to lemon; hold the hue by blending in a luminance-based curve
        float L0=max(dot(c,vec3(.2126,.7152,.0722)),1e-4);
        c=mix(aces(c),clamp(c*(aces(vec3(L0)).r/L0),0.,1.),.65);
        float g=r(gl_FragCoord.xy*.731+fract(uTime*7.13)*97.)-.5;
        c+=g*(.012+uGrain*.07)*(1.-dot(c,vec3(.33))*.6);
        outputColor=vec4(c,1.);
      }`,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map<string, THREE.Uniform>([
          ['uExposure', new THREE.Uniform(1)],
          ['uGrain', new THREE.Uniform(0)],
          ['uFringe', new THREE.Uniform(0)],
          ['uLeak', new THREE.Uniform(0)],
          ['uTime', new THREE.Uniform(0)],
        ]),
      },
    )
  }
  set(name: 'uExposure' | 'uGrain' | 'uFringe' | 'uLeak' | 'uTime', v: number) {
    this.uniforms.get(name)!.value = v
  }
}

// References are shot this much wider than a node's field of view, in ChatGPT's 3:2, so a plate covers any screen.
export const PLATE_FOV = 1.45
export const PLATE_ASPECT = 1.5

export class Stage {
  renderer: THREE.WebGLRenderer
  camera = new THREE.PerspectiveCamera(50, 1, 0.08, 2000)
  q: Quality
  built?: Built
  tweens = new Tweens()
  paused = false
  reduced = false
  live: Live
  fade = 1 // multiplies scene exposure, used by every transition
  grain = 0
  fringe = 0
  leak = 0
  roll = 0
  anchorsVisible = true

  private composer!: EffectComposer
  private pass!: RenderPass
  private grade!: Grade
  private ao?: N8AOPostPass
  private plates = new Map<string, THREE.Texture | null>()
  private plate?: THREE.Mesh
  private stageId = ''
  private bloom?: BloomEffect
  private t = 0
  private last = 0
  private pos = new THREE.Vector3()
  private target = new THREE.Vector3()
  private node?: CamNode
  private nodeExposure = 1
  private yaw = 0
  private pitch = 0
  private yawT = 0
  private pitchT = 0
  private dragging = false
  private frames: number[] = []
  private dprScale = 1
  onFrame: (dt: number) => void = () => {}
  onDowngrade: (name: QualityName) => void = () => {}

  constructor(private canvas: HTMLCanvasElement, name: QualityName, private adaptive: boolean) {
    this.q = quality(name)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true })
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.shadowMap.enabled = this.q.shadows > 0
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.live = { level: 0, lean: 0, cam: this.camera }
    this.build()
    this.bindLook()
    addEventListener('resize', () => this.resize())
    this.resize()
    this.last = performance.now()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private build() {
    this.composer?.dispose()
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: this.q.msaa })
    this.pass = new RenderPass(this.built?.scene ?? new THREE.Scene(), this.camera)
    this.composer.addPass(this.pass)
    // contact shadows are most of what separates a lit scene from a game engine default
    this.ao = this.q.bloom ? new N8AOPostPass(this.built?.scene ?? new THREE.Scene(), this.camera, innerWidth, innerHeight) : undefined
    if (this.ao) {
      this.ao.configuration.aoRadius = 1.6
      this.ao.configuration.distanceFalloff = 0.8
      this.ao.configuration.intensity = 2.2
      this.ao.configuration.gammaCorrection = false
      this.ao.setQualityMode(this.q.name === 'cinematic' ? 'High' : 'Low') // Performance mode leaves visible mottle at rest
      this.composer.addPass(this.ao)
    }
    this.grade = new Grade()
    this.bloom = this.q.bloom ? new BloomEffect({ luminanceThreshold: 0.55, luminanceSmoothing: 0.4, intensity: 0.7, mipmapBlur: true, radius: 0.75 }) : undefined
    this.composer.addPass(new EffectPass(this.camera, ...(this.bloom ? [this.bloom] : []), this.grade))
  }

  setQuality(name: QualityName, adaptive = false) {
    this.q = quality(name)
    this.adaptive = adaptive
    this.dprScale = 1
    this.renderer.shadowMap.enabled = this.q.shadows > 0
    this.build()
    this.resize()
  }

  resize() {
    const w = innerWidth, h = innerHeight
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.q.dpr) * this.dprScale)
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private bindLook() {
    const el = this.canvas
    let px = 0, py = 0
    el.addEventListener('pointerdown', e => {
      this.dragging = true
      px = e.clientX
      py = e.clientY
      el.setPointerCapture(e.pointerId)
    })
    el.addEventListener('pointerup', () => (this.dragging = false))
    el.addEventListener('pointercancel', () => (this.dragging = false))
    el.addEventListener('pointermove', e => {
      if (this.dragging) {
        this.yawT -= ((e.clientX - px) / innerWidth) * 2.4
        this.pitchT += ((e.clientY - py) / innerHeight) * 1.6
        px = e.clientX
        py = e.clientY
      } else if (e.pointerType === 'mouse') {
        // a resting hand still moves the head a little
        this.yawT += (-(e.clientX / innerWidth - 0.5) * 0.2 - this.yawT) * 0.04
        this.pitchT += (-(e.clientY / innerHeight - 0.5) * 0.12 - this.pitchT) * 0.04
      }
      const range = this.plate ? [0.14, 0.08] : (this.node?.range ?? [0.7, 0.4]) // a plate has a finite edge
      this.yawT = clamp(this.yawT, -range[0], range[0])
      this.pitchT = clamp(this.pitchT, -range[1], range[1])
    })
    addEventListener('keydown', e => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const s = 0.09
      if (e.key === 'ArrowLeft') this.yawT += s
      else if (e.key === 'ArrowRight') this.yawT -= s
      else if (e.key === 'ArrowUp') this.pitchT += s
      else if (e.key === 'ArrowDown') this.pitchT -= s
      else return
    })
  }

  setBuilt(b: Built, node?: string, name = '') {
    this.built?.dispose()
    this.built = b
    this.stageId = name
    this.plate = undefined
    this.pass.mainScene = b.scene
    if (this.ao) this.ao.scene = b.scene
    if (node) this.jump(node)
    if (this.bloom) this.bloom.intensity = b.bloom
  }

  jump(node: string) {
    const n = this.built!.nodes[node]
    this.node = n
    this.pos.copy(n.pos)
    this.target.copy(n.look)
    this.camera.fov = n.fov ?? 50
    this.camera.updateProjectionMatrix()
    this.yaw = this.yawT = this.pitch = this.pitchT = 0
    this.showPlate(node)
  }

  /**
   * Matte painting. public/assets/plates/<stage>-<node>.webp, if it exists, is hung in the world in front of a node,
   * painted from a reference of this exact view (tools/plates.mjs). It covers the 3D; live light, dust and rain stay on top.
   */
  private async showPlate(name: string) {
    this.hidePlate(0.4)
    const b = this.built
    const n = b?.nodes[name]
    if (!b || !n) return
    const url = `${import.meta.env.BASE_URL}assets/plates/${this.stageId}-${name}.webp`
    const key = url
    let tex = this.plates.get(key)
    if (tex === undefined) {
      tex = await new THREE.TextureLoader().loadAsync(url).catch(() => null)
      if (tex) tex.colorSpace = THREE.SRGBColorSpace
      this.plates.set(key, tex)
    }
    if (!tex || this.built !== b || this.node !== n) return
    const d = 8
    const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(((n.fov ?? 50) * PLATE_FOV) / 2))
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * PLATE_ASPECT, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }))
    mesh.position.copy(n.pos).add(n.look.clone().sub(n.pos).normalize().multiplyScalar(d))
    mesh.lookAt(n.pos)
    mesh.renderOrder = 1
    b.scene.add(mesh)
    this.plate = mesh
    if (this.ao) this.ao.enabled = false // a painting carries its own contact shadows
    void this.tweens.to(1.2, k => ((mesh.material as THREE.MeshBasicMaterial).opacity = k))
  }

  private hidePlate(dur: number) {
    const m = this.plate
    if (!m) return
    this.plate = undefined
    if (this.ao) this.ao.enabled = true
    const mat = m.material as THREE.MeshBasicMaterial
    const from = mat.opacity
    void this.tweens.to(dur, k => (mat.opacity = from * (1 - k))).then(() => {
      m.removeFromParent()
      m.geometry.dispose()
      mat.dispose()
    })
  }

  async moveTo(name: string, dur = 3.2) {
    const b = this.built
    if (!b) return
    const n = b.nodes[name]
    // a plate has no 3D worth walking through, so leaving one dissolves through dark
    if (this.reduced || this.plate) {
      await this.fadeTo(0, 0.45)
      this.jump(name)
      await this.fadeTo(1, 0.7)
      return
    }
    this.hidePlate(0.5)
    const p0 = this.pos.clone(), l0 = this.target.clone(), f0 = this.camera.fov
    const yaw0 = this.yawT, pitch0 = this.pitchT
    this.node = n
    await this.tweens.to(dur, k => {
      const e = inOut(k)
      this.pos.lerpVectors(p0, n.pos, e)
      this.pos.y += Math.sin(k * Math.PI) * 0.12 // weight in the step
      this.target.lerpVectors(l0, n.look, smooth(clamp(k * 1.25)))
      this.camera.fov = lerp(f0, n.fov ?? 50, e)
      this.camera.updateProjectionMatrix()
      this.yawT = yaw0 * (1 - e)
      this.pitchT = pitch0 * (1 - e)
    })
    void this.showPlate(name)
  }

  /** Authored flight along a spline, used for the arrival and the descents. */
  async fly(points: THREE.Vector3[], look: THREE.Vector3 | ((k: number) => THREE.Vector3), dur: number, ease: (k: number) => number = smooth) {
    if (this.reduced) {
      await this.fadeTo(0, 0.5)
      this.pos.copy(points[points.length - 1])
      this.target.copy(typeof look === 'function' ? look(1) : look)
      await this.fadeTo(1, 0.5)
      return
    }
    const c = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const l0 = this.target.clone()
    await this.tweens.to(dur, k => {
      const e = ease(k)
      c.getPoint(e, this.pos)
      if (typeof look === 'function') this.target.copy(look(e))
      else this.target.lerpVectors(l0, look, smooth(clamp(k * 2)))
    })
  }

  fadeTo(v: number, dur: number) {
    const a = this.fade
    return this.tweens.to(dur, k => (this.fade = lerp(a, v, smooth(k))))
  }

  /** Screen position of a world point, or null when behind the camera. */
  project(p: THREE.Vector3) {
    const v = p.clone().project(this.camera)
    if (v.z > 1) return null
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }
  }

  private frame() {
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    if (this.paused) return
    this.t += dt
    this.tweens.tick(dt)

    this.yaw += (this.yawT - this.yaw) * (1 - Math.exp(-dt * 6))
    this.pitch += (this.pitchT - this.pitch) * (1 - Math.exp(-dt * 6))
    const breath = this.reduced ? 0 : Math.sin(this.t * 0.7) * 0.008
    const look = this.target.clone().sub(this.pos)
    const dist = Math.max(0.001, look.length())
    look.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    const right = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0)).normalize()
    look.applyAxisAngle(right, this.pitch).normalize().multiplyScalar(dist)
    this.camera.position.copy(this.pos)
    this.camera.position.y += breath
    this.camera.up.set(Math.sin(this.roll), Math.cos(this.roll), 0)
    this.camera.lookAt(this.pos.clone().add(look))
    this.camera.updateMatrixWorld()

    const b = this.built
    if (b) {
      b.update(this.t, dt, this.live)
      // cancel this view's exposure so the painting arrives as painted; 0.72 sits it under the tone curve
      if (this.plate) (this.plate.material as THREE.MeshBasicMaterial).color.setScalar(((b.light?.() ?? 1) * 0.72) / (b.exposure * this.nodeExposure))
      this.nodeExposure += ((this.node?.exposure ?? 1) - this.nodeExposure) * Math.min(1, dt * 1.5)
      this.grade.set('uExposure', b.exposure * this.nodeExposure * this.fade)
      this.grade.set('uGrain', this.grain + this.live.lean * 0.5)
      this.grade.set('uFringe', this.fringe + this.live.lean * 0.8)
      this.grade.set('uLeak', this.leak)
      this.grade.set('uTime', this.t % 100)
      this.composer.render(dt)
    }
    this.onFrame(dt)
    this.watch(dt)
  }

  fps = 60

  /** Lowers resolution first, then the tier. Only when the visitor left the setting on automatic. */
  private watch(dt: number) {
    this.frames.push(dt)
    if (this.frames.length < 90) return
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length
    this.frames.length = 0
    this.fps = 1 / avg
    if (!this.adaptive || this.fps > 32) return
    if (this.dprScale > 0.8) {
      this.dprScale -= 0.2
      this.resize()
    } else if (this.q.name !== 'lite') {
      const next = this.q.name === 'cinematic' ? 'balanced' : 'lite'
      this.setQuality(next, true)
      this.onDowngrade(next)
    }
  }
}
