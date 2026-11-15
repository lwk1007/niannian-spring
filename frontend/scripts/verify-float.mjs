import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/NIANNIAN/niannian-spring/.tmp'
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: OUT + '/prof-float',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960']
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

const visible = () =>
  page.evaluate(() => {
    const el = document.querySelector('.fp-root')
    if (!el) return { exists: false }
    const cs = getComputedStyle(el)
    return { exists: true, display: cs.display, offsetParent: !!el.offsetParent }
  })

try {
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await sleep(600)

  const cutout = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 120
    c.height = 140
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(60, 58, 8, 60, 58, 52)
    g.addColorStop(0, '#f6b26b')
    g.addColorStop(1, '#e08a3c')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(60, 60, 48, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e08a3c'
    ctx.beginPath()
    ctx.arc(28, 24, 17, 0, Math.PI * 2)
    ctx.arc(92, 24, 17, 0, Math.PI * 2)
    ctx.fill()
    return c.toDataURL('image/png')
  })

  const adopt = await page.evaluate(async (cutout) => {
    const r = await fetch('/api/pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '花花', type: 'cat', personality: 'friendly', ownerTitle: '主人', sinceDate: '2026-01-01', cutout })
    })
    return { status: r.status, body: await r.json() }
  }, cutout)
  console.log('领养:', adopt.status, 'hasCutout=', !!(adopt.body?.data?.pet?.cutout))

  await page.goto(BASE + '/app/memory', { waitUntil: 'networkidle2' })
  await sleep(900)
  let v = await visible()
  const cut = await page.evaluate(() => !!document.querySelector('.fp-root .fp-cut'))
  console.log('回忆页 .fp-root:', JSON.stringify(v), '用抠图=', cut)
  await page.screenshot({ path: OUT + '/float-memory.png' })

  const posBefore = await page.evaluate(() => localStorage.getItem('nn_fp_pos'))

  await page.goto(BASE + '/app/companion', { waitUntil: 'networkidle2' })
  await sleep(900)
  v = await visible()
  console.log('陪伴页 .fp-root:', JSON.stringify(v))

  await page.goto(BASE + '/app/memory', { waitUntil: 'networkidle2' })
  await sleep(900)
  v = await visible()
  const posAfter = await page.evaluate(() => localStorage.getItem('nn_fp_pos'))
  console.log('再回回忆页 .fp-root:', JSON.stringify(v), '位置一致=', posBefore === posAfter)

  await page.hover('.fp-root')
  await sleep(300)
  await page.click('.fp-close')
  await sleep(400)
  const orb = await page.evaluate(() => !!document.querySelector('.fp-root .fp-orb'))
  console.log('收起后出现圆球=', orb)
  await page.screenshot({ path: OUT + '/float-collapsed.png' })

  await page.click('.fp-orb')
  await sleep(400)
  v = await visible()
  console.log('展开恢复 .fp-root:', JSON.stringify(v))

  console.log('VERIFY_OK')
} catch (e) {
  console.log('VERIFY_FAIL', e.message)
  await page.screenshot({ path: OUT + '/float-fail.png' }).catch(() => {})
} finally {
  await browser.close()
}
