# HISTORY v13 — staging test

This is a functional test of the approved mobile composition, not production approval.

- Mobile: date/title pairing, continuous one-column story, fully visible two-column milestone index, compact two-up owner tiles with labels inside.
- Desktop: era rail, main story and owned-watch sidebar.
- Original source text/data, TOP, shared styles and OWNER'S NOTE originals remain unchanged from v12.
- Pierce thumbnail: photograph not selected. CYMA thumbnail: existing actual movement photograph used temporarily. No images generated, cropped or replaced.
- OWNER'S NOTES: 所有個体から見る。
- RESEARCH: 次に気になっているものと、そのデータ。
- All chapter navigation, source disclosure and original owner-note links are connected.

Build: `npm ci && npm run build`.
CI verification: `node scripts/check-history-v13.mjs` after installing Playwright Chromium. Checks 320, 390, 768 and 1280 pixel viewports, overflow, all 11 milestone records, tile geometry, disclosures, local resources and destinations.

The staging workflow produces a review artifact only; it does not publish GitHub Pages. Main and the production deployment workflow must not be changed without explicit user approval.
