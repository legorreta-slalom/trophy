// Screenshot helper for progress.html — seeds demo data and captures pages.
// Usage: node scripts/progress-shots.mjs <name> <path> [seedFile] [tabText]
// Screenshots land in progress-shots/<name>.png
import puppeteer from 'puppeteer-core'
import { readFileSync, mkdirSync } from 'fs'

const [name, path, seedFile, tabText, size] = process.argv.slice(2)
const [width, height] = (size ?? '1280x860').split('x').map(Number)
const BASE = 'http://localhost:5173/trophy'

mkdirSync('progress-shots', { recursive: true })

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: 'new',
  args: [`--window-size=${width},${height}`],
})
const page = await browser.newPage()
await page.setViewport({ width, height })

if (seedFile) {
  const seed = JSON.parse(readFileSync(seedFile, 'utf8'))
  await page.evaluateOnNewDocument((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }, seed)
}

await page.goto(`${BASE}${path ?? '/'}`, { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 500))

if (tabText) {
  await page.evaluate((text) => {
    const tab = [...document.querySelectorAll('[role="tab"]')]
      .find(t => t.textContent.trim().startsWith(text))
    tab?.click()
  }, tabText)
  await new Promise(r => setTimeout(r, 500))
}

await page.screenshot({ path: `progress-shots/${name}.png` })
await browser.close()
console.log(`progress-shots/${name}.png`)
