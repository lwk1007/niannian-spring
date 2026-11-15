import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene/bubble'
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

  // [1] 待机期（无任何点击）持续 12s，不应出现气泡
  console.log('[1] 待机期 12s 无点击，检查气泡是否出现…')
  let bubbleSeenDuringIdle = false
  for (let i = 0; i < 12; i++) {
    const has = await page.evaluate(() => !!document.querySelector('.nn-bubble-mini'))
    if (has) bubbleSeenDuringIdle = true
    await sleep(1000)
  }
  console.log('    待机期出现气泡 =', bubbleSeenDuringIdle, bubbleSeenDuringIdle ? '❌' : '✅')

  // [2] 点击「摸摸」按钮 → 气泡出现，且在宠物 anchor 内、位于宠物头顶
  console.log('[2] 点击「摸摸」按钮…')
  await page.click('.act') // 第一个 = 摸摸
  await sleep(600)
  const afterTap = await page.evaluate(() => {
    const b = document.querySelector('.nn-bubble-mini')
    if (!b) return { has: false }
    const anchor = document.querySelector('.nn-pet-anchor')
    const isChild = anchor.contains(b) // 气泡是 anchor 子元素（跟随锚点）
    const br = b.getBoundingClientRect()
    const petBody = document.querySelector('.nn-pet-body').getBoundingClientRect()
    const onTop = br.bottom <= petBody.top + 2 // 气泡在宠物头顶（气泡底 ≤ 宠物顶）
    const centerGap = Math.abs((br.left + br.width / 2) - (petBody.left + petBody.width / 2))
    return { has: true, text: b.textContent, isChild, onTop, centerGap: Math.round(centerGap) }
  })
  console.log('    气泡出现 =', afterTap.has, '| 文案 =', afterTap.text)
  console.log('    气泡是宠物子元素 =', afterTap.isChild, afterTap.isChild ? '✅' : '❌')
  console.log('    气泡在宠物头顶 =', afterTap.onTop, afterTap.onTop ? '✅' : '❌')
  console.log('    气泡与宠物水平中心差 =', afterTap.centerGap, 'px', afterTap.centerGap <= 4 ? '✅' : '❌')
  await page.screenshot({ path: OUT + '/tap-bubble.png' })

  // [3] 气泡显示期间拖拽宠物 → 气泡应跟随（与宠物中心保持对齐）
  console.log('[3] 气泡显示中拖拽宠物，检查气泡跟随…')
  const beforeDrag = await page.evaluate(() => {
    const b = document.querySelector('.nn-bubble-mini')
    const p = document.querySelector('.nn-pet-anchor').getBoundingClientRect()
    if (!b) return null
    const br = b.getBoundingClientRect()
    return { bubbleCx: br.left + br.width / 2, petCx: p.left + p.width / 2 }
  })
  if (beforeDrag) {
    const px = beforeDrag.petCx
    const py = (await page.evaluate(() => document.querySelector('.nn-pet-anchor').getBoundingClientRect().top + 55))
    await page.mouse.move(px, py)
    await page.mouse.down()
    await page.mouse.move(px + 80, py, { steps: 6 })
    await sleep(150)
    const duringDrag = await page.evaluate(() => {
      const b = document.querySelector('.nn-bubble-mini')
      const p = document.querySelector('.nn-pet-anchor').getBoundingClientRect()
      if (!b) return null
      const br = b.getBoundingClientRect()
      return { bubbleCx: br.left + br.width / 2, petCx: p.left + p.width / 2 }
    })
    if (duringDrag) {
      const gap = Math.abs(duringDrag.bubbleCx - duringDrag.petCx)
      console.log('    拖拽中气泡-宠物中心差 =', Math.round(gap), 'px', gap <= 6 ? '✅（气泡跟随宠物）' : '❌')
    } else {
      console.log('    拖拽中气泡消失（松手会换落地文案，属正常）⚠️')
    }
    await page.mouse.up()
    await sleep(600)
  } else {
    console.log('    气泡已超时消失，跳过跟随验证 ⚠️')
  }
  await page.screenshot({ path: OUT + '/after-drag.png' })

  console.log('\n--- console 错误 ---')
  console.log(errors.length ? errors.join('\n') : '（无错误）')
} catch (e) {
  console.error('验证失败：', e.message)
} finally {
  await browser.close()
}
