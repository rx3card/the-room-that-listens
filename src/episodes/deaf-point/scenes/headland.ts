import * as THREE from 'three'
import type { Quality } from '../../../core/quality'
import { beam, canvasTexture, dust, fbm, lathe, model, pbr, sharedDispose, shadowed, sky, v3, vnoise, type Built, type Live } from '../../../render/kit'
import { smooth } from '../../../core/tween'

const DISH_R = 15
const DISH_F = 9
const GROUND = 30
const CX = DISH_R + GROUND // height of the dish axis
export const FOCUS = v3(0, CX, -DISH_F + 1)

// Land height. The headland is a tongue of rock reaching toward -z, with the forecourt levelled on top.
function coast(x: number, z: number) {
  const wobble = (fbm(x * 0.012 + 3, z * 0.012, 3) - 0.5) * 70
  const halfWidth = 62 + wobble + Math.max(0, z + 40) * 0.9
  const tip = z + 96 + (fbm(x * 0.02, 5) - 0.5) * 30
  return Math.min(halfWidth - Math.abs(x), tip)
}

function height(x: number, z: number) {
  const d = coast(x, z)
  const land = smooth(Math.min(1, Math.max(0, (d + 2) / 16)))
  const rough = (fbm(x * 0.05, z * 0.05, 5) - 0.5) * 9
  let h = (GROUND - 1 + rough * land) * land - 6 * (1 - land)
  const pad = Math.min(1, Math.max(0, (Math.hypot(x, z + 12) - 34) / 16))
  h = THREE.MathUtils.lerp(GROUND - 0.1, h, smooth(pad) * 1)
  return land < 0.02 ? h - 3 : h + (vnoise(x * 0.3, z * 0.3) - 0.5) * 0.7 * land * pad
}

function terrain(q: Quality) {
  const seg = q.name === 'lite' ? 180 : 320
  const size = 620
  const g = new THREE.PlaneGeometry(size, size, seg, seg)
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, -60)
  const p = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    const h = height(x, z)
    p.setY(i, h)
    // slope-following UV so cliff faces are not stretched
    const gx = height(x + 1, z) - h, gz = height(x, z + 1) - h
    uv.setXY(i, x + h * gx * 0.25, z + h * gz * 0.25)
  }
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, pbr('rock', [0.07, 0.07], { color: '#6c6a70', roughness: 1 }))
  m.receiveShadow = true
  return m
}

function coastTexture() {
  const n = 256
  const data = new Uint8Array(n * n)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = (i / n - 0.5) * 620, z = (j / n - 0.5) * 620 - 60
      data[j * n + i] = Math.max(0, Math.min(255, 255 * Math.exp(-Math.max(0, -coast(x, z)) * 0.05)))
    }
  const t = new THREE.DataTexture(data, n, n, THREE.RedFormat)
  t.magFilter = t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

function sea(q: Quality) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uShore: { value: coastTexture() },
      uOct: { value: q.seaDetail },
      uMoon: { value: v3(0.2, 0.34, 1).normalize() },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT,uOct; uniform sampler2D uShore; uniform vec3 uMoon; varying vec3 vW;
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),
        c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
        return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
      float w(vec2 p){ float v=0.; v+=n(p*.11+uT*vec2(.05,.09))*1.; v+=n(p*.27-uT*vec2(.07,.05))*.5;
        if(uOct>1.5) v+=n(p*.73+uT*vec2(.11,-.13))*.22; if(uOct>2.5) v+=n(p*1.9-uT*.2)*.1; return v; }
      void main(){
        vec3 V=normalize(cameraPosition-vW);
        float e=.6, h0=w(vW.xz), hx=w(vW.xz+vec2(e,0.)), hz=w(vW.xz+vec2(0.,e));
        vec3 N=normalize(vec3((h0-hx)*.9,1.,(h0-hz)*.9));
        float F=pow(1.-max(dot(V,N),0.),5.)*.9+.02;
        vec3 R=reflect(-V,N);
        vec3 skyc=mix(vec3(.012,.014,.022),vec3(.002,.003,.008),pow(max(R.y,0.),.5));
        float moon=pow(max(dot(R,uMoon),0.),260.)*1.6+pow(max(dot(R,uMoon),0.),18.)*.05;
        vec3 c=mix(vec3(.002,.004,.006),skyc,F)+vec3(.5,.55,.65)*moon;
        vec2 suv=vec2((vW.x)/620.+.5,(vW.z+60.)/620.+.5);
        float s=texture2D(uShore,suv).r;
        float swell=sin(s*30.-uT*.55+n(vW.xz*.05)*5.)*.5+.5;
        float foam=smoothstep(.72,.98,s)*smoothstep(.35,.9,n(vW.xz*.5+uT*.25)*.6+swell*.7);
        c+=vec3(.15,.16,.18)*foam;
        float d=length(cameraPosition-vW);
        c=mix(c,vec3(.0105,.012,.018),1.-exp(-d*.0028));
        gl_FragColor=vec4(c,1.);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), m)
  mesh.position.set(0, 0, -300)
  return mesh
}

// Paraboloid bowl around its axis; lathe profile runs vertex to rim.
function dish() {
  const group = new THREE.Group()
  const inner: [number, number][] = [[1.7, 1.7 ** 2 / (4 * DISH_F)]]
  for (let i = 1; i <= 26; i++) {
    const r = 1.7 + (DISH_R - 1.7) * (i / 26)
    inner.push([r, (r * r) / (4 * DISH_F)])
  }
  const mat = pbr('mirror', [3, 2], { color: '#b5b1ab', roughness: 1, side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.2, 1.2) })
  // rain has run down the bowl for ninety years: dark streaks, heaviest at the foot
  mat.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorld;').replace('#include <project_vertex>', '#include <project_vertex>\nvWorld=(modelMatrix*vec4(transformed,1.)).xyz;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWorld;
        float sn(vec2 p){ return fract(sin(dot(floor(p),vec2(127.1,311.7)))*43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float st=sn(vec2(vWorld.x*1.3,0.))*.5+sn(vec2(vWorld.x*3.7,1.))*.5;
        float ht=1.-clamp((vWorld.y-30.)/30.,0.,1.);
        diffuseColor.rgb*=mix(1.,.42+.4*st,smoothstep(.1,1.,ht)*.8);`)
  }
  const bowl = lathe(inner, 96, mat)
  bowl.castShadow = bowl.receiveShadow = true
  const outer = lathe([[DISH_R, inner[26][1]], [DISH_R + 1.3, inner[26][1] + 0.1], [DISH_R + 1.5, inner[26][1] - 1.6], [10, -2.3], [2.8, -3.2], [1.9, -2.7], [1.7, inner[0][1]]], 96, mat)
  outer.castShadow = true
  group.add(bowl, outer)
  // axis along +y in lathe space -> opening faces -z
  group.rotation.x = -Math.PI / 2
  group.position.set(0, CX, 0)
  return group
}

export async function buildHeadland(q: Quality): Promise<Built> {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#090a10', 0.0052)
  const dome = sky({ zenith: '#04050a', horizon: '#0d0f18', glow: '#7f6a55', glowDir: v3(0.2, 0.34, 1), glowSize: 320, stars: 0.5, clouds: 0.92 })
  scene.add(dome)

  const seaMesh = sea(q)
  scene.add(seaMesh, terrain(q), dish())

  const concrete = pbr('wall', [0.8, 0.8], { color: '#8d8a86', roughness: 1 })
  const floorMat = pbr('floor', [9, 9], { color: '#7a7773', roughness: 0.85, metalness: 0 })
  const rust = pbr('rust', [1, 1], { color: '#8b6a56', metalness: 0.5, roughness: 0.9 })

  const slab = new THREE.Mesh(new THREE.CircleGeometry(36, 80).rotateX(-Math.PI / 2), floorMat)
  slab.position.set(0, GROUND, -12)
  slab.receiveShadow = true
  scene.add(slab)

  // The pier: a thin leg rising to the focus, with a gantry running back to the hole in the bowl.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(1.3, CX - GROUND, 1.3), concrete)
  pier.position.set(0, (CX + GROUND) / 2 - 0.2, FOCUS.z)
  pier.castShadow = pier.receiveShadow = true
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 2.6), rust)
  deck.position.set(0, CX, FOCUS.z)
  deck.castShadow = deck.receiveShadow = true
  const gantry = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, DISH_F - 2), rust)
  gantry.position.set(0, CX, FOCUS.z + (DISH_F - 2) / 2 + 1)
  gantry.castShadow = true
  scene.add(pier, deck, gantry)
  for (const sx of [-0.5, 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, DISH_F - 2), rust)
    rail.position.set(sx, CX + 1, FOCUS.z + (DISH_F - 2) / 2 + 1)
    scene.add(rail)
  }

  // Ladder rungs: scale reference against the pier.
  const rung = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), rust, 44)
  for (let i = 0; i < 44; i++) rung.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, GROUND + 0.3 + i * 0.34, FOCUS.z - 0.72))
  scene.add(rung)

  const [chairS, lampS, radioS] = await Promise.all([model('chair'), model('hanging-lamp'), model('radio')])
  chairS.position.set(0, CX + 0.11, FOCUS.z - 0.25)
  chairS.rotation.y = 0
  chairS.traverse(o => (o.castShadow = o.receiveShadow = true))
  radioS.scale.setScalar(0.9)
  radioS.position.set(0.85, CX + 0.11, FOCUS.z + 0.7)
  radioS.rotation.y = -1.9
  lampS.scale.setScalar(0.8)
  lampS.position.set(-0.75, CX + 2.2, FOCUS.z + 0.2)
  scene.add(chairS, radioS, lampS)
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), rust)
  lampPost.position.set(-0.95, CX + 1.1, FOCUS.z + 0.2)
  scene.add(lampPost)

  // Key: the single lamp at the focus, thrown into the bowl. Everything we can see, it lights.
  const key = shadowed(new THREE.SpotLight('#ffaa55', 900, 46, 1.05, 0.72, 1.6), q, 0.5, 46)
  key.position.set(-0.7, CX + 2, FOCUS.z + 0.2)
  key.target.position.set(0, CX - 4, 3)
  scene.add(key, key.target)
  const fill = new THREE.PointLight('#ffaa55', 16, 12, 1.8)
  fill.position.set(-0.7, CX + 1.6, FOCUS.z + 0.2)
  scene.add(fill)
  const moon = new THREE.DirectionalLight('#7f8ca8', 0.55)
  moon.position.set(60, 90, -240)
  scene.add(moon, new THREE.HemisphereLight('#20263a', '#050508', 0.42))

  const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc58a').multiplyScalar(26) }))
  lampGlow.position.set(-0.72, CX + 1.98, FOCUS.z + 0.2)
  scene.add(lampGlow)

  const cone = beam(14, 9, '#ffaa55', 0.05)
  cone.position.copy(key.position)
  cone.rotation.x = 2.45
  scene.add(cone)

  // Iron shutter over the hole at the centre of the bowl.
  const shutterMat = pbr('rust', [1, 1], { color: '#4b3d36', metalness: 0.6, roughness: 0.8 })
  const shutterL = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32, Math.PI / 2, Math.PI), shutterMat)
  const shutterR = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32, -Math.PI / 2, Math.PI), shutterMat)
  for (const s of [shutterL, shutterR]) {
    s.position.set(0, CX, 0.25)
    s.rotation.y = Math.PI
    scene.add(s)
  }
  const holeBack = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: '#000' }))
  holeBack.position.set(0, CX, 1.2)
  holeBack.rotation.y = Math.PI
  scene.add(holeBack)

  // Small things at the foot of the pier.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshStandardMaterial({
      metalness: 0.7,
      roughness: 0.45,
      map: canvasTexture(512, 284, c => {
        c.fillStyle = '#6d5a3f'
        c.fillRect(0, 0, 512, 284)
        c.strokeStyle = '#2d2418'
        c.lineWidth = 6
        c.strokeRect(14, 14, 484, 256)
        c.fillStyle = '#231b10'
        c.font = '600 44px "Host Grotesk Variable", sans-serif'
        c.fillText('ACOUSTIC', 44, 90)
        c.fillText('STATION No. 9', 44, 146)
        c.font = '400 28px "Host Grotesk Variable", sans-serif'
        c.fillText('I. Vale, engineer. 1931', 44, 216)
      }),
    }),
  )
  plate.position.set(0.0, GROUND + 1.6, FOCUS.z - 0.66)
  plate.rotation.y = Math.PI
  scene.add(plate)

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.2), rust)
  box.position.set(-3.6, GROUND + 1.25, FOCUS.z - 6)
  box.castShadow = true
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), rust)
  post.position.set(-3.6, GROUND + 0.6, FOCUS.z - 5.96)
  scene.add(box, post)

  const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 0.4), concrete)
  wall.position.set(5.4, GROUND + 1.3, FOCUS.z - 8)
  wall.rotation.y = -0.5
  wall.castShadow = wall.receiveShadow = true
  scene.add(wall)
  const planTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8b8169', roughness: 0.9 }))
  planTube.position.set(4.7, GROUND + 1.4, FOCUS.z - 8.5)
  planTube.rotation.y = -0.5
  scene.add(planTube)
  const workLamp = new THREE.PointLight('#ffaa55', 7, 8, 1.7)
  workLamp.position.set(4.2, GROUND + 2.6, FOCUS.z - 9.4)
  scene.add(workLamp)

  // Rain: short streaks falling through the camera's neighbourhood only.
  const rainN = q.rain
  const rainPos = new Float32Array(rainN * 6)
  const rainOff = new Float32Array(rainN * 2)
  for (let i = 0; i < rainN; i++) {
    const x = Math.random() * 60 - 30, y = Math.random() * 30, z = Math.random() * 60 - 30
    rainPos.set([x, y, z, x + 0.01, y - 0.55, z], i * 6)
    rainOff[i * 2] = rainOff[i * 2 + 1] = Math.random()
  }
  const rainG = new THREE.BufferGeometry()
  rainG.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
  rainG.setAttribute('aO', new THREE.BufferAttribute(rainOff, 1))
  const rainM = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `uniform float uT; uniform vec3 uCam; attribute float aO; varying float vA;
      void main(){ vec3 p=position; p.y=mod(p.y-uT*17.-aO*31.,30.)-13.+uCam.y;
        p.xz=mod(p.xz+vec2(uT*1.6,0.)-uCam.xz,60.)-30.+uCam.xz;
        vec4 mv=modelViewMatrix*vec4(p,1.); vA=smoothstep(40.,4.,-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor=vec4(.72,.74,.8,vA*.14); }`,
  })
  const rain = new THREE.LineSegments(rainG, rainM)
  rain.frustumCulled = false
  scene.add(rain)
  const motes = dust(q, v3(-0.7, CX, FOCUS.z + 2), 9, '#ffb878', 0.018)
  scene.add(motes)

  let flicker = 1
  let open = 0
  let opening = false

  const b: Built = {
    scene,
    exposure: 1.05,
    bloom: 0.8,
    nodes: {
      sea: { pos: v3(0, 5, -560), look: v3(0, 8, 0), fov: 42, range: [0.2, 0.1] },
      forecourt: { pos: v3(-3.2, GROUND + 1.65, -24), look: v3(0.4, CX - 2.5, -2), fov: 62, range: [0.75, 0.38] },
      seat: { pos: v3(0, CX + 1.2, FOCUS.z + 0.05), look: v3(0, CX + 0.6, 2), fov: 58, range: [1.1, 0.5] },
    },
    anchors: {
      plate: plate.position.clone(),
      box: box.position.clone(),
      plan: planTube.position.clone(),
      pier: v3(0, GROUND + 5.5, FOCUS.z - 0.7),
      hole: v3(0, CX + 0.2, 0.4),
      down: v3(0.8, CX - 0.5, FOCUS.z - 1.2),
      climb: v3(0, CX + 1, FOCUS.z),
    },
    update(t, dt, live: Live) {
      for (const o of [dome, seaMesh, rain, motes]) (o.material as THREE.ShaderMaterial).uniforms.uT.value = t
      rainM.uniforms.uCam.value.copy(live.cam.position)
      // the lamp is on old wiring; it dips rarely, gently, never strobes
      const dip = Math.sin(t * 0.37) * Math.sin(t * 1.13)
      flicker += ((dip > 0.82 ? 0.72 : 1) - flicker) * Math.min(1, dt * 6)
      key.intensity = 900 * flicker * (1 - live.lean * 0.55)
      fill.intensity = 16 * flicker * (1 - live.lean * 0.55)
      if (opening) open = Math.min(1, open + dt / 5)
      const e = smooth(open)
      shutterL.position.x = -e * 3.7
      shutterR.position.x = e * 3.7
    },
    event(name) {
      if (name === 'hatch') opening = true
    },
    dispose() {
      sharedDispose(scene)
    },
  }
  return b
}

export const flightPath = (): THREE.Vector3[] => [v3(0, 5, -560), v3(3, 6.5, -360), v3(-6, 12, -180), v3(-10, 30, -96), v3(-6, GROUND + 7, -60), v3(-3.2, GROUND + 1.65, -24)]
export const descentPath = (): THREE.Vector3[] => [v3(0, CX + 1.2, FOCUS.z + 0.05), v3(0, CX + 1.1, -2.5), v3(0, CX + 0.5, -0.4), v3(0, CX + 0.2, 1.1)]
