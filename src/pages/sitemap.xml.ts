import ownersDirectory from '../data/owners-directory.json';

const siteRoot = 'https://orima1995-create.github.io/orima1995-creator.github.io/';

const staticPaths = [
  '',
  'history/',
  'owners-notes/',
  'history/smartwatch/'
];

const watchPaths = ownersDirectory.entries
  .map((entry) => entry.href.split('#')[0].replace(/^\//, ''))
  .filter(Boolean);

const paths = [...new Set([...staticPaths, ...watchPaths])];

export const GET = () => {
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, siteRoot).href}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
