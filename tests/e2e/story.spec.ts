import { expect, test, type Page } from '@playwright/test'

declare const room: any

const enter = async (page: Page, button: RegExp = /silence/i) => {
  await page.goto('/?fast')
  await page.getByRole('button', { name: button }).click()
  await page.waitForFunction(() => room.dir?.state.scene === 'hall' && !room.dir.busy, null, { timeout: 120_000 })
}

const act = async (page: Page, id: string) => {
  await page.evaluate(i => void room.dir.activate(i), id)
  await page.waitForTimeout(120)
  for (let i = 0; i < 500; i++) {
    if (!(await page.evaluate(() => room.dir.busy))) return
    const prompt = page.locator('.prompt .btn').first()
    if (await prompt.isVisible().catch(() => false)) await prompt.click()
    if (await page.locator('.hold').isVisible().catch(() => false)) {
      await page.keyboard.down('Space')
      await page.locator('.hold').waitFor({ state: 'detached', timeout: 60_000 })
      await page.keyboard.up('Space')
    }
    const wheel = page.locator('.crank .wheel')
    if (await wheel.isVisible().catch(() => false)) {
      await page.keyboard.down('Space')
      await wheel.waitFor({ state: 'detached', timeout: 60_000 })
      await page.keyboard.up('Space')
    }
    await page.waitForTimeout(100)
  }
}

test('no audio context exists before a gesture', async ({ page }) => {
  await page.goto('/?fast')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('listens')
  expect(await page.evaluate(() => room.audio.ctx === undefined)).toBe(true)
})

test('the title links to the source code', async ({ page }) => {
  await page.goto('/?fast')
  await expect(page.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', 'https://github.com/rx3card/the-room-that-listens')
})

test('language switches and is remembered', async ({ page }) => {
  await page.goto('/?fast')
  await page.getByRole('button', { name: 'Español' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('escucha')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('escucha')
})

test('the story reaches the hall and offers marks', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await enter(page)
  await expect(page.locator('.spot')).toHaveCount(4)
  await expect(page.locator('.record')).toContainText('Nobody has been paid')
  await page.waitForFunction(() => !!room.stage.plate, null, { timeout: 15_000 }) // the painted plate really arrives
  expect(errors).toEqual([])
})

test('a whole run, naming one person, ends with their name struck', async ({ page }) => {
  test.setTimeout(240_000)
  await enter(page)
  await act(page, 'pier')
  await act(page, 'hole')
  await page.waitForFunction(() => room.dir.state.scene === 'recording' && !room.dir.busy, null, { timeout: 60_000 })
  await act(page, 'shelf')
  await act(page, 'cyl.prado')
  expect(await page.evaluate(() => room.dir.state.asked)).toEqual(['prado'])
  await act(page, 'backShelf')
  await act(page, 'relay')
  await page.evaluate(() => void room.dir.activate('dials'))
  const fields = page.locator('.dials input')
  await fields.nth(0).fill('4')
  await fields.nth(1).fill('1')
  await fields.nth(2).fill('9')
  await page.getByRole('button', { name: 'Set them' }).click()
  await page.waitForFunction(() => room.dir.state.flags.relay === true && !room.dir.busy)
  await act(page, 'skin')
  await act(page, 'push')
  await page.waitForFunction(() => room.dir.state.scene === 'impossible' && !room.dir.busy, null, { timeout: 60_000 })
  for (const id of ['on1', 'on2', 'on3', 'on4', 'fall']) await act(page, id)
  await page.waitForFunction(() => room.dir.state.scene === 'other' && !room.dir.busy, null, { timeout: 60_000 })
  await act(page, 'chairs')
  await act(page, 'desk2')
  await page.evaluate(() => void room.dir.activate('page'))
  await page.locator('.transcript').waitFor()
  await expect(page.locator('.transcript')).toContainText('asks for Prado, Eusebio')
  await page.locator('.sheet .btn').click({ timeout: 30_000 })
  await page.waitForFunction(() => !room.dir.busy)
  await page.evaluate(() => void room.dir.activate('letter'))
  await page.locator('.sheet .btn').click({ timeout: 10_000 })
  // the fast clock shortens the forty-one silent seconds, so the click has to come from inside the page
  await page.evaluate(() => {
    const t = setInterval(() => {
      const b = [...document.querySelectorAll<HTMLElement>('.final .btn')][0]
      if (b) (clearInterval(t), b.click())
    }, 20)
  })
  await expect(page.locator('.end h2')).toHaveText('Kept', { timeout: 30_000 })
  await expect(page.locator('.names li.taken')).toHaveText('Prado, Eusebio')
  await expect(page.locator('.names li')).toHaveCount(41)
})

test('doing nothing at the end is an ending', async ({ page }) => {
  test.setTimeout(120_000)
  await enter(page)
  await page.evaluate(async () => {
    room.dir.state.scene = 'other'
    room.dir.state.node = 'desk'
    room.dir.state.flags.readPage = true
    await room.dir.activate('none')
  })
  await page.evaluate(() => void room.dir.activate('letter'))
  await page.locator('.sheet .btn').click({ timeout: 30_000 })
  await expect(page.locator('.end h2')).toHaveText('Deaf Point', { timeout: 60_000 })
})

test('menu pauses, opens the archive, and Escape closes it', async ({ page }) => {
  await enter(page)
  await page.getByRole('button', { name: 'Menu' }).click()
  expect(await page.evaluate(() => room.stage.paused)).toBe(true)
  await page.getByRole('button', { name: 'Archives & Credits' }).click()
  await expect(page.getByRole('heading', { name: 'Register of Deposits' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => room.stage.paused)).toBe(false)
})

test('progress is saved and can be resumed', async ({ page }) => {
  await enter(page)
  await page.reload()
  await page.getByRole('button', { name: 'Continue the record' }).click()
  await page.waitForFunction(() => room.dir?.state.scene === 'hall')
  await expect(page.locator('.spot').first()).toBeAttached()
})

test('no WebGL still gives the whole story as text', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never
  })
  const page = await ctx.newPage()
  await page.goto('/?fast')
  await expect(page.getByText('The whole story is here as text')).toBeVisible()
  await page.getByRole('button', { name: /silence/i }).click()
  await expect(page.getByRole('button', { name: 'Climb the pier' })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.textstage')).toContainText('The concrete bowl')
  await ctx.close()
})

test('the microphone reports loudness and stops cleanly', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['microphone'] })
  const page = await ctx.newPage()
  await page.goto('/?fast')
  const ok = await page.evaluate(async () => {
    const on = await room.ear.enable()
    room.ear.update()
    const fine = Number.isFinite(room.ear.level)
    room.ear.disable()
    return on && fine && room.ear.on === false
  })
  expect(ok).toBe(true)
  await ctx.close()
})

test('phone layout does not scroll sideways', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  await page.goto('/?fast')
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(over).toBeLessThanOrEqual(0)
  await expect(page.getByRole('button', { name: /sound/i })).toBeVisible()
  await ctx.close()
})
