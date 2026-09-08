import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4321/orima1995-creator.github.io/';
const outDir = process.env.VISUAL_AUDIT_DIR || 'visual-audit';
const routes = [
  ['home', ''],
  ['history', 'history/'],
  ['owners-notes', 'owners-notes/'],
  ['pierce-duofon', 'pierce-duofon/'],
  ['cyma-time-o-vox', 'cyma-time-o-vox/'],
  ['smartwatch', 'history/smartwatch/']
];
const focusCaptures = [
  ['history-1950s', 'history/#1950s', '[id="1950s"]'],
  ['history-1960s', 'history/#1960s', '[id="1960s"]']
];

const viewports = [
  ['mobile-390', { width: 390, height: 844 }],
  ['desktop-1440', { width: 1440, height: 1200 }]
];

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [viewportName, viewport] of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const [name, route] of routes) {
      const url = new URL(route, root).href;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.evaluate(() => {
        for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
      });
      await page.waitForFunction(() => [...document.images]
        .filter((img) => (img.getAttribute('src') || '').trim())
        .every((img) => img.complete), null, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        document.documentElement.classList.add('visual-audit-ready');
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: path.join(outDir, `${viewportName}__${name}.png`),
        fullPage: true
      });
    }

    for (const [name, route, selector] of focusCaptures) {
      const url = new URL(route, root).href;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.evaluate(() => {
        for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
      });
      await page.waitForFunction(() => [...document.images]
        .filter((img) => (img.getAttribute('src') || '').trim())
        .every((img) => img.complete), null, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
      await page.waitForTimeout(250);
      const target = page.locator(selector);
      await target.scrollIntoViewIfNeeded();
      await target.screenshot({
        path: path.join(outDir, `${viewportName}__focus__${name}.png`)
      });

      if (name === 'history-1950s') {
        const fitDebug = await target.locator('img[data-smart-watch-fit]').evaluateAll((images) =>
          images.map((img) => ({
            alt: img.alt,
            state: img.dataset.smartFitState || null,
            transform: img.style.transform || null,
            bounds: img.dataset.smartFitBounds || null,
            safetyBounds: img.dataset.smartFitSafetyBounds || null,
            target: img.dataset.smartFitTarget || null,
            max: img.dataset.smartFitMax || null,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            boxWidth: img.parentElement?.clientWidth || null,
            boxHeight: img.parentElement?.clientHeight || null
          }))
        );
        await fs.writeFile(
          path.join(outDir, `${viewportName}__focus__history-1950s-fit.json`),
          JSON.stringify(fitDebug, null, 2)
        );
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Visual audit screenshots saved to ${outDir}`);
