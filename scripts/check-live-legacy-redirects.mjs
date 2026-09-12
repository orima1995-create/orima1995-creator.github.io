const root = process.env.LEGACY_SITE_ROOT;
if (!root) throw new Error('LEGACY_SITE_ROOT is required');

const site = root.endsWith('/') ? root : `${root}/`;
const destinationOrigin = 'https://vintagealarm.github.io';
const routes = [
  '/',
  '/history/',
  '/owners-notes/',
  '/history/smartwatch/',
  '/basis-alarm/',
  '/pierce-duofon/',
  '/cyma-time-o-vox/',
  '/cyma-time-o-vox/owners-note/',
  '/citizen-alarm/',
  '/westclox-watchlarm/',
  '/lab/council/'
];

const get = async (relativePath) => {
  try {
    const response = await fetch(new URL(relativePath, site), {
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'user-agent': 'VINTAGE-ALARM-legacy-migration-check/1.0' }
    });
    return { status: response.status, text: await response.text() };
  } catch {
    return { status: 0, text: '' };
  }
};

const expectedTarget = (route) => new URL(route, destinationOrigin).href;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastFailures = [];

for (let attempt = 1; attempt <= 12; attempt += 1) {
  const failures = [];

  for (const route of routes) {
    const relativePath = route === '/' ? '' : route.slice(1);
    const result = await get(relativePath);
    const target = expectedTarget(route);
    if (result.status !== 200) failures.push(`${route}: HTTP ${result.status}, expected 200`);
    if (!result.text.includes('name="robots" content="noindex,follow"')) failures.push(`${route}: noindex,follow missing`);
    if (!result.text.includes(`rel="canonical" href="${target}"`)) failures.push(`${route}: canonical does not point to ${target}`);
    if (!result.text.includes(`http-equiv="refresh" content="0;url=${target}"`)) failures.push(`${route}: meta refresh does not point to ${target}`);
    if (!result.text.includes(target) || !result.text.includes('location.search + location.hash')) failures.push(`${route}: route-preserving JS redirect missing`);
  }

  const fallback = await get('__migration-check__/unknown-route/?q=1');
  if (![404, 200].includes(fallback.status)) failures.push(`404 fallback: HTTP ${fallback.status}`);
  for (const marker of [
    'name="robots" content="noindex,follow"',
    `rel="canonical" href="${destinationOrigin}/"`,
    "path.startsWith(base + '/')",
    'location.search + location.hash'
  ]) {
    if (!fallback.text.includes(marker)) failures.push(`404 fallback: missing ${marker}`);
  }

  const [robots, sitemap] = await Promise.all([get('robots.txt'), get('sitemap.xml')]);
  if (robots.status !== 200) failures.push(`robots.txt: HTTP ${robots.status}`);
  if (!robots.text.includes(`Sitemap: ${destinationOrigin}/sitemap.xml`)) failures.push('robots.txt: canonical sitemap URL missing');
  if (sitemap.status !== 200) failures.push(`sitemap.xml: HTTP ${sitemap.status}`);
  if (sitemap.text.includes('orima1995-create.github.io')) failures.push('sitemap.xml: legacy host leaked into sitemap');
  for (const route of routes.filter((route) => !['/lab/council/', '/cyma-time-o-vox/owners-note/'].includes(route))) {
    const target = expectedTarget(route);
    if (!sitemap.text.includes(`<loc>${target}</loc>`)) failures.push(`sitemap.xml: ${target} missing`);
  }

  if (!failures.length) {
    console.log(`Legacy live redirect check: PASS — ${routes.length} explicit routes plus 404 fallback.`);
    process.exit(0);
  }

  lastFailures = failures;
  if (attempt < 12) await sleep(5000);
}

console.error('Legacy live redirect check failed:');
for (const failure of lastFailures) console.error(`- ${failure}`);
process.exit(1);
