import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene/ghost'
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: OUT + '/prof',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960']
})
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 900 })

try {
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await sleep(800)

  // 领养（如果没有）
  const hasStage = await page.evaluate(() => !!document.querySelector('.nn-stage'))
  if (!hasStage) {
    await page.waitForSelector('.wizard', { timeout: 8000 })
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await page.waitForSelector('.pane .el-input__inner')
    await page.type('.pane .el-input__inner', '花花')
    await sleep(200)
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(400)
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(1500)
  }

  // 写入一张带明显主体的抠图贴纸（img），模拟真实照片拖拽
  const cutout = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 120
    c.height = 140
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(60, 60, 10, 60, 60, 55)
    g.addColorStop(0, '#f4a261')
    g.addColorStop(1, '#e07b39')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(60, 62, 50, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e07b39'
    ctx.beginPath()
    ctx.arc(30, 24, 18, 0, Math.PI * 2)
    ctx.arc(90, 24, 18, 0, Math.PI * 2)
    ctx.fill()
    return c.toDataURL('image/png')
  })
  await page.evaluate(async (cut) => {
    await fetch('/api/pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '花花', type: 'cat', personality: 'friendly', ownerTitle: '主人', sinceDate: '2026-01-01', storageMode: 'persistent', cutout: cut })
    })
  }, cutout)
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1200)

  await page.waitForSelector('.nn-pet-cut', { timeout: 8000 })

  // 检查 img 的 draggable 属性
  const draggable = await page.$eval('.nn-pet-cut', (el) => el.getAttribute('draggable'))
  console.log('img draggable 属性 =', draggable)

  // 监听 dragstart 是否被触发（被正确阻止时应为 0）
  await page.evaluate(() => {
    window.__dragCount = 0
    document.addEventListener('dragstart', () => { window.__dragCount++ }, true)
  })

  // 拖拽到一半（按住不松）
  const box = await page.$eval('.nn-pet-anchor', (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  const cx = box.left + box.width / 2
  const cy = box.top + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 100, cy - 60, { steps: 10 })
  await sleep(250)
  await page.screenshot({ path: OUT + '/drag-ghost-check.png' })

  const dragCount = await page.evaluate(() => window.__dragCount)
  console.log('dragstart 触发次数 =', dragCount, dragCount === 0 ? '✅(无原生拖拽)' : '❌(仍有原生拖拽)')

  await page.mouse.up()
  await sleep(300)

  console.log('done')
} catch (e) {
  console.error('失败：', e.message)
} finally {
  await browser.close()
}
