// Downloads third-party media into assets-src/ and writes optimized copies to public/assets/.
// Every item here must also appear in ASSET_SOURCES.md. Re-running is safe: finished files are skipped.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SRC = 'assets-src'
const OUT = 'public/assets'
const UA = 'the-room-that-listens-build/0.1 (open source art project)'

const TEXTURES = {
  concrete_layers_02: 'mirror', // board-marked pours, the dish
  concrete_wall_006: 'wall',
  damaged_concrete_floor: 'floor',
  dark_rock: 'rock',
  dark_wooden_planks: 'plank',
  rust_coarse_01: 'rust',
  damp_beach_sand: 'sand',
}

const MODELS = {
  painted_wooden_chair_01: 'chair',
  metal_office_desk: 'desk',
  vintage_oil_lamp: 'oil-lamp',
  hanging_industrial_lamp: 'hanging-lamp',
  vintage_radio_transceiver: 'radio',
}

const COMMONS = [
  ['image', 'Gray904.png', 'img/gray-ear.png'],
  ['image', 'Gray928.png', 'img/gray-cochlea.png'],
  ['audio', '1860-Scott-Au-Clair-de-la-Lune-05-09.ogg', 'audio/phonautogram-1860.mp3'],
  ['audio', 'Tchaikowsky & Anton Rubinstein & friends(1890).ogg', 'audio/cylinder-1890.mp3'],
  ['audio', 'Arthur Sullivan - wax cylinder recording.ogg', 'audio/cylinder-1888.mp3'],
  ['audio', "Perseverance rover's SuperCam records wind on Mars.oga", 'audio/wind-mars.mp3'],
]

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 24 })
const ensure = p => mkdirSync(dirname(p), { recursive: true })
const done = p => existsSync(p) && statSync(p).size > 0

async function get(url, path) {
  if (done(path)) return path
  ensure(path)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  return path
}

async function textures() {
  for (const [id, name] of Object.entries(TEXTURES)) {
    const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: { 'User-Agent': UA } })).json()
    const maps = { diff: ['Diffuse', 1024], nor: ['nor_gl', 1024], rough: ['Rough', 512] }
    for (const [key, [field, size]] of Object.entries(maps)) {
      const raw = join(SRC, 'tex', `${name}-${key}.jpg`)
      await get(files[field]['1k'].jpg.url, raw)
      const out = join(OUT, 'tex', `${name}-${key}.webp`)
      if (done(out)) continue
      ensure(out)
      run('magick', [raw, '-resize', `${size}x${size}`, '-quality', key === 'nor' ? '86' : '78', out])
    }
    console.log('tex', name)
  }
}

async function models() {
  for (const [id, name] of Object.entries(MODELS)) {
    const out = join(OUT, 'models', `${name}.glb`)
    if (done(out)) continue
    const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: { 'User-Agent': UA } })).json()
    const entry = files.gltf['1k'].gltf
    const dir = join(SRC, 'models', id)
    const gltf = await get(entry.url, join(dir, `${id}.gltf`))
    for (const [rel, f] of Object.entries(entry.include)) await get(f.url, join(dir, rel))
    ensure(out)
    run('node_modules/.bin/gltf-transform', ['optimize', gltf, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '512', '--simplify', 'false'])
    console.log('model', name, statSync(out).size)
  }
}

async function commons() {
  for (const [kind, title, rel] of COMMONS) {
    const api = new URL('https://commons.wikimedia.org/w/api.php')
    api.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', titles: `File:${title}` })
    const data = await (await fetch(api, { headers: { 'User-Agent': UA } })).json()
    const url = Object.values(data.query.pages)[0].imageinfo[0].url
    const raw = await get(url, join(SRC, 'commons', title.replace(/[^\w.-]+/g, '_')))
    const out = join(OUT, rel)
    if (done(out)) continue
    ensure(out)
    if (kind === 'audio') run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '32000', '-b:a', '64k', out])
    else run('magick', [raw, out])
    console.log('commons', rel)
  }
}

await textures()
await models()
await commons()
