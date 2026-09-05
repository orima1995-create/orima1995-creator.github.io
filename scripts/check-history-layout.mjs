import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist');
const base = '/orima1995-creator.github.io/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!requestPath.startsWith(base)) { res.writeHead(404).end(); return; }
    let file = path.resolve(root, requestPath.slice(base.length));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const screenshotDir = process.env.HISTORY_SCREENSHOT_DIR;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const results = [];
try {
  for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: width === 320 ? 720 : 844 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${origin}${base}history/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const bodyText = await page.locator('body').innerText();
    assert(bodyText.includes('所有個体から見る。'));
    assert(bodyText.replaceAll('\n', '').includes('次に気になっているものと、そのデータ。'));
    assert(!bodyText.includes('アラームを、腕へ。'));
    assert(!bodyText.includes('SWIPE'));
    assert.equal(await page.locator('h1').count(), 1);
    if (screenshotDir && width !== 768) await page.screenshot({ path: path.join(screenshotDir, `history-v12-cover-${width}.png`) });

    // Check every era, including the ending that previously escaped the audit.
    for (const section of await page.locator('.chronology-era, #current, #research').all()) {
      await section.scrollIntoViewIfNeeded();
      const geometry = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clippedText: [...document.querySelectorAll('h1,h2,h3,h4,.era-copy p,.milestone p,.history-current a>span')]
          .filter((el) => el.clientWidth && el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent)
      }));
      assert.equal(geometry.scrollWidth, geometry.width, `${width}: page overflow`);
      assert.deepEqual(geometry.clippedText, [], `${width}: clipped text`);
    }
    const rails = [];
    for (const section of await page.locator('[data-milestones]').all()) {
      const rail = section.locator('.milestone-list');
      const count = await rail.locator('article').count();
      const box = await rail.evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth, tileWidths: [...el.children].map((c) => c.getBoundingClientRect().width) }));
      if (width <= 760 && count > 1) {
        box.tileWidths.forEach((tile) => assert(Math.abs(tile * 2 - box.width) < 1, `${width}: not two full tiles`));
      }
      if (width > 760) assert.equal(box.scroll, box.width, `${width}: desktop hides milestones`);
      if (count > 2) {
        const controls = section.locator('.rail-controls');
        assert.equal(await controls.isVisible(), width <= 760);
        if (width <= 760) {
          const next = controls.locator('[data-direction="1"]');
          const previous = controls.locator('[data-direction="-1"]');
          assert(await previous.isDisabled());
          await next.click();
          const end = await rail.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth, visible: [...el.children].map((c) => { const r = c.getBoundingClientRect(); const p = el.getBoundingClientRect(); return { left: r.left - p.left, right: r.right - p.left }; }).filter((r) => r.right > 1 && r.left < el.clientWidth - 1) }));
          assert(Math.abs(end.left - end.max) < 1);
          assert.equal(end.visible.length, 2);
          assert(end.visible.every((r) => r.left >= -1 && r.right <= box.width + 1));
          assert(await next.isDisabled());
          await previous.click();
          assert.equal(await rail.evaluate((el) => el.scrollLeft), 0);
          await rail.focus();
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(350);
          assert((await rail.evaluate((el) => el.scrollLeft)) > 0, 'keyboard scrolling failed');
          await rail.evaluate((el) => { el.scrollLeft = 0; });
        }
      } else assert.equal(await section.locator('.rail-controls').count(), 0);
      rails.push({ count, ...box });
    }

    await page.locator('.owner-documents').scrollIntoViewIfNeeded();
    const images = await page.locator('.owner-original img').evaluateAll(async (imgs) => {
      await Promise.all(imgs.map((img) => img.decode()));
      return imgs.map((img) => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight, fit: getComputedStyle(img).objectFit }));
    });
    assert.equal(images.length, 2);
    assert.deepEqual(images.map((img) => [img.width, img.height]), [[1179, 1646], [1063, 1479]]);
    assert(images.every((img) => img.fit === 'contain'));
    if (screenshotDir && width !== 768) {
      await page.locator('[id="1950s"]').screenshot({ path: path.join(screenshotDir, `history-v12-1950s-${width}.png`) });
      await page.locator('#current').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshotDir, `history-v12-ending-${width}.png`) });
    }
    await page.locator('.history-sources summary').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'expanded sources overflow');
    await page.locator('.section-menu summary').click();
    assert(await page.locator('.section-menu-panel').isVisible());
    await page.locator('.section-menu summary').click();
    for (const link of await page.locator('.owner-document,.history-current>a').all()) {
      const href = await link.getAttribute('href');
      const response = await page.request.get(`${origin}${href}`);
      assert.equal(response.status(), 200, `broken link: ${href}`);
      const hash = new URL(href, origin).hash;
      if (hash) assert((await response.text()).includes(`id="${hash.slice(1)}"`), `missing anchor: ${href}`);
    }
    assert.deepEqual(errors, []);
    results.push({ width, rails, originalImages: images.length, errors: errors.length, result: 'PASS' });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
