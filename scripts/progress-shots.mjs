// Screenshot helper for progress.html — seeds demo data and captures pages.
// Usage: node scripts/progress-shots.mjs <name> <path> [seedFile]
// Screenshots land in progress-shots/<name>.png
import puppeteer from 'puppeteer-core'
import { readFileSync, mkdirSync } from 'fs'

const [name, path, seedFile] = process.argv.slice(2)
const BASE = 'http://localhost:5173/trophy'

mkdirSync('progress-shots', { recursive: true })

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: 'new',
  args: ['--window-size=1280,860'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 860 })

if (seedFile) {
  const seed = JSON.parse(readFileSync(seedFile, 'utf8'))
  await page.evaluateOnNewDocument((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }, seed)
}

await page.goto(`${BASE}${path ?? '/'}`, { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 600))
await page.screenshot({ path: `progress-shots/${name}.png` })
await browser.close()
console.log(`progress-shots/${name}.png`)
