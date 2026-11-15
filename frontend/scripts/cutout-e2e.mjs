import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene'
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: OUT + '/prof-cut',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960']
})
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 900 })

try {
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await sleep(800)

  // 没有宠物就领养（手绘）
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

  // 在页面内用 canvas 生成一张「透明底橙色圆」的抠图贴纸，模拟真实抠图结果
  const cutout = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 120
    c.height = 140
    const ctx = c.getContext('2d')
    // 透明背景 + 橙色圆形主体（模拟宠物）
    const g = ctx.createRadialGradient(60, 60, 10, 60, 60, 55)
    g.addColorStop(0, '#f4a261')
    g.addColorStop(1, '#e07b39')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(60, 62, 50, 0, Math.PI * 2)
    ctx.fill()
    // 两只小耳朵
    ctx.fillStyle = '#e07b39'
    ctx.beginPath()
    ctx.arc(30, 24, 18, 0, Math.PI * 2)
    ctx.arc(90, 24, 18, 0, Math.PI * 2)
    ctx.fill()
    return c.toDataURL('image/png')
  })

  // 通过 API 把抠图贴纸写进宠物
  const postRes = await page.evaluate(async (cut) => {
    const r = await fetch('/api/pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '花花', type: 'cat', personality: 'friendly', ownerTitle: '主人', sinceDate: '2026-01-01', storageMode: 'persistent', cutout: cut })
    })
    const b = await r.json()
    return { status: r.status, hasCutout: !!(b.data && b.data.pet && b.data.pet.cutout) }
  }, cutout)
  console.log('POST /api/pet 更新 ->', JSON.stringify(postRes))

  // 强制整页重载（hash 路由 goto 不触发完整 loadMe），回到陪伴页看贴纸
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1200)
  const state = await page.evaluate(async () => {
    const me = await (await fetch('/api/me')).json()
    return {
      hasStage: !!document.querySelector('.nn-stage'),
      cutImg: !!document.querySelector('.nn-pet-cut'),
      generic: !!document.querySelector('.nn-pet-generic'),
      photoImg: !!document.querySelector('.nn-pet-img'),
      apiCutoutLen: me.data?.pet?.cutout?.length || 0,
      apiName: me.data?.pet?.name
    }
  })
  console.log('陪伴页元素 ->', JSON.stringify(state))
  await page.screenshot({ path: `${OUT}/cutout-sticker.png` })

  // 切到海边场景，看贴纸站在不同场景里
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('.nn-scene-chip')].find((c) => c.textContent.includes('海边'))
    if (chip) chip.click()
  })
  await sleep(600)
  await page.screenshot({ path: `${OUT}/cutout-seaside.png` })

  console.log('done')
} catch (e) {
  console.error('失败：', e.message)
} finally {
  await browser.close()
}
