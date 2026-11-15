/**
 * 抠图链路实测：起 vite dev → 打开 probe-cutout.html → 跑一次真实模型下载 + 推理。
 * 用法：node scripts/probe-cutout.mjs   （需先 npm run dev，或本脚本自己拉 dev server）
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find((p) => existsSync(p))

const URL_ = process.argv[2] || 'http://127.0.0.1:5173/probe-cutout.html'

if (!CHROME) {
  console.error('找不到 Chrome/Edge')
  process.exit(1)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-features=HttpsUpgrades']
})
const page = await browser.newPage()
page.setDefaultTimeout(0)
page.on('console', (m) => console.log('[page]', m.type(), m.text()))
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('response', (r) => {
  if (r.status() >= 400) console.log('[http]', r.status(), r.url().slice(0, 160))
})
page.on('requestfailed', (r) =>
  console.log('[reqfail]', (r.failure() || {}).errorText, r.url().slice(0, 160))
)

console.log('open', URL_)
await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 120000 })
await page.waitForFunction('typeof window.runProbe === "function"', { timeout: 60000 })

const t0 = Date.now()
const res = await page.evaluate(() => window.runProbe())
console.log(`elapsed ${Math.round((Date.now() - t0) / 1000)}s`)
console.log(
  JSON.stringify(
    { ok: res.ok, error: res.error, ms: res.ms, progressMax: res.progressMax, len: res.dataUrlLen, stats: res.stats },
    null,
    2
  )
)

if (res.out) {
  const dir = 'C:/Users/卯余/Desktop/NIANNIAN/lianliansite-shots'
  mkdirSync(dir, { recursive: true })
  const b64 = res.out.split(',')[1]
  writeFileSync(`${dir}/probe-cutout-result.png`, Buffer.from(b64, 'base64'))
  console.log('saved probe-cutout-result.png')
}

await browser.close()
process.exit(res.ok ? 0 : 2)
