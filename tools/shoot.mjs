// Walks the whole story in Brave and saves a screenshot at each beat.
// Usage: node tools/shoot.mjs [outDir] [width] [height]   (needs the dev server, or URL=...)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '.taste-skill/shots'
const [w, h] = [Number(process.argv[3] ?? 1440), Number(process.argv[4] ?? 900)]
const url = process.env.URL ?? 'http://localhost:5199/?fast'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/usr/bin/brave',
  headless: true,
  args: process.env.GPU ? ['--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500 })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => m.type() === 'error' && errors.push(m.text()))

const idle = () => page.waitForFunction(() => window.room?.dir && !room.dir.busy, null, { timeout: 120000 })
const clean = () => page.evaluate(() => document.querySelector('.chapter')?.remove())
const shot = async name => {
  await clean()
  await page.waitForTimeout(2600) // long enough for the frame counter to see only this view
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(name, await page.evaluate(() => `fps ${Math.round(room.stage?.fps ?? 0)} ${room.dir?.state.scene}/${room.dir?.state.node}`))
}
const act = async id => {
  await page.evaluate(i => {
    window.__p = room.dir.activate(i)
  }, id)
  await page.waitForTimeout(150)
}
// answers prompts and keeps Space down so every Lean and push resolves on its own
const go = async id => {
  await act(id)
  for (let i = 0; i < 400; i++) {
    const busy = await page.evaluate(() => room.dir.busy)
    if (!busy) break
    if (await page.locator('.prompt .btn').first().isVisible().catch(() => false)) await page.locator('.prompt .btn').first().click()
    if (await page.locator('.hold').isVisible().catch(() => false)) {
      await page.keyboard.down('Space')
      await page.locator('.hold').waitFor({ state: 'detached', timeout: 60000 })
      await page.keyboard.up('Space')
    }
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(300)
}

await page.goto(url)
console.log('renderer', await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none' }))
await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/title.png` })
await page.locator('.enter .btn').last().click()
await page.waitForFunction(() => room.dir?.state.scene === 'hall', null, { timeout: 120000 })
await idle()
await shot('hall')
await go('pier')
await shot('seat')
await go('hole')
await page.waitForTimeout(2500)
await idle()
await shot('wax')
await go('shelf')
await shot('shelf')
await go('backShelf')
await go('desk')
await shot('desk')
await go('notebook').catch(() => {})
await page.locator('.sheet .btn').first().click({ timeout: 5000 }).catch(() => {})
await go('backDesk')
await page.evaluate(() => (room.dir.state.flags.relay = true))
await go('skin')
await shot('skin')
await go('push')
await page.waitForTimeout(1500)
await idle()
await shot('s1')
await go('on1')
await go('on2')
await shot('s3')
await go('on3')
await shot('s4')
await go('on4')
await shot('s5')
await go('fall')
await page.waitForTimeout(3000)
await idle()
await shot('other')
await go('chairs')
await shot('rows')
await go('desk2')
await shot('deskOther')
console.log(errors.length ? errors.join('\n') : 'no errors')
await browser.close()
