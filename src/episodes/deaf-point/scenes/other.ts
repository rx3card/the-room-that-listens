import * as THREE from 'three'
import type { Quality } from '../../../core/quality'
import { canvasTexture, dust, fbm, lathe, model, sharedDispose, shadowed, sky, v3, type Built, type Live } from '../../../render/kit'

interface Part {
  geometry: THREE.BufferGeometry
  material: THREE.Material
}

const smoothEdge = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t }

const seat = (i: number) => {
  // forty-one chairs in loose ranks, all facing the water and the dawn
  const row = Math.floor(i / 7)
  const col = i % 7
  return { x: (col - 3) * 2.4 + (row % 2) * 0.9 + Math.sin(i * 7.3) * 0.25, z: 6 + row * 2.7 + Math.cos(i * 3.1) * 0.25, ry: Math.PI + Math.sin(i * 9.7) * 0.16 }
}

export async function buildOther(q: Quality, fallen: number[], lines: string[]): Promise<Built> {
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#0b0512', 0.009)

  const dome = sky({ zenith: '#07040e', horizon: '#1a0c24', glow: '#a32a2a', glowDir: v3(0.1, 0.0, -1), glowSize: 60, stars: 0, clouds: 0.75, mirror: true })
  scene.add(dome)

  const [chairS, lampS, deskS, radioS] = await Promise.all([model('chair'), model('hanging-lamp'), model('desk'), model('radio')])

  const parts: Part[] = []
  chairS.updateMatrixWorld(true)
  chairS.traverse(o => {
    const m = o as THREE.Mesh
    if (m.isMesh) parts.push({ geometry: m.geometry.clone().applyMatrix4(m.matrixWorld), material: m.material as THREE.Material })
  })

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), s1 = v3(1, 1, 1), mirror = new THREE.Matrix4().makeScale(1, -1, 1)
  const place = (i: number) => {
    const s = seat(i)
    if (fallen.includes(i)) {
      e.set(-Math.PI / 2 + 0.06, s.ry + 1.1 * Math.sin(i), 0)
      m4.compose(v3(s.x, 0.2, s.z), q4.setFromEuler(e), s1)
    } else {
      e.set(0, s.ry, 0)
      m4.compose(v3(s.x, 0, s.z), q4.setFromEuler(e), s1)
    }
    return m4
  }
  for (const p of parts) {
    const up = new THREE.InstancedMesh(p.geometry, p.material, 41)
    // water is darker than air: the reflection gets its own dimmed copy of the paint
    const dim = (p.material as THREE.MeshStandardMaterial).clone()
    dim.color.multiplyScalar(0.3)
    dim.side = THREE.DoubleSide
    const down = new THREE.InstancedMesh(p.geometry, dim, 41)
    for (let i = 0; i < 41; i++) {
      up.setMatrixAt(i, place(i))
      down.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(mirror, m4))
    }
    up.castShadow = true
    ;(p.material as THREE.Material).side = THREE.DoubleSide
    scene.add(up, down)
  }

  // The water is the mirror of an upside-down world beneath a thin dark sheet. It keeps everything except the visitor.
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(800, 64).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uT: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */ `
        uniform float uT; varying vec3 vW;
        void main(){
          vec3 V=normalize(cameraPosition-vW);
          float f=pow(1.-max(V.y,0.),3.);
          float r=sin(length(vW.xz)*.8-uT*.3)*.5+.5;
          float a=mix(.78,.34,f)+r*.015;
          gl_FragColor=vec4(.008,.006,.014,a);
        }`,
    }),
  )
  scene.add(water)

  // The headland and the dish, far off and black against the dawn, also doubled.
  const cliffMat = new THREE.MeshStandardMaterial({ color: '#07050a', roughness: 1 })
  const addBoth = (o: THREE.Object3D) => {
    const c = o.clone()
    const g = new THREE.Group()
    g.scale.y = -1
    g.add(c)
    scene.add(o, g)
  }
  const cliffG = new THREE.PlaneGeometry(420, 120, 200, 70)
  const cp = cliffG.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i) + 60
    const edge = 1 - smoothEdge(Math.abs(x + 20) / 190)
    const top = 34 + (fbm(x * 0.03, 3, 4) - 0.5) * 12
    cp.setY(i, Math.min(y, top + (fbm(x * 0.2, y * 0.2, 3) - 0.5) * 3) * edge)
    cp.setZ(i, (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 16)
  }
  cliffG.computeVertexNormals()
  const cliff = new THREE.Mesh(cliffG, cliffMat)
  cliff.position.set(-60, 0, -170)
  addBoth(cliff)
  const dish = lathe(Array.from({ length: 14 }, (_, i) => [1 + i * 1.1, (1 + i * 1.1) ** 2 / 36] as [number, number]), 48, new THREE.MeshStandardMaterial({ color: '#0a070c', side: THREE.DoubleSide }))
  dish.rotation.x = -Math.PI / 2 + 0.05
  dish.rotation.z = 0.15
  dish.position.set(-58, 37, -168)
  addBoth(dish)
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a26').multiplyScalar(2.2) }))
  pupil.position.set(-58, 37, -167.4)
  scene.add(pupil)

  // The desk stands in the water at the middle of the ranks.
  const center = v3(0, 0, 13)
  deskS.position.copy(center)
  deskS.rotation.y = Math.PI
  deskS.traverse(o => (o.castShadow = true))
  const steno = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.32), new THREE.MeshStandardMaterial({ color: '#14110f', metalness: 0.5, roughness: 0.4 }))
  body.position.y = 0.07
  const platen = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.3 }))
  platen.position.set(0, 0.17, 0.1)
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.36),
    new THREE.MeshStandardMaterial({
      roughness: 0.9,
      transparent: true,
      // the page in the machine is what the visitor has actually done tonight
      map: canvasTexture(900, 1080, c => {
        c.fillStyle = '#d7cdb8'
        c.fillRect(0, 0, 900, 1080)
        c.fillStyle = '#1b1712'
        c.font = '30px "Courier Prime", monospace'
        let y = 70
        for (const text of lines.slice(-14)) {
          let line = ''
          for (const word of text.split(' ')) {
            if (c.measureText(`${line} ${word}`).width > 800) {
              c.fillText(line, 50, y)
              y += 38
              line = word
            } else line = line ? `${line} ${word}` : word
          }
          c.fillText(line, 50, y)
          y += 56
        }
      }),
    }),
  )
  sheet.position.set(0, 0.34, 0.14)
  sheet.rotation.x = -0.28
  sheet.renderOrder = 2
  steno.add(body, platen, sheet)
  steno.position.set(0.1, 0.77, 13.05)
  scene.add(deskS, steno)

  radioS.scale.setScalar(0.7)
  radioS.position.set(-0.6, 0.77, 13.05)
  scene.add(radioS)

  const standMat = new THREE.MeshStandardMaterial({ color: '#14100e', metalness: 0.6, roughness: 0.6 })
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.4, 8), standMat)
  stand.position.set(1.5, 1.2, 14.1)
  lampS.scale.setScalar(0.7)
  lampS.position.set(1.3, 2.3, 14.1)
  scene.add(stand, lampS)
  const lampLight = shadowed(new THREE.SpotLight('#ffb27a', 13, 22, 1.25, 0.8, 1.7), q, 0.3, 24)
  lampLight.position.set(1.0, 2.3, 14.2)
  lampLight.target.position.set(0.1, 0.7, 13)
  scene.add(lampLight, lampLight.target)

  const rim = new THREE.DirectionalLight('#d0553a', 2.6)
  rim.position.set(0, 4, -80)
  scene.add(rim, new THREE.HemisphereLight('#3a1a4a', '#070310', 1))
  const motes = dust(q, v3(0, 2, 14), 12, '#c9988a', 0.012)
  scene.add(motes)

  return {
    scene,
    exposure: 2,
    bloom: 0.55,
    nodes: {
      high: { pos: v3(0, 70, 38), look: v3(0, 0, -30), fov: 62 },
      shore: { pos: v3(-1.5, 1.3, 27.5), look: v3(0, 1.5, -20), fov: 46, range: [0.9, 0.3] },
      rows: { pos: v3(1.6, 1.6, 21), look: v3(0.2, 0.9, 12), fov: 52, range: [1.1, 0.35] },
      desk: { pos: v3(0.1, 1.62, 14.25), look: v3(0.1, 0.92, 12.9), fov: 44, range: [0.6, 0.3], exposure: 0.42 },
    },
    anchors: {
      chairs: v3(-2.4, 1.4, 22),
      desk2: v3(0.1, 1.2, 13.2),
      page: v3(0.1, 1.15, 13.2),
      letter: v3(-0.5, 0.86, 13.5),
    },
    update(t, _dt, live: Live) {
      ;(dome.material as THREE.ShaderMaterial).uniforms.uT.value = t
      ;(water.material as THREE.ShaderMaterial).uniforms.uT.value = t
      ;(motes.material as THREE.ShaderMaterial).uniforms.uT.value = t
      lampLight.intensity = (1 - live.lean * 0.6) * 13
    },
    event() {},
    dispose() {
      sharedDispose(scene)
    },
  }
}
