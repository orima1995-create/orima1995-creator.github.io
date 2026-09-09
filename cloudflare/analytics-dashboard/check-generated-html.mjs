import vm from "node:vm";
import worker from "./worker.js";

const password = "ci-test-password";
const auth = Buffer.from(`admin:${password}`).toString("base64");
const response = await worker.fetch(
  new Request("https://dashboard.test/", {
    headers: { Authorization: `Basic ${auth}` },
  }),
  { DASHBOARD_PASSWORD: password },
);

if (!response.ok) {
  throw new Error(`Dashboard HTML request failed: HTTP ${response.status}`);
}

const html = await response.text();
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((script) => script.trim());

if (!scripts.length) {
  throw new Error("No inline dashboard script found in generated HTML.");
}

scripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `dashboard-inline-${index + 1}.js` });
  } catch (error) {
    console.error(`Generated dashboard script ${index + 1} is invalid.`);
    throw error;
  }
});

const dashboardScript = scripts.join("\n");
const requiredFragments = [
  "/^\\d{4}-\\d{2}-\\d{2}$/",
  "/\\s+/g",
  "/[\\s_\\-（）()％%]/g",
  "/^\\uFEFF/",
  'ch==="\\n"',
  'ch!=="\\r"',
];

for (const fragment of requiredFragments) {
  if (!dashboardScript.includes(fragment)) {
    throw new Error(`Generated dashboard script lost required escape sequence: ${fragment}`);
  }
}

const contentIndex = html.indexOf('<div id="content"></div>');
const discoveryIndex = html.indexOf('<div id="discovery"></div>');
if (contentIndex < 0 || discoveryIndex < 0 || contentIndex > discoveryIndex) {
  throw new Error("Analytics content must render before discovery tools.");
}

const requiredLayoutFragments = [
  'class="card primary-chart"',
  'class="card summary-chart"',
  'class="card drawer campaign"',
  'class="card drawer raw"',
  'class="discovery-shell"',
  '["Basis Alarm","Pierce Duofon","Cyma Time-O-Vox"]',
  '{name:"Basis Alarm",path:"/basis-alarm/"}',
];

for (const fragment of requiredLayoutFragments) {
  if (!html.includes(fragment)) {
    throw new Error(`Generated dashboard HTML lost required layout fragment: ${fragment}`);
  }
}

console.log(`Generated dashboard JavaScript OK (${scripts.length} inline script(s)).`);
