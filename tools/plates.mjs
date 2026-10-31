// Exports a clean reference of every view that can take a painted plate (3:2, wider than the node's own field of view).
// Feed each to ChatGPT with its prompt from ASSETS_TO_GENERATE.md. Needs the dev server.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = 'docs/plate-refs'
const FOV = 1.3 // keep in step with PLATE_FOV in src/render/stage.ts
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/brave', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } })
await page.goto('http://localhost:5199/?fast')
await page.locator('.enter .btn').last().click()
await page.waitForFunction(() => room.dir?.state.scene === 'hall' && !room.dir.busy, null, { timeout: 120000 })

const views = async (stage, nodes) => {
  await page.evaluate(() => {
    document.getElementById('ui').style.display = 'none'
    room.stage.built.scene.traverse(o => o.renderOrder === 2 && (o.visible = false)) // dust, rain and beams stay live over the plate
  })
  for (const n of nodes) {
    await page.evaluate(
      ([node, k]) => {
        room.stage.jump(node)
        room.stage.camera.fov *= k
        room.stage.camera.updateProjectionMatrix()
      },
      [n, FOV],
    )
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${out}/${stage}-${n}.jpg`, type: 'jpeg', quality: 88 })
    console.log(stage, n)
  }
  await page.evaluate(() => (document.getElementById('ui').style.display = ''))
}
const load = name => page.evaluate(n => room.ensureStage(n), name)

await views('headland', ['forecourt', 'seat'])
await load('wax')
await page.waitForTimeout(1500)
await views('wax', ['floor', 'shelf', 'desk', 'relay', 'skin', 'phonograph'])
await load('other')
await page.waitForTimeout(1500)
await views('other', ['shore', 'rows', 'desk'])
await browser.close()
