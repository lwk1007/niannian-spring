/**
 * 道具互动验收：喂食出食盆且食物递减、玩耍出小球且真的在动、球可拖拽。
 * 用已存在的演示身份（33b0bbe2…）直接进陪伴页，不重走领养流程。
 * 用法：node scripts/verify-props.mjs
 */
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find((p) => existsSync(p))

const BASE = process.argv[2] || 'http://127.0.0.1:8080'
const UID = '33b0bbe250b74ae9a33f8541989cc6e3'
const OUT = 'C:/Users/卯余/Desktop/NIANNIAN/lianliansite-shots'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1280,960']
})
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 900 })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.setCookie({ name: 'nn_uid', value: UID, domain: BASE.includes('localhost') ? 'localhost' : '127.0.0.1', path: '/' })
await page.goto(BASE + '/app/companion', { waitUntil: 'networkidle2' })
await page.waitForSelector('.nn-pet-anchor', { timeout: 15000 })
await sleep(600)

// ---- 喂食：食盆出现 + 食物逐块减少 ----
await page.evaluate(() =>
  [...document.querySelectorAll('.act')].find((b) => b.textContent.includes('喂食')).click()
)
await sleep(500)
const bowlOn = await page.evaluate(() => !!document.querySelector('.nn-bowl'))
const foodBefore = await page.evaluate(() => document.querySelectorAll('.nn-bowl-food').length)
await page.screenshot({ path: `${OUT}/prop-bowl.png` })
await sleep(1500)
const foodAfter = await page.evaluate(() => document.querySelectorAll('.nn-bowl-food').length)
await sleep(2600)
const bowlGone = await page.evaluate(() => !document.querySelector('.nn-bowl'))
console.log({ bowlOn, foodBefore, foodAfter, bowlGone })

// ---- 玩耍：小球出现 + 位置在变 ----
await page.evaluate(() =>
  [...document.querySelectorAll('.act')].find((b) => b.textContent.includes('玩耍')).click()
)
await sleep(200)
await page.screenshot({ path: `${OUT}/prop-ball.png` })
const p1 = await page.evaluate(() => {
  const el = document.querySelector('.nn-play-ball')
  return el ? el.style.left + '|' + el.style.bottom : null
})
await sleep(420)
const p2 = await page.evaluate(() => {
  const el = document.querySelector('.nn-play-ball')
  return el ? el.style.left + '|' + el.style.bottom : null
})
const ballMoving = !!p1 && !!p2 && p1 !== p2
console.log({ ballOn: !!p1, p1, p2, ballMoving })

// ---- 小球拖拽 ----
let ballDrag = null
if (p1) {
  const box = await page.$eval('.nn-play-ball', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.mouse.move(box.x - 120, box.y - 90, { steps: 8 })
  await sleep(120)
  const lifting = await page.evaluate(() => {
    const el = document.querySelector('.nn-play-ball')
    return { dragging: el.classList.contains('dragging'), bottom: el.style.bottom }
  })
  await page.mouse.up()
  await sleep(900)
  const after = await page.evaluate(() => document.querySelector('.nn-play-ball')?.style.bottom)
  ballDrag = { lifting, after }
  console.log({ ballDrag })
}

await page.screenshot({ path: `${OUT}/prop-final.png` })
console.log('ERRORS:', errors.length ? errors.join(' | ') : '(无)')

const pass =
  bowlOn &&
  foodBefore === 3 &&
  foodAfter < foodBefore &&
  bowlGone &&
  ballMoving &&
  (!ballDrag || ballDrag.lifting.dragging)
console.log(pass ? '道具互动通过' : '道具互动未通过')
await browser.close()
process.exit(pass ? 0 : 2)
