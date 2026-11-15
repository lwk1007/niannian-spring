import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene/interact'
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

  // 领养（如果没有宠物）
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

  // 1. 待机动作：等待第一次待机动作出现（3-8 秒调度）
  console.log('[1] 等待待机动作…')
  const idleCls = await page.waitForFunction(
    () => {
      const b = document.querySelector('.nn-pet-body')
      return b && /anim-(blink|look|tilt|nod|groom|yawn|stretch|nap)/.test(b.className)
    },
    { timeout: 12000 }
  ).then(() => page.$eval('.nn-pet-body', (el) => el.className))
  console.log('    待机动作类 =', idleCls, '✅')
  await page.screenshot({ path: OUT + '/idle.png' })

  // 2. 点击：点击宠物本体 → 触发摸摸（anim-touch）
  console.log('[2] 点击宠物…')
  await page.click('.nn-pet-anchor')
  const touched = await page.waitForFunction(
    () => /anim-touch/.test(document.querySelector('.nn-pet-body')?.className || ''),
    { timeout: 3000 }
  ).then(() => true).catch(() => false)
  console.log('    点击触发 anim-touch =', touched, touched ? '✅' : '❌')
  await page.screenshot({ path: OUT + '/tap.png' })

  // 3. 拖拽：按住移动 > 阈值，松手后位置应改变
  console.log('[3] 拖拽宠物…')
  const before = await page.$eval('.nn-pet-anchor', (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  const cx = before.left + before.width / 2
  const cy = before.top + before.height / 2
  const leftBefore = await page.$eval('.nn-pet-anchor', (el) => el.style.left)
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 90, cy - 50, { steps: 8 })
  await sleep(150)
  const draggingNow = await page.$eval('.nn-pet-anchor', (el) => el.classList.contains('dragging'))
  const bottomDuring = await page.$eval('.nn-pet-anchor', (el) => el.style.bottom)
  await page.screenshot({ path: OUT + '/drag-lift.png' })
  await page.mouse.up()
  await sleep(700)
  const leftAfter = await page.$eval('.nn-pet-anchor', (el) => el.style.left)
  const bottomAfter = await page.$eval('.nn-pet-anchor', (el) => el.style.bottom)
  const saved = await page.evaluate(() => localStorage.getItem('nn_petpos_grass'))
  console.log('    拖拽中 dragging 态 =', draggingNow, '| bottom =', bottomDuring)
  console.log('    left 变化 =', leftBefore, '->', leftAfter, leftBefore !== leftAfter ? '✅' : '❌')
  console.log('    bottom 回落 =', bottomDuring, '->', bottomAfter, bottomAfter === '26px' ? '✅' : '❌')
  console.log('    localStorage 记忆 =', saved)
  await page.screenshot({ path: OUT + '/drag.png' })

  // 4. 拖拽后待机应恢复（等待新待机动作）
  console.log('[4] 拖拽后待机恢复…')
  const idle2 = await page.waitForFunction(
    () => /anim-(blink|look|tilt|nod|groom|yawn|stretch|nap)/.test(document.querySelector('.nn-pet-body')?.className || ''),
    { timeout: 12000 }
  ).then(() => true).catch(() => false)
  console.log('    拖拽后待机恢复 =', idle2, idle2 ? '✅' : '❌')

  console.log('\n--- console 错误 ---')
  console.log(errors.length ? errors.join('\n') : '（无错误）')
} catch (e) {
  console.error('验证失败：', e.message)
} finally {
  await browser.close()
}
