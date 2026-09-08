import { chromium } from 'playwright';

const root = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:4321/orima1995-creator.github.io/';
const routes = [
  '',
  'history/',
  'owners-notes/',
  'pierce-duofon/',
  'cyma-time-o-vox/',
  'history/smartwatch/'
];
const widths = [320, 390, 768];

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    for (const route of routes) {
      const url = new URL(route, root).href;
      await page.goto(url, { waitUntil: 'networkidle' });

      const result = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
        const clientWidth = root.clientWidth;
        const brokenImages = [...document.images]
          .filter((img) => (img.getAttribute('src') || '').trim() && img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src);

        return {
          scrollWidth,
          clientWidth,
          overflow: scrollWidth - clientWidth,
          brokenImages
        };
      });

      if (result.overflow > 1) {
        failures.push(`${width}px ${route || '/'}: horizontal overflow ${result.scrollWidth}px > ${result.clientWidth}px`);
      }
      if (result.brokenImages.length) {
        failures.push(`${width}px ${route || '/'}: broken images: ${result.brokenImages.join(', ')}`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('Layout check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Layout check passed at ${widths.join(', ')}px across ${routes.length} public pages.`);
