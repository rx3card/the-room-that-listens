import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import type { Quality } from '../core/quality'

export interface CamNode {
  pos: THREE.Vector3
  look: THREE.Vector3
  fov?: number
  range?: [number, number] // yaw, pitch freedom in radians
  exposure?: number // this vantage's own stop, for when a lamp is close
}

export interface Live {
  level: number // 0..1, how loud the visitor is (mic or hold)
  lean: number // 0..1, the room is listening
  cam: THREE.PerspectiveCamera
}

// A built 3D place. Each chapter's stage implements this.
export interface Built {
  scene: THREE.Scene
  nodes: Record<string, CamNode>
  anchors: Record<string, THREE.Vector3>
  exposure: number
  bloom: number
  /** Live brightness of this place's main lamp, so a painted plate can flicker with it. */
  light?: () => number
  update(t: number, dt: number, live: Live): void
  event(name: string, data?: unknown): void
  dispose(): void
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const base = () => `${import.meta.env.BASE_URL}assets/`

const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture>()

function tex(path: string, srgb: boolean, repeat: [number, number]) {
  const key = `${path}|${repeat}`
  let t = cache.get(key)
  if (!t) {
    t = loader.load(base() + path)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
    t.anisotropy = 8
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    cache.set(key, t)
  }
  return t
}

export function pbr(name: string, repeat: [number, number], opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    map: tex(`tex/${name}-diff.webp`, true, repeat),
    normalMap: tex(`tex/${name}-nor.webp`, false, repeat),
    roughnessMap: tex(`tex/${name}-rough.webp`, false, repeat),
    ...opts,
  })
}

const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
export const model = async (name: string) => (await gltf.loadAsync(`${base()}models/${name}.glb`)).scene

export function sharedDispose(scene: THREE.Scene) {
  scene.traverse(o => {
    const m = o as THREE.Mesh
    m.geometry?.dispose()
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
    for (const mat of mats) mat.dispose()
  })
}

/** Fine drifting dust, lit only inside a soft sphere around a light. */
export function dust(q: Quality, center: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, size = 0.03) {
  const n = q.dust
  const pos = new Float32Array(n * 3)
  const seed = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * Math.cbrt(Math.random()))
    pos.set([center.x + v.x, center.y + v.y, center.z + v.z], i * 3)
    seed[i] = Math.random()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 },
      uC: { value: new THREE.Color(color) },
      uCenter: { value: center },
      uR: { value: radius },
      uSize: { value: size * 900 },
    },
    vertexShader: /* glsl */ `
      uniform float uT, uSize, uR; uniform vec3 uCenter; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uT*.13 + aSeed*40.)*.5; p.y += sin(uT*.09 + aSeed*70.)*.4; p.z += cos(uT*.11 + aSeed*20.)*.5;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vA = (.35+.65*sin(uT*.6+aSeed*30.)*sin(uT*.6+aSeed*30.)) * smoothstep(uR, uR*.3, distance(p,uCenter));
        gl_PointSize = uSize*(.5+aSeed)/max(.1,-mv.z);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC; varying float vA;
      void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(uC, vA*smoothstep(.5,.1,d)*.8); }`,
  })
  const p = new THREE.Points(g, m)
  p.frustumCulled = false
  p.renderOrder = 2
  return p
}

/** A cheap beam: additive cone, soft at the edge by view angle and fading along its length. */
export function beam(height: number, radius: number, color: THREE.ColorRepresentation, strength = 0.12) {
  const g = new THREE.ConeGeometry(radius, height, 48, 12, true)
  g.translate(0, -height / 2, 0)
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(color) }, uS: { value: strength }, uH: { value: height } },
    vertexShader: /* glsl */ `
      varying vec3 vN, vV; varying float vY; uniform float uH;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vY=-position.y/uH; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC; uniform float uS; varying vec3 vN, vV; varying float vY;
      void main(){ float f=pow(abs(dot(normalize(vN),normalize(vV))),2.6); gl_FragColor=vec4(uC, f*uS*pow(1.-vY,1.7)); }`,
  })
  const mesh = new THREE.Mesh(g, m)
  mesh.renderOrder = 2
  return mesh
}

/** Night or dawn dome. Symmetric below the horizon so still water can show it. */
export function sky(opts: { zenith: string; horizon: string; glow: string; glowDir: THREE.Vector3; glowSize: number; stars: number; clouds: number; mirror?: boolean }) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uT: { value: 0 },
      uZ: { value: new THREE.Color(opts.zenith) },
      uH: { value: new THREE.Color(opts.horizon) },
      uG: { value: new THREE.Color(opts.glow) },
      uD: { value: opts.glowDir.clone().normalize() },
      uS: { value: opts.glowSize },
      uStars: { value: opts.stars },
      uC: { value: opts.clouds },
      uM: { value: opts.mirror ? 1 : 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZ,uH,uG,uD; uniform float uS,uStars,uC,uT,uM; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p,vec3(12.98,78.23,37.72)))*43758.5); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),
        c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
        return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+7.1; a*=.5; } return v; }
      void main(){
        vec3 d=normalize(vP);
        if(uM>.5) d.y=abs(d.y);
        float y=max(d.y,0.);
        vec3 c=mix(uH,uZ,pow(y,.42));
        float g=max(dot(d,uD),0.);
        c+=uG*pow(g,uS)*.9 + uG*exp(-y*16.)*.5*pow(g,3.);
        if(uC>0.){
          vec2 q=d.xz/(d.y+.14)*1.5;
          float cl=smoothstep(.42,.86,fbm(q+uT*.006));
          c=mix(c, uH*.55 + uG*pow(g,8.)*.5, cl*uC*smoothstep(0.,.12,d.y));
        }
        if(uStars>0.){ vec3 s=floor(d*340.); float st=step(.9975,h(s)); c+=vec3(.75,.8,.95)*st*uStars*smoothstep(.02,.3,y)*(.5+.5*sin(uT+h(s)*50.)); }
        gl_FragColor=vec4(c,1.);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), m)
  mesh.frustumCulled = false
  mesh.renderOrder = -10
  return mesh
}

/** Draws text on a canvas: plates, labels and sheets that exist in the world. */
export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function lathe(points: [number, number][], segments: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), segments), mat)
}

export function shadowed<L extends THREE.SpotLight | THREE.PointLight | THREE.DirectionalLight>(light: L, q: Quality, near = 0.3, far = 60) {
  if (!q.shadows) return light
  light.castShadow = true
  light.shadow.mapSize.setScalar(q.shadows)
  light.shadow.camera.near = near
  light.shadow.camera.far = far
  light.shadow.bias = -0.0006
  light.shadow.normalBias = 0.03
  return light
}

/** Small seeded noise for geometry that must be the same on every visit. */
export function vnoise(x: number, y: number) {
  const hash = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return s - Math.floor(s)
  }
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

export const fbm = (x: number, y: number, oct = 5) => {
  let v = 0, a = 0.5
  for (let i = 0; i < oct; i++) {
    v += a * vnoise(x, y)
    x = x * 2.03 + 11.3
    y = y * 2.03 + 7.7
    a *= 0.5
  }
  return v
}
