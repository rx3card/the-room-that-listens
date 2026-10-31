import * as THREE from 'three'
import type { Quality } from '../../../core/quality'
import { clamp, smooth } from '../../../core/tween'
import { canvasTexture, dust, lathe, model, pbr, sharedDispose, shadowed, v3, type Built, type Live } from '../../../render/kit'

const R = 9.5 // the round room
const H = 7.4

function hornProfile(): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    out.push([0.05 + 0.75 * t ** 3.4, t * 1.5])
  }
  return out
}

function phonograph() {
  const g = new THREE.Group()
  const wood = pbr('plank', [0.5, 0.5], { color: '#6a4628', roughness: 0.5 })
  const brass = new THREE.MeshStandardMaterial({ color: '#b88a3e', metalness: 1, roughness: 0.34, side: THREE.DoubleSide })
  const wax = new THREE.MeshStandardMaterial({ color: '#5c3a1c', roughness: 0.32 })
  const steel = new THREE.MeshStandardMaterial({ color: '#2d2a28', metalness: 0.8, roughness: 0.42 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.36), wood)
  base.position.y = 0.12
  const mandrel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.24, 24).rotateZ(Math.PI / 2), wax)
  mandrel.position.set(0, 0.36, 0.02)
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), steel)
  carriage.position.set(0, 0.44, -0.08)
  const horn = lathe(hornProfile(), 48, brass)
  horn.rotation.z = -Math.PI / 2 - 0.34
  horn.position.set(-0.02, 0.44, -0.08)
  const crank = new THREE.Group()
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.02), steel)
  arm.position.y = -0.08
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10).rotateZ(Math.PI / 2), wood)
  knob.position.set(0.04, -0.16, 0)
  crank.add(arm, knob)
  crank.position.set(0.34, 0.15, 0)
  g.add(base, mandrel, carriage, horn, crank)
  g.traverse(o => (o.castShadow = true))
  return { group: g, crank, mandrel }
}

// Round iron ring with a stretched skin: a disc with enough rings to bulge when pushed.
function membrane() {
  const uniforms = { uPush: { value: 0 }, uT: { value: 0 }, uTaut: { value: 0 }, uMap: { value: null as THREE.Texture | null } }
  const geo = new THREE.CircleGeometry(2.05, 96, 0, Math.PI * 2)
  const dense = new THREE.RingGeometry(0.001, 2.05, 96, 40)
  geo.dispose()
  const m = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uPush,uT,uTaut; varying vec2 vP; varying float vB;
      void main(){ vP=position.xy; float r=length(position.xy)/2.05; float dome=(1.-r*r);
        float b=dome*(uPush*2.1+(1.-uTaut)*(sin(uT*.8)*.06)+uTaut*sin(uT*2.1+r*9.)*.012);
        vB=b; gl_Position=projectionMatrix*modelViewMatrix*vec4(position.xy,b,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uPush,uTaut; varying vec2 vP; varying float vB;
      float n(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(n(i),n(i+vec2(1,0)),f.x),mix(n(i+vec2(0,1)),n(i+vec2(1,1)),f.x),f.y); }
      void main(){ float r=length(vP)/2.05;
        float v=vn(vP*3.)*.5+vn(vP*9.)*.3+vn(vP*vec2(2.,28.))*.2;
        vec3 skin=mix(vec3(.11,.066,.04),vec3(.26,.17,.1),v);
        vec3 light=vec3(1.,.55,.22)*(.08+uTaut*.14+uPush*2.4)*(1.-r*r)*(1.+v);
        gl_FragColor=vec4(skin*(.34+uPush)+light,1.); }`,
  })
  return { mesh: new THREE.Mesh(dense, m), uniforms }
}

export async function buildWax(q: Quality): Promise<Built> {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#030202')
  scene.fog = new THREE.FogExp2('#0b0603', 0.045)

  const wallMat = pbr('wall', [6, 2], { color: '#6b5f55', roughness: 1, side: THREE.BackSide })
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 72, 1, true), wallMat)
  wall.position.y = H / 2
  wall.receiveShadow = true
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2), pbr('plank', [5, 5], { color: '#4e3a2c', roughness: 0.62 }))
  floor.receiveShadow = true
  const roof = new THREE.Mesh(new THREE.ConeGeometry(R, 2.2, 72, 1, true), pbr('wall', [5, 2], { color: '#3a332c', side: THREE.BackSide }))
  roof.position.y = H + 1.1
  scene.add(wall, floor, roof)

  // Shelves ring the room, leaving gaps for the door side, the desk bay and the membrane.
  const shelfMat = pbr('plank', [2, 0.2], { color: '#5a4230', roughness: 0.7 })
  const waxTube = new THREE.CylinderGeometry(0.034, 0.034, 0.1, 8)
  const box = new THREE.CylinderGeometry(0.045, 0.045, 0.11, 8)
  const tiers = 9
  const count = Math.min(9000, q.wires / 2)
  const cyl = new THREE.InstancedMesh(waxTube, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 }), count)
  const carton = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: '#8c7350', roughness: 0.92 }), count)
  const gap = (a: number) => Math.abs(a - Math.PI) < 0.5 || Math.abs(a) < 0.36 || Math.abs(a - Math.PI / 2) < 0.34
  for (let t = 0; t < tiers; t++) {
    const shelf = new THREE.Mesh(new THREE.TorusGeometry(R - 0.25, 0.26, 3, 72), shelfMat)
    shelf.rotation.x = Math.PI / 2
    shelf.scale.z = 0.12
    shelf.position.y = 0.55 + t * 0.72
    shelf.receiveShadow = true
    scene.add(shelf)
  }
  const m = new THREE.Matrix4(), c = new THREE.Color()
  const palette = ['#7c4a20', '#5e3518', '#94632b', '#3f2412', '#a8772f']
  let n = 0
  for (let i = 0; n < count && i < count * 6; i++) {
    const a = Math.random() * Math.PI * 2
    if (gap(a) && Math.random() > 0.08) continue
    const tier = Math.floor(Math.random() * tiers)
    const r = R - 0.08 - Math.random() * 0.42
    const y = 0.61 + tier * 0.72 + Math.floor(Math.random() * 3) * 0.13
    m.makeRotationY(-a).setPosition(Math.cos(a) * r, y, Math.sin(a) * r)
    cyl.setMatrixAt(n, m)
    cyl.setColorAt(n, c.set(palette[Math.floor(Math.random() * palette.length)]).multiplyScalar(0.6 + Math.random() * 0.7))
    carton.setMatrixAt(n, m.setPosition(Math.cos(a) * (r + 0.08), y, Math.sin(a) * (r + 0.08)))
    n++
  }
  cyl.count = carton.count = n
  scene.add(cyl, carton)

  // The table at the centre of the room.
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.07, 48), pbr('plank', [1, 1], { color: '#4b2f1c', roughness: 0.45 }))
  top.position.y = 0.92
  top.castShadow = top.receiveShadow = true
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.34, 0.9, 16), pbr('plank', [1, 1], { color: '#2f1e13' }))
  leg.position.y = 0.45
  scene.add(top, leg)

  const ph = phonograph()
  ph.group.position.set(0.1, 0.95, 0.1)
  ph.group.rotation.y = 0.55
  scene.add(ph.group)

  const [lampS, deskS, chairS] = await Promise.all([model('oil-lamp'), model('desk'), model('chair')])
  lampS.position.set(-0.68, 0.95, -0.34)
  lampS.scale.setScalar(1.2)
  scene.add(lampS)

  const lamp = shadowed(new THREE.PointLight('#ffa050', 52, 26, 1.5), q, 0.1, 26)
  lamp.position.set(-0.68, 1.36, -0.34)
  scene.add(lamp)
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb36b').multiplyScalar(22) }))
  flame.scale.y = 1.8
  flame.position.copy(lamp.position)
  scene.add(flame)

  // Desk bay at the right: ledger, notebook, the cut page, a chair pushed back.
  deskS.position.set(0, 0, 0)
  deskS.rotation.y = Math.PI
  const deskGroup = new THREE.Group()
  deskGroup.add(deskS)
  deskGroup.position.set(0, 0, 7.9)
  deskGroup.rotation.y = 0
  deskGroup.traverse(o => (o.castShadow = o.receiveShadow = true))
  chairS.position.set(0.7, 0, 6.9)
  chairS.rotation.y = 2.5
  scene.add(deskGroup, chairS)
  const paper = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) =>
    new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: canvasTexture(420, 300, draw), roughness: 0.8 }))
  const ink = (lines: number) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = '#c9bb9c'
    c.fillRect(0, 0, 420, 300)
    c.fillStyle = '#2b241a'
    for (let i = 0; i < lines; i++) c.fillRect(30, 26 + i * 20, 200 + Math.random() * 150, 3)
  }
  const ledger = paper(0.46, 0.33, ink(13))
  const notebook = paper(0.26, 0.2, ink(9))
  const cut = paper(0.2, 0.28, c => {
    c.fillStyle = '#b9ad93'
    c.fillRect(0, 0, 420, 300)
    c.strokeStyle = '#201a12'
    c.lineWidth = 3
    c.beginPath()
    c.ellipse(190, 150, 90, 120, 0.2, 0, 7)
    c.stroke()
  })
  ledger.position.set(-0.35, 0.79, 7.9)
  notebook.position.set(0.2, 0.79, 7.72)
  notebook.rotation.y = 0.2
  cut.position.set(0.58, 0.79, 7.96)
  cut.rotation.y = -0.15
  scene.add(ledger, notebook, cut)
  const bay = new THREE.PointLight('#ff9a4c', 2.6, 6, 1.7)
  bay.position.set(0.2, 1.7, 7.4)
  scene.add(bay)

  // The relay: three bronze dials set into the wall on the left, joined by three small levers.
  const relayMat = new THREE.MeshStandardMaterial({ color: '#7d5a2c', metalness: 0.95, roughness: 0.42 })
  const dials: THREE.Mesh[] = []
  ;[-0.62, 0, 0.62].forEach((dz, i) => {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 32).rotateZ(Math.PI / 2), relayMat)
    dial.position.set(-R + 0.34, 1.7, dz)
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: '#d8cdb9', metalness: 0.5, roughness: 0.4 }))
    pin.position.set(0.05, 0.1, 0)
    dial.add(pin)
    dial.castShadow = true
    scene.add(dial)
    dials.push(dial)
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.54 + i * 0.1, 10), relayMat)
    bone.position.set(-R + 0.34, 2.15 + i * 0.1, dz)
    bone.rotation.x = 0.25 - i * 0.25
    scene.add(bone)
  })
  const relayPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 2.1), pbr('rust', [1, 1], { color: '#403028', metalness: 0.4, roughness: 0.9 }))
  relayPanel.position.set(-R + 0.14, 2, 0)
  scene.add(relayPanel)
  const relayLight = new THREE.PointLight('#ff9a4c', 2.4, 5, 1.7)
  relayLight.position.set(-R + 1.6, 2.5, 0)
  scene.add(relayLight)

  // The membrane fills the east bay.
  const mem = membrane()
  mem.mesh.position.set(R - 0.45, 2.3, 0)
  mem.mesh.rotation.y = -Math.PI / 2
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.09, 12, 96), pbr('rust', [3, 0.3], { color: '#3d2f28', metalness: 0.7, roughness: 0.7 }))
  ring.position.copy(mem.mesh.position)
  ring.rotation.y = Math.PI / 2
  ring.castShadow = true
  scene.add(mem.mesh, ring)

  // Hatch in the roof the visitor came down through.
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 32, 1, true), pbr('rust', [2, 1], { color: '#3a3027', side: THREE.BackSide }))
  hatch.position.set(-5.8, H + 0.7, 0)
  scene.add(hatch)

  scene.add(new THREE.HemisphereLight('#3a2413', '#0a0502', 0.32))
  const motes = dust(q, v3(0, 2, 0), 7, '#ffae66', 0.014)
  scene.add(motes)

  let flick = 1
  let spin = 0
  let turning = 0
  let taut = 0
  let push = 0
  const dialTargets = [0, 0, 0]

  const b: Built = {
    scene,
    exposure: 1.05,
    bloom: 0.55,
    nodes: {
      top: { pos: v3(-5.8, H + 1.8, 0), look: v3(-1, 0.8, 0), fov: 60 },
      floor: { pos: v3(-4.6, 1.6, -3.3), look: v3(0.2, 1.3, 0.3), fov: 58, range: [1.5, 0.45] },
      shelf: { pos: v3(2.2, 1.6, -6.9), look: v3(3.1, 1.9, -9.2), fov: 46, range: [0.5, 0.3] },
      phonograph: { pos: v3(1.2, 1.55, 1.55), look: v3(0.1, 1.15, 0.1), fov: 38, range: [0.25, 0.15] },
      desk: { pos: v3(0.05, 1.68, 6.5), look: v3(0.05, 0.75, 7.9), fov: 42, range: [0.4, 0.25] },
      relay: { pos: v3(-6.6, 1.75, 0), look: v3(-9.2, 1.8, 0), fov: 42, range: [0.3, 0.2] },
      skin: { pos: v3(5.2, 1.9, 0), look: v3(9, 2.3, 0), fov: 58, range: [0.35, 0.3] },
    },
    anchors: {
      shelf: v3(4.2, 2, -8.2),
      desk: v3(0, 1, 7.6),
      relay: v3(-8.6, 2.1, 0),
      skin: v3(8.6, 2.3, 0),
      backShelf: v3(0.8, 1.2, -5),
      backDesk: v3(1.8, 1.1, 5),
      backRelay: v3(-5.4, 1.2, 1.6),
      backSkin: v3(3.6, 1.2, 1.7),
      ledger: ledger.position.clone(),
      notebook: notebook.position.clone(),
      gray: cut.position.clone(),
      dials: v3(-R + 0.4, 1.7, 0),
      readSkin: v3(7.6, 3.9, -2.4),
      push: v3(8.8, 2, 0),
      'cyl.prado': v3(2.3, 2.6, -8.9),
      'cyl.aguirre': v3(3.3, 2.45, -8.8),
      'cyl.iriarte': v3(4.2, 2.15, -8.4),
      'cyl.ruiz': v3(1.8, 1.75, -9),
      'cyl.alma': v3(3.0, 1.6, -8.85),
      'cyl.vale': v3(4.0, 1.35, -8.5),
      'cyl.blank': v3(5.0, 1.75, -8),
    },
    update(t, dt, live: Live) {
      ;(motes.material as THREE.ShaderMaterial).uniforms.uT.value = t
      const target = 1 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.03 + Math.sin(t * 2.3) * 0.06
      flick += (target - flick) * Math.min(1, dt * 14)
      lamp.intensity = 52 * flick * (1 - live.lean * 0.4)
      flame.scale.y = 1.8 + (flick - 1) * 3
      spin += turning * dt * 9
      ph.crank.rotation.x = spin
      ph.mandrel.rotation.x = spin * 3
      dials.forEach((d, i) => (d.rotation.x += (dialTargets[i] - d.rotation.x) * Math.min(1, dt * 8)))
      mem.uniforms.uT.value = t
      mem.uniforms.uTaut.value += (taut - mem.uniforms.uTaut.value) * Math.min(1, dt * 1.2)
      mem.uniforms.uPush.value += (push - mem.uniforms.uPush.value) * Math.min(1, dt * 5)
    },
    event(name, data) {
      if (name === 'crank') turning = clamp(data as number, 0, 2)
      if (name === 'relay') taut = 1
      if (name === 'dials') (data as number[]).forEach((v, i) => (dialTargets[i] = (v / 10) * Math.PI * 2))
      if (name === 'push') push = smooth(clamp(data as number))
    },
    dispose() {
      sharedDispose(scene)
    },
  }
  return b
}
