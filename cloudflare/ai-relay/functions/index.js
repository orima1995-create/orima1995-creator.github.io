const ALLOWED_SOURCE_HOST = "vintage-alarm-analytics.orima1995.workers.dev";
const ALLOWED_SOURCE_PATH = "/api/ai-export";
const ALLOWED_SOURCE_PARAMS = new Set(["window", "expires", "sig"]);

function text(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateSource(raw) {
  if (!raw) throw new Error("Missing source URL.");
  const source = new URL(raw);
  if (source.protocol !== "https:") throw new Error("HTTPS source required.");
  if (source.hostname !== ALLOWED_SOURCE_HOST) throw new Error("Source host is not allowed.");
  if (source.pathname !== ALLOWED_SOURCE_PATH) throw new Error("Source path is not allowed.");
  for (const key of source.searchParams.keys()) {
    if (!ALLOWED_SOURCE_PARAMS.has(key)) throw new Error("Unexpected source parameter.");
  }
  if (!source.searchParams.get("window") || !source.searchParams.get("expires") || !source.searchParams.get("sig")) {
    throw new Error("Signed analytics source is incomplete.");
  }
  const expires = Number(source.searchParams.get("expires"));
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    throw new Error("Signed analytics source has expired.");
  }
  return source;
}

function table(headers, rows) {
  if (!rows.length) return "_No rows._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(text).join(" | ")} |`),
  ].join("\n");
}

function renderPages(period) {
  const rows = (period?.entryPages || period?.pages || []).slice(0, 30).map((row) => [
    row.name || row.path,
    row.path,
    number(row.visits),
    number(row.pageviews),
  ]);
  return table(["Page", "Path", "Entry visits", "PV"], rows);
}

function renderChannels(period) {
  const rows = (period?.channels || []).map((row) => [row.name, number(row.visits), number(row.pageviews)]);
  return table(["Channel", "Visits", "PV"], rows);
}

function renderExternalFlows(period) {
  const rows = (period?.externalEntryFlows || []).slice(0, 40).map((row) => [
    row.channel,
    row.sourceName || row.sourceHost || "Direct",
    row.destinationName || row.destinationPath,
    number(row.visits),
    number(row.pageviews),
    row.country || "",
    row.device || "",
  ]);
  return table(["Channel", "Source", "Destination", "Visits", "PV", "Country", "Device"], rows);
}

function renderInternalFlows(period) {
  const rows = (period?.internalFlows || []).slice(0, 40).map((row) => [
    row.sourceName || row.sourceCleanPath,
    row.destinationName || row.destinationPath,
    number(row.pageviews),
  ]);
  return table(["From", "To", "PV"], rows);
}

function renderCountries(period) {
  const rows = (period?.countries || []).slice(0, 30).map((row) => [row.name, number(row.pageviews)]);
  return table(["Country", "PV"], rows);
}

function renderDevices(period) {
  const rows = (period?.devices || []).map((row) => [row.name, number(row.pageviews)]);
  return table(["Device", "PV"], rows);
}

function renderTrend(payload) {
  const rows = (payload?.trend || []).slice(0, 60).map((row) => [
    row.bucket,
    number(row.pageviews),
    number(row.visits),
    number(row.x),
    number(row.youtube),
    number(row.instagram),
    number(row.facebook),
    number(row.search),
    number(row.direct),
    number(row.ai),
    number(row.other),
  ]);
  return table(["Bucket", "PV", "Visits", "X", "YouTube", "Instagram", "Facebook", "Search", "Direct", "AI", "Other"], rows);
}

function renderPeriod(title, period) {
  if (!period) return `## ${title}\n_No data._`;
  return [
    `## ${title}`,
    `- Visits: ${number(period.visits)}`,
    `- Page views: ${number(period.pageviews)}`,
    `- X profile entries (/x/): ${number(period.xProfileEntries)}`,
    "",
    "### Channels",
    renderChannels(period),
    "",
    "### Entry pages",
    renderPages(period),
    "",
    "### External entry flows",
    renderExternalFlows(period),
    "",
    "### Internal flows",
    renderInternalFlows(period),
    "",
    "### Country",
    renderCountries(period),
    "",
    "### Device",
    renderDevices(period),
  ].join("\n");
}

export function renderAnalyticsMarkdown(payload) {
  const combined = payload?.combined?.current || payload?.current || {};
  const lines = [
    "# VINTAGE ALARM ANALYTICS — AI READ-ONLY",
    "",
    "> Aggregate measurement data only. Do not infer causality or unique people across hosts from this document.",
    "",
    `- Generated: ${text(payload?.generatedAt)}`,
    `- Window: ${text(payload?.windowLabel || payload?.windowKey)}`,
    `- Window start: ${text(payload?.windowStart)}`,
    `- Window end: ${text(payload?.windowEnd)}`,
    `- Current host: ${text(payload?.host)}`,
    `- Primary combined visits: ${number(combined.visits)}`,
    `- Primary combined page views: ${number(combined.pageviews)}`,
    `- X profile entries (/x/): ${number(combined.xProfileEntries)}`,
  ];

  if (payload?.hostMigration) {
    lines.push("", "## Host migration", `- Date: ${text(payload.hostMigration.date)}`, `- Old host: ${text(payload.hostMigration.oldHost)}`, `- New host: ${text(payload.hostMigration.newHost)}`, `- Note: ${text(payload.hostMigration.note)}`);
  }

  lines.push(
    "",
    renderPeriod("Combined current period", payload?.combined?.current || payload?.current),
    "",
    renderPeriod(`NEW host — ${payload?.host || "current"}`, payload?.current),
    "",
    renderPeriod(`OLD host — ${payload?.legacy?.host || "legacy"}`, payload?.legacy?.current),
    "",
    "## Trend",
    renderTrend(payload?.combined || payload),
  );

  const limitations = payload?.limitations || {};
  lines.push("", "## Measurement limitations");
  for (const [key, value] of Object.entries(limitations)) {
    lines.push(`- ${text(key)}: ${text(value)}`);
  }
  if (payload?.combined?.note) lines.push(`- combined: ${text(payload.combined.note)}`);
  if (payload?.profileTracking) {
    lines.push(`- profileTracking: dedicated path ${text(payload.profileTracking.path)} identifies X-profile entry independently of referrer channel.`);
  }
  lines.push("", "_This relay only reformats the signed aggregate analytics export. It does not add conclusions or platform-local campaign metrics._");
  return lines.join("\n");
}

function responseHeaders() {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Referrer-Policy": "no-referrer",
  };
}

export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);
    const source = validateSource(requestUrl.searchParams.get("source"));
    const upstream = await fetch(source.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      return new Response(`AI analytics source failed (${upstream.status}).\n\n${detail}`, {
        status: upstream.status,
        headers: responseHeaders(),
      });
    }
    const payload = await upstream.json();
    return new Response(renderAnalyticsMarkdown(payload), { status: 200, headers: responseHeaders() });
  } catch (error) {
    return new Response(`VINTAGE ALARM AI relay\n\n${error instanceof Error ? error.message : String(error)}`, {
      status: 400,
      headers: responseHeaders(),
    });
  }
}
