import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/NIANNIAN/lianliansite-shots/e2e'
const PROFILE = OUT + '/prof'

rmSync(PROFILE, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: PROFILE,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,960']
})

const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 940 })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = async (name, full = false) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log('shot', name)
}

const clickText = async (selector, text) => {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(t))
      if (!el) return false
      el.click()
      return true
    },
    selector,
    text
  )
  if (!ok) throw new Error(`未找到「${text}」(${selector})`)
}

try {
  // ---------- 领养向导 ----------
  await page.goto(BASE + '/app', { waitUntil: 'networkidle2' })
  await page.waitForSelector('.wizard')
  await sleep(500)
  await shot('01-wizard-step1')

  await clickText('.wizard-foot .btn-primary', '下一步')
  await page.waitForSelector('.pane .el-input__inner')
  await sleep(400)
  await shot('02-wizard-step2-empty')

  // 起名 + 选种类 + 选性格
  await page.click('.pane .el-input__inner')
  await page.type('.pane .el-input__inner', '豆豆', { delay: 60 })
  await page.evaluate(() => {
    document.querySelectorAll('.chip-pick')[0].click()
    document.querySelectorAll('.persona-pick')[2].click()
  })
  await sleep(400)
  await shot('03-wizard-step2-filled')

  await clickText('.wizard-foot .btn-primary', '下一步')
  await sleep(500)
  await shot('04-wizard-step3')

  await clickText('.wizard-foot .btn-primary', '开始陪伴')
  await page.waitForSelector('.nn-pet-anchor')
  await sleep(1200)
  await shot('05-companion-new')

  // ---------- 互动 ----------
  await page.click('.act-row .act:nth-child(1)')
  await sleep(900)
  const bubble = await page.$eval('.nn-bubble-mini', (el) => el.textContent.trim())
  await shot('06-companion-bubble')
  console.log('bubble =', bubble)
  if (!bubble) throw new Error('互动后没有回应气泡')

  const stats = await page.$eval('.stat-line', (el) => el.textContent.replace(/\s+/g, ' ').trim())
  console.log('stats =', stats)
  if (!stats.includes('摸过 1 次')) throw new Error('互动计数没有累加：' + stats)

  // ---------- 亲密度 ----------
  const intimacyText = await page.$eval('.intimacy', (el) => el.textContent.replace(/\s+/g, ' ').trim())
  console.log('intimacy =', intimacyText)
  if (!/Lv\.\d/.test(intimacyText)) throw new Error('亲密度等级没有渲染：' + intimacyText)

  // ---------- 视线跟随 ----------
  const stageBox = await page.$eval('.nn-stage', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  await page.mouse.move(stageBox.x + stageBox.w * 0.1, stageBox.y + stageBox.h * 0.2)
  await sleep(340)
  const lookTransform = await page.$eval('.nn-pet-wrap', (el) => el.style.transform || '')
  console.log('look =', lookTransform)
  if (!/translate\(/.test(lookTransform)) throw new Error('宠物没有跟随光标偏移：' + lookTransform)

  // ---------- 抛投惯性 ----------
  const petBox = await page.$eval('.nn-pet-anchor', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(petBox.x, petBox.y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(petBox.x + i * 22, petBox.y - i * 16)
    await sleep(12)
  }
  await page.mouse.up()
  const flying = await page.evaluate(
    () => document.querySelector('.nn-pet-anchor')?.classList.contains('flying') ?? false
  )
  console.log('flying =', flying)
  if (!flying) throw new Error('快速甩出后没有进入抛投状态')
  await shot('06b-pet-flying')
  await sleep(2400)
  const landedBottom = await page.$eval('.nn-pet-anchor', (el) => el.style.bottom)
  console.log('landed bottom =', landedBottom)
  if (landedBottom !== '26px') throw new Error('落地后没有回到地面：' + landedBottom)

  // ---------- 各页面 ----------
  const pages = [
    ['memory', '07-memory'],
    ['letter', '08-letter'],
    ['mood', '09-mood'],
    ['tribute', '10-tribute'],
    ['capsule', '11-capsule'],
    ['profile', '12-profile']
  ]
  for (const [route, name] of pages) {
    await page.goto(`${BASE}/app/${route}`, { waitUntil: 'networkidle2' })
    await sleep(900)
    await shot(name)
  }

  // ---------- 心情保存 ----------
  await page.goto(`${BASE}/app/mood`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.mood-orb')
  await page.evaluate(() => document.querySelectorAll('.mood-orb')[1].click())
  await sleep(400)
  await page.type('.mood-note textarea', '今天看到一只很像你的猫。')
  await sleep(200)
  await clickText('.mood-note .el-button', '记下来')
  await sleep(1200)
  await shot('13-mood-saved')

  // ---------- 写信 ----------
  await page.goto(`${BASE}/app/letter`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.letter-empty, .letter-paper')
  await clickText('.panel-actions .el-button', '让它写一封')
  await page.waitForSelector('.letter-paper', { timeout: 15000 })
  await sleep(600)
  await shot('14-letter-written')

  // ---------- 生成分享 ----------
  await page.goto(`${BASE}/app/profile`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('.pet-card')
  const needShare = await page.$('.share-box')
  if (!needShare) {
    await clickText('.panel .el-button', '生成分享链接')
    await page.waitForSelector('.share-box', { timeout: 10000 })
  }
  await sleep(600)
  const shareUrl = await page.$eval('.share-url', (el) => el.textContent.trim())
  console.log('shareUrl =', shareUrl)
  await shot('15-profile-shared')

  // ---------- 修改资料（复用向导） ----------
  await clickText('.pet-card .el-button', '修改资料')
  await page.waitForSelector('.wizard')
  await sleep(400)
  await shot('15b-edit-profile')
  await clickText('.wizard-foot .btn-ghost', '取消')
  await page.waitForSelector('.pet-card', { timeout: 5000 })
  console.log('编辑资料可进入并可取消')

  // ---------- 手机视口 ----------
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
  await page.goto(`${BASE}/app/companion`, { waitUntil: 'networkidle2' })
  await sleep(1200)
  await shot('16-mobile-companion')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  console.log('mobile horizontal overflow =', overflow)
  if (overflow > 1) throw new Error('手机端出现横向溢出：' + overflow + 'px')

  await page.goto(`${BASE}/app/profile`, { waitUntil: 'networkidle2' })
  await sleep(800)
  await shot('17-mobile-profile')

  console.log('ERRORS:', errors.length ? errors.join(' | ') : '(无)')
  console.log('E2E 通过')
} finally {
  await browser.close()
}
