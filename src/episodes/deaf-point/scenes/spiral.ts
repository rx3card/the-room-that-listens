import * as THREE from 'three'
import type { Quality } from '../../../core/quality'
import { clamp, inOut, lerp } from '../../../core/tween'
import { pbr, sharedDispose, v3, type Built, type Live } from '../../../render/kit'

const TURNS = 2.5
// Centre line of the spiral. p runs 0 at the base to 1 at the apex; radius and tube shrink as in a real cochlea.
export function spiralAt(p: number, out = new THREE.Vector3()) {
  const a = p * TURNS * Math.PI * 2
  const r = lerp(11.5, 2.4, p ** 0.8)
  return out.set(Math.cos(a) * r, -p * 9, Math.sin(a) * r)
}
const tubeR = (p: number) => lerp(2.5, 1.35, p)

function frame(p: number) {
  const c = spiralAt(p)
  const t = spiralAt(Math.min(1, p + 0.002)).sub(spiralAt(Math.max(0, p - 0.002))).normalize()
  const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(side, t).normalize()
  return { c, t, side, up }
}

function tunnel() {
  const seg = 460, ring = 22
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= seg; i++) {
    const p = i / seg
    const { c, side, up } = frame(p)
    const R = tubeR(p)
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2
      // squashed floor: a corridor first, a throat second
      const y = Math.sin(a), x = Math.cos(a)
      const v = c.clone().addScaledVector(side, x * R * 1.08).addScaledVector(up, (y > 0 ? y : y * 0.72) * R)
      pos.push(v.x, v.y, v.z)
      uv.push(p * 42, j / ring * 3)
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j, b = a + ring + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function wires(q: Quality) {
  const n = q.wires
  // a ribbon that always faces the camera: two triangles per segment, so tens of thousands stay cheap
  const base = new THREE.PlaneGeometry(1, 1, 1, 5)
  base.translate(0, 0.5, 0)
  const g = new THREE.InstancedBufferGeometry()
  g.index = base.index
  g.setAttribute('position', base.attributes.position)
  g.instanceCount = n
  const aBase = new Float32Array(n * 3), aDir = new Float32Array(n * 3), aInfo = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const p = Math.random() * 0.985
    const { c, side, up } = frame(p)
    const R = tubeR(p)
    const floor = Math.random() < 0.68
    const u = (Math.random() * 2 - 1) * (floor ? 0.92 : 0.8)
    const y = floor ? -Math.sqrt(1 - u * u) * 0.72 : Math.sqrt(1 - u * u)
    const b = c.clone().addScaledVector(side, u * R * 1.04).addScaledVector(up, y * R * 0.98)
    const dir = (floor ? up.clone() : up.clone().negate()).addScaledVector(side, -u * 0.18).normalize()
    aBase.set([b.x, b.y, b.z], i * 3)
    aDir.set([dir.x, dir.y, dir.z], i * 3)
    // walls of length grow toward the apex, as hair bundles do
    const len = (floor ? 1.5 : 1.0) * lerp(0.85, 1.1, p) * (0.6 + Math.random() * 0.6) * (1 - Math.abs(u) * 0.4)
    aInfo.set([p, len, Math.random()], i * 3)
  }
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(aBase, 3))
  g.setAttribute('aDir', new THREE.InstancedBufferAttribute(aDir, 3))
  g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 3))
  const m = new THREE.ShaderMaterial({
    transparent: true, // drawn after any plate, so the wires stay alive on top of a painting
    uniforms: {
      uT: { value: 0 },
      uWave: { value: 0 },
      uAmp: { value: 0.4 },
      uG0: { value: new THREE.Vector3(0, -1000, 0) },
      uG1: { value: new THREE.Vector3(0, -1000, 0) },
      uG2: { value: new THREE.Vector3(0, -1000, 0) },
      uG3: { value: new THREE.Vector3(0, -1000, 0) },
      uCam: { value: new THREE.Vector3() },
      uStill: { value: 0 },
      uPx: { value: 0.002 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aBase,aDir,aInfo; uniform float uT,uWave,uAmp,uStill,uPx; uniform vec3 uG0,uG1,uG2,uG3,uCam;
      varying float vTip,vLit,vFog,vNear,vFade;
      vec3 repel(vec3 p,vec3 a,vec3 b){ vec3 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); vec3 d=pa-ba*h; float l=length(d)+.001; float s=smoothstep(.62,.16,l); return d/l*s*.62; }
      void main(){
        float y=position.y; float p=aInfo.x, L=aInfo.y, s=aInfo.z;
        vec3 w=aBase+aDir*y*L;
        float f=mix(5.,1.,p);
        float tw=sin(p*210.-uT*2.3*f+s*1.2);
        float env=exp(-pow((p-uWave)*18.,2.));
        float k=y*y;
        vec3 sway=vec3(sin(uT*.9+s*40.),0.,cos(uT*.7+s*30.))*.04*(1.-uStill);
        w+=normalize(cross(aDir,vec3(.3,.2,.9)))*tw*(.05*uAmp+env*.3)*k*(1.-uStill*.9)+sway*k;
        w+=(repel(w,uG0,uG1)+repel(w,uG2,uG3))*k*1.1;
        // the wires part for the visitor too, and do not quite touch them
        vec3 toCam=w-uCam; float dc=length(toCam.xz)+.001; w.xz+=toCam.xz/dc*smoothstep(1.3,.3,dc)*.8*k;
        vec3 side=normalize(cross(aDir,uCam-w));
        float dist=distance(uCam,w);
        // never thinner than about a pixel; beyond that a wire fades instead of breaking into dashes
        float width=mix(.013,.004,y);
        float px=dist*uPx;
        vFade=clamp(width/px*2.5,.3,1.);
        vec3 pos=w+side*position.x*max(width,px);
        vec4 mv=viewMatrix*vec4(pos,1.);
        vTip=y; vLit=env; vFog=1.-exp(-(-mv.z)*.12); vNear=smoothstep(.5,2.4,-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vTip,vLit,vFog,vNear,vFade;
      void main(){
        vec3 c=mix(vec3(.02,.021,.025),vec3(.6,.58,.54),vTip*vTip)*(.25+.75*vNear);
        c=mix(c,vec3(1.,.42,.07)*2.4,vLit*vTip);
        c=mix(c,vec3(.004,.005,.008),vFog);
        gl_FragColor=vec4(c,vFade*(1.-vFog*.8));
      }`,
  })
  const mesh = new THREE.Mesh(g, m)
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  return { mesh, m }
}

const P = { s1: 0.04, s2: 0.26, s3: 0.5, s4: 0.72, s5: 0.965 }

const node = (p: number, fov = 66) => {
  const pos = spiralAt(p)
  const f = frame(p)
  pos.addScaledVector(f.up, -0.45)
  // aimed a little ahead along the curve, so the wall visibly bends away to the left
  return { pos, look: spiralAt(Math.min(1, p + 0.07)).addScaledVector(f.up, -0.2), fov, range: [0.75, 0.4] as [number, number] }
}

export async function buildSpiral(q: Quality): Promise<Built> {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#010203')
  scene.fog = new THREE.FogExp2('#010203', 0.075)

  const wall = new THREE.Mesh(tunnel(), pbr('wall', [1, 1], { color: '#62646c', roughness: 0.85, side: THREE.DoubleSide }))
  scene.add(wall)
  // Ribs of old shuttering every couple of metres give the eye a rhythm to count, then lose count of.
  const ribs = 96
  const rib = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.07, 6, 28), pbr('wall', [2, 0.2], { color: '#74767e', roughness: 0.9 }), ribs)
  for (let i = 0; i < ribs; i++) {
    const p = (i + 0.5) / ribs
    const f = frame(p)
    const R = tubeR(p)
    const look = new THREE.Matrix4().makeBasis(f.side, f.up, f.t)
    rib.setMatrixAt(i, look.scale(v3(R * 1.06, R * 0.92, 1)).setPosition(f.c.clone().addScaledVector(f.up, -R * 0.05)))
  }
  scene.add(rib)
  const w = wires(q)
  scene.add(w.mesh)

  // Two lamps only: one that follows the visitor at waist height and the orange trace of the passing wave.
  const walk = new THREE.PointLight('#aeb8cc', 16, 16, 1.5)
  const trace = new THREE.PointLight('#ff6a00', 0, 9, 1.8)
  scene.add(walk, trace, new THREE.HemisphereLight('#1a2030', '#000', 0.05))

  // The apex: a warm hole.
  const end = spiralAt(1)
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vU; void main(){ vU=uv-.5; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: /* glsl */ `varying vec2 vU; void main(){ float r=length(vU)*2.; float a=pow(1.-r,2.2); gl_FragColor=vec4(vec3(1.,.36,.06)*(.2+a*2.4),a); }`,
    }),
  )
  hole.position.copy(end)
  hole.lookAt(spiralAt(0.96))
  scene.add(hole)

  const gl = w.m.uniforms
  let walkerP = -1
  let walkerTarget = -1
  let walkerStep = 0
  let onStep: () => void = () => {}
  let lookAbove = 0
  let stillness = 0
  let camP = P.s1

  const put = (p: number, a: THREE.Vector3, b: THREE.Vector3, invert = false) => {
    const f = frame(p)
    const c = spiralAt(p)
    const foot = invert ? 1.6 : -1.45
    a.copy(c).addScaledVector(f.up, foot)
    b.copy(c).addScaledVector(f.up, foot + (invert ? -1.55 : 1.55))
  }

  const b: Built = {
    scene,
    exposure: 1.1,
    bloom: 0.9,
    nodes: { s1: node(P.s1), s2: node(P.s2), s3: node(P.s3), s4: node(P.s4), s5: { ...node(P.s5, 74), look: end.clone() } },
    anchors: {
      on1: spiralAt(P.s1 + 0.07),
      slit: spiralAt(P.s2 + 0.015).add(v3(0, -0.2, 0)).addScaledVector(frame(P.s2).side, 2.4),
      on2: spiralAt(P.s2 + 0.06),
      on3: spiralAt(P.s3 + 0.05),
      up: spiralAt(P.s4 + 0.012).addScaledVector(frame(P.s4).up, 1.4),
      on4: spiralAt(P.s4 + 0.05),
      fall: end.clone(),
    },
    update(t, dt, live: Live) {
      gl.uT.value = t
      gl.uCam.value.copy(live.cam.position)
      gl.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(live.cam.fov / 2))) / innerHeight / q.dpr
      gl.uWave.value = (t * 0.021) % 1.2
      gl.uAmp.value = 0.4 + live.level * 4
      stillness += (live.lean - stillness) * Math.min(1, dt * 3)
      gl.uStill.value = stillness

      // find how far along we are by the nearest point; precise enough for lights and sound
      let best = camP, d = 1e9
      for (let i = -6; i <= 6; i++) {
        const p = clamp(camP + i * 0.004)
        const dd = spiralAt(p).distanceToSquared(live.cam.position)
        if (dd < d) (d = dd), (best = p)
      }
      camP = best
      walk.position.copy(live.cam.position).add(v3(0, 0.1, 0))
      trace.position.copy(spiralAt(clamp(gl.uWave.value)))
      trace.intensity = 22

      // the walker: a place the wires refuse. Each footfall is an event the audio layer can place.
      if (walkerP >= 0) {
        const speed = 0.0058 * (stillness > 0.5 ? 0.4 : 1)
        const dir = Math.sign(walkerTarget - walkerP)
        walkerP += dir * speed * dt * 14
        if ((dir > 0 && walkerP >= walkerTarget) || (dir < 0 && walkerP <= walkerTarget)) {
          walkerP = -1
          gl.uG0.value.set(0, -1000, 0)
          gl.uG1.value.set(0, -1000, 0)
        } else {
          put(walkerP, gl.uG0.value, gl.uG1.value)
          walkerStep += dt
          if (walkerStep > 0.72) {
            walkerStep = 0
            onStep()
          }
        }
      }
      // the visitor's own absence, on the roof, walking when they walk
      lookAbove = Math.max(0, lookAbove - dt * 0.04)
      if (lookAbove > 0) put(camP + 0.002, gl.uG2.value, gl.uG3.value, true)
      else gl.uG2.value.set(0, -1000, 0), gl.uG3.value.set(0, -1000, 0)
    },
    event(name, data) {
      if (name === 'walker') {
        if (data === 'approach') {
          walkerP = 0.71
          walkerTarget = 0.5 + 0.02
        } else if (data === 'pass') {
          walkerP = Math.max(camP - 0.015, 0.44)
          walkerTarget = camP - 0.3
        }
      }
      if (name === 'lookUp') lookAbove = 1
      if (name === 'walkerStep') onStep = data as () => void
    },
    dispose() {
      sharedDispose(scene)
    },
  }
  return b
}

export const spiralDepth = (y: number) => clamp(-y / 9)
export const fallEase = inOut
