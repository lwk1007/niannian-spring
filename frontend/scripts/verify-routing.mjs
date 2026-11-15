import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:8080'
const OUT = 'C:/Users/卯余/Desktop/lianliansite-shots/scene/routing'
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

const ok = (name, cond) => console.log(`  ${name} =`, cond, cond ? '✅' : '❌')

try {
  // [1] 新用户直接访问 /app/ → 应被守卫重定向到 /app/onboarding（干净 URL，无 #）
  console.log('[1] 新用户访问 /app/ → 重定向到领养页')
  await page.goto(BASE + '/app/', { waitUntil: 'networkidle2' })
  await sleep(1200)
  const url1 = page.url()
  ok('URL 无 # 号', !url1.includes('#'))
  ok('重定向到 /app/onboarding', url1.includes('/app/onboarding'))
  console.log('    当前 URL =', url1)

  // [2] 走完领养 → 跳到 /app/companion
  console.log('[2] 走完领养流程 → 跳到陪伴页')
  await page.waitForSelector('.wizard', { timeout: 8000 })
  await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click()) // 照片→起名
  await page.waitForSelector('.pane .el-input__inner')
  await sleep(300)
  await page.type('.pane .el-input__inner', '豆豆')
  await sleep(200)
  await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click()) // 起名→保存方式
  await sleep(400)
  await page.evaluate(() => document.querySelector('.wizard-foot .btn-primary')?.click()) // 保存
  await sleep(1600)
  const url2 = page.url()
  ok('跳到 /app/companion', url2.includes('/app/companion'))
  ok('URL 无 # 号', !url2.includes('#'))
  console.log('    当前 URL =', url2)

  // [3] 点「一封信」tab → 干净 URL /app/letter
  console.log('[3] 点 tab 切换 → history 干净 URL')
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tabbar .tab')]
    const t = tabs.find((el) => el.textContent.includes('一封信'))
    if (t) t.click()
  })
  await sleep(800)
  const url3 = page.url()
  ok('切到 /app/letter', url3.includes('/app/letter'))
  ok('URL 无 # 号', !url3.includes('#'))
  console.log('    当前 URL =', url3)

  // [4] 直接刷新 /app/letter 不应 404（history 路由后端转发）
  console.log('[4] 刷新 /app/letter 不 404')
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1000)
  ok('刷新后仍在 /app/letter', page.url().includes('/app/letter'))
  ok('页面还有内容（非 404）', !!(await page.$('.letter') || await page.$('.panel') || await page.$('.nn-stage')))

  // [5] 修改资料 → /app/onboarding?edit=1
  console.log('[5] 修改资料 → /app/onboarding?edit=1')
  await page.goto(BASE + '/app/profile', { waitUntil: 'networkidle2' })
  await sleep(1000)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((el) => el.textContent.includes('修改资料'))
    if (b) b.click()
  })
  await sleep(800)
  const url5 = page.url()
  ok('进入编辑路由', url5.includes('/app/onboarding') && url5.includes('edit=1'))
  console.log('    当前 URL =', url5)

  console.log('\n--- console 错误 ---')
  console.log(errors.length ? errors.join('\n') : '（无错误）')
} catch (e) {
  console.error('验证失败：', e.message)
} finally {
  await browser.close()
}
