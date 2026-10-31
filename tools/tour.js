// Paste-free walkthrough helper for screenshots: `?fast` exposes window.room. Runs up to a named beat.
window.tour = async stop => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const space = on => dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: 'Space' }))
  const auto = setInterval(() => document.querySelector('.prompt .btn')?.click(), 120)
  const go = async id => {
    const p = room.dir.activate(id)
    await sleep(150)
    space(true)
    await p
    space(false)
    await sleep(100)
  }
  const done = async name => name === stop
  for (const id of ['pier', 'hole']) await go(id)
  if (await done('wax')) return clearInterval(auto)
  room.dir.state.flags.relay = true
  await sleep(1200)
  await go('skin')
  if (await done('skin')) return clearInterval(auto)
  await go('push')
  await sleep(700)
  if (await done('s1')) return clearInterval(auto)
  for (const id of ['on1', 'on2']) await go(id)
  if (await done('s3')) return clearInterval(auto)
  await go('on3')
  if (await done('s4')) return clearInterval(auto)
  await go('on4')
  if (await done('s5')) return clearInterval(auto)
  await go('fall')
  await sleep(900)
  clearInterval(auto)
}
