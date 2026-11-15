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
  userDataDir: OUT + '/prof',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960']
})
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 900 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

try {
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await sleep(800)

  // 是否有宠物？没有就走领养（手绘，不上传照片）
  const hasCompanion = await page.evaluate(() => !!document.querySelector('.nn-stage'))
  if (!hasCompanion) {
    await page.waitForSelector('.wizard', { timeout: 8000 })
    // 第 1 步 → 第 2 步
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await page.waitForSelector('.pane .el-input__inner')
    await sleep(300)
    // 起名
    await page.type('.pane .el-input__inner', '豆豆')
    await sleep(200)
    // 第 2 步 → 第 3 步
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(400)
    // 保存（开始陪伴）
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(1500)
  }

  await page.waitForSelector('.nn-stage', { timeout: 8000 })
  await sleep(800)
  await shot('scene-grass')

  // 切换 4 个场景
  const scenes = [
    ['窗台', 'scene-window'],
    ['客厅', 'scene-living'],
    ['海边', 'scene-seaside'],
    ['星空', 'scene-night'],
    ['草地', 'scene-grass']
  ]
  for (const [name, file] of scenes) {
    await page.evaluate((n) => {
      const chip = [...document.querySelectorAll('.nn-scene-chip')].find((c) => c.textContent.includes(n))
      if (chip) chip.click()
    }, name)
    await sleep(600)
    await shot(file)
  }

  console.log('--- console 错误 ---')
  console.log(errors.length ? errors.join('\n') : '（无错误）')
} catch (e) {
  console.error('验证失败：', e.message)
} finally {
  await browser.close()
}
