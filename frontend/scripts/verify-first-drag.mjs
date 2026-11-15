import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene/firstdrag'
rmSync(OUT + '/prof', { recursive: true, force: true })
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

try {
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await sleep(800)

  // 领养（干净 profile，无宠物）
  const hasCompanion = await page.evaluate(() => !!document.querySelector('.nn-stage'))
  if (!hasCompanion) {
    await page.waitForSelector('.wizard', { timeout: 8000 })
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await page.waitForSelector('.pane .el-input__inner')
    await sleep(300)
    await page.type('.pane .el-input__inner', '豆豆')
    await sleep(200)
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(400)
    await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click())
    await sleep(1500)
  }

  await page.waitForSelector('.nn-pet-anchor', { timeout: 8000 })

  // 关键：宠物上的【首次交互】就是直接按住拖，不先点
  console.log('[1] 首次交互即拖拽（不先点击）…')
  const before = await page.$eval('.nn-pet-anchor', (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  const cx = before.left + before.width / 2
  const cy = before.top + before.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy - 40, { steps: 6 })
  await sleep(150)
  const dragging = await page.$eval('.nn-pet-anchor', (el) => el.classList.contains('dragging'))
  const leftDuring = await page.$eval('.nn-pet-anchor', (el) => el.style.left)
  console.log('    首次按住直接拖 → dragging =', dragging, dragging ? '✅' : '❌')
  console.log('    拖拽中 left =', leftDuring)
  await page.mouse.up()
  await sleep(700)
  const bottomAfter = await page.$eval('.nn-pet-anchor', (el) => el.style.bottom)
  const leftAfter = await page.$eval('.nn-pet-anchor', (el) => el.style.left)
  console.log('    松手 left =', leftAfter, '| bottom =', bottomAfter, bottomAfter === '26px' ? '✅' : '❌')

  // 第二次直接拖（连续拖，验证不是"必须点一次"）
  console.log('[2] 第二次直接拖（连续，无需点）…')
  const b2 = await page.$eval('.nn-pet-anchor', (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  const cx2 = b2.left + b2.width / 2
  const cy2 = b2.top + b2.height / 2
  await page.mouse.move(cx2, cy2)
  await page.mouse.down()
  await page.mouse.move(cx2 - 70, cy2 - 30, { steps: 6 })
  await sleep(150)
  const dragging2 = await page.$eval('.nn-pet-anchor', (el) => el.classList.contains('dragging'))
  console.log('    第二次直接拖 → dragging =', dragging2, dragging2 ? '✅' : '❌')
  await page.mouse.up()
  await sleep(500)

  console.log('\n--- console 错误 ---')
  console.log(errors.length ? errors.join('\n') : '（无错误）')
} catch (e) {
  console.error('验证失败：', e.message)
} finally {
  await browser.close()
}
