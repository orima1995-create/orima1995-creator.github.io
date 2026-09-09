import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../legacy-dist/', import.meta.url));
const destinationOrigin = 'https://vintagealarm.github.io';
const legacyBasePath = '/orima1995-creator.github.io';
const routes = [
  '/',
  '/history/',
  '/owners-notes/',
  '/history/smartwatch/',
  '/basis-alarm/',
  '/pierce-duofon/',
  '/cyma-time-o-vox/',
  '/cyma-time-o-vox/owners-note/',
  '/lab/council/'
];

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function redirectHtml(route) {
  const target = new URL(route, destinationOrigin).href;
  const safeTarget = escapeHtml(target);
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,follow">
    <meta http-equiv="refresh" content="0;url=${safeTarget}">
    <link rel="canonical" href="${safeTarget}">
    <title>VINTAGE ALARM has moved</title>
    <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
  </head>
  <body>
    <p>VINTAGE ALARM moved to <a href="${safeTarget}">${safeTarget}</a>.</p>
  </body>
</html>
`;
}

function notFoundHtml() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,follow">
    <meta http-equiv="refresh" content="0;url=${destinationOrigin}/">
    <link rel="canonical" href="${destinationOrigin}/">
    <title>VINTAGE ALARM has moved</title>
    <script>
      (() => {
        const base = ${JSON.stringify(legacyBasePath)};
        let path = location.pathname;
        if (path === base) path = '/';
        else if (path.startsWith(base + '/')) path = path.slice(base.length);
        if (!path.startsWith('/')) path = '/' + path;
        location.replace(${JSON.stringify(destinationOrigin)} + path + location.search + location.hash);
      })();
    </script>
  </head>
  <body>
    <p>VINTAGE ALARM moved to <a href="${destinationOrigin}/">${destinationOrigin}/</a>.</p>
  </body>
</html>
`;
}

async function write(relativePath, contents) {
  const target = join(output, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

await rm(output, { recursive: true, force: true });
for (const route of routes) {
  const relativePath = route === '/' ? 'index.html' : join(route.slice(1), 'index.html');
  await write(relativePath, redirectHtml(route));
}
await write('404.html', notFoundHtml());
await write('.nojekyll', '');
await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${destinationOrigin}/sitemap.xml\n`);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
  .filter((route) => !['/lab/council/', '/cyma-time-o-vox/owners-note/'].includes(route))
  .map((route) => `  <url><loc>${new URL(route, destinationOrigin).href}</loc></url>`)
  .join('\n')}\n</urlset>\n`;
await write('sitemap.xml', sitemap);
await write('sitemap-vintage.xml', sitemap);
await write('googled3a96ed4c5eb9287.html', 'google-site-verification: googled3a96ed4c5eb9287.html\n');

console.log(`Built ${routes.length} redirects plus fallback in ${output}`);
