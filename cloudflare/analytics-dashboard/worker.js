const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const DEFAULT_HOST = "orima1995-create.github.io";
const BASE_PATH = "/orima1995-creator.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Read-only export uses a short-lived signed URL so ChatGPT/web tools can
    // fetch aggregate analytics without receiving the dashboard password.
    if (url.pathname === "/api/ai-export") {
      return aiExportResponse(request, url, env);
    }

    const auth = requireBasicAuth(request, env);
    if (auth) return auth;

    if (url.pathname === "/api/analytics") {
      return analyticsResponse(url, env);
    }

    if (url.pathname === "/api/ai-share-link") {
      return aiShareLinkResponse(request, url, env);
    }

    if (url.pathname === "/api/x-preview") {
      return xPreviewResponse(url);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return htmlResponse(DASHBOARD_HTML);
    }

    return new Response("Not found", { status: 404 });
  },
};

function requireBasicAuth(request, env) {
  if (!env.DASHBOARD_PASSWORD) {
    return new Response("DASHBOARD_PASSWORD is not configured.", { status: 503 });
  }

  const expectedUser = "admin";
  const header = request.headers.get("Authorization") || "";

  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const splitAt = decoded.indexOf(":");
      const user = decoded.slice(0, splitAt);
      const password = decoded.slice(splitAt + 1);
      if (user === expectedUser && password === env.DASHBOARD_PASSWORD) return null;
    } catch {}
  }

  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="VINTAGE ALARM ANALYTICS", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

async function xPreviewResponse(url) {
  try {
    const raw = url.searchParams.get("url") || "";
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(host)) {
      throw new Error("X post URL only.");
    }

    const match = parsed.pathname.match(/^\/([^/]+)\/status\/(\d{1,19})/);
    if (!match) throw new Error("Post URL format could not be recognized.");

    const postId = match[2];
    const canonicalUrl = `https://x.com/${match[1]}/status/${postId}`;
    const endpoint = new URL("https://publish.x.com/oembed");
    endpoint.searchParams.set("url", canonicalUrl);
    endpoint.searchParams.set("omit_script", "true");
    endpoint.searchParams.set("dnt", "true");
    endpoint.searchParams.set("lang", "ja");

    const response = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`X oEmbed HTTP ${response.status}`);

    const data = await response.json();
    const text = extractPostText(data.html || "");

    return jsonResponse({
      url: canonicalUrl,
      postId,
      authorName: data.author_name || "",
      authorUrl: data.author_url || "",
      text,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
}

function extractPostText(html) {
  const match = String(html).match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) return "";
  return decodeHtmlText(
    match[1]
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

function decodeHtmlText(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const AI_EXPORT_MAX_TTL_SECONDS = 7 * 24 * 60 * 60;
const AI_EXPORT_MIN_TTL_SECONDS = 5 * 60;

async function aiShareLinkResponse(request, url, env) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "GET only." }, 405);
  }

  try {
    requireEnv(env, "DASHBOARD_PASSWORD");

    const windowSpec = normalizeWindow(url.searchParams.get("window"));
    const requestedTtl = Number(url.searchParams.get("ttl") || 24 * 60 * 60);
    const ttlSeconds = Math.min(
      AI_EXPORT_MAX_TTL_SECONDS,
      Math.max(
        AI_EXPORT_MIN_TTL_SECONDS,
        Number.isFinite(requestedTtl) ? Math.floor(requestedTtl) : 24 * 60 * 60,
      ),
    );
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = await signAiExport(
      env.DASHBOARD_PASSWORD,
      windowSpec.key,
      expires,
    );

    const shareUrl = new URL("/api/ai-export", url.origin);
    shareUrl.searchParams.set("window", windowSpec.key);
    shareUrl.searchParams.set("expires", String(expires));
    shareUrl.searchParams.set("sig", signature);

    return jsonResponse({
      url: shareUrl.toString(),
      windowKey: windowSpec.key,
      expiresAt: new Date(expires * 1000).toISOString(),
      ttlSeconds,
      scope: "aggregate analytics read-only",
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

async function aiExportResponse(request, url, env) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "GET only." }, 405);
  }

  try {
    requireEnv(env, "DASHBOARD_PASSWORD");

    const windowSpec = normalizeWindow(url.searchParams.get("window"));
    const expires = Number(url.searchParams.get("expires"));
    const signature = String(url.searchParams.get("sig") || "");

    if (!Number.isInteger(expires) || !signature) {
      return jsonResponse({ error: "Signed export URL required." }, 401);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (expires <= nowSeconds) {
      return jsonResponse({ error: "Signed export URL expired." }, 410);
    }
    if (expires - nowSeconds > AI_EXPORT_MAX_TTL_SECONDS) {
      return jsonResponse({ error: "Signed export URL exceeds maximum TTL." }, 401);
    }

    const expected = await signAiExport(
      env.DASHBOARD_PASSWORD,
      windowSpec.key,
      expires,
    );
    if (!timingSafeHexEqual(signature, expected)) {
      return jsonResponse({ error: "Invalid export signature." }, 401);
    }

    const response = await analyticsResponse(url, env);
    const payload = await response.json();
    if (!response.ok) return jsonResponse(payload, response.status);

    return jsonResponse({
      schemaVersion: "vintage-alarm-ai-export-v1",
      generatedAt: payload.generatedAt,
      windowKey: payload.windowKey,
      windowLabel: payload.windowLabel,
      windowStart: payload.windowStart,
      windowEnd: payload.windowEnd,
      host: payload.host,
      current: aiExportPeriod(payload.current),
      previous: aiExportPeriod(payload.previous),
      trend: payload.trend,
      trendBucket: payload.trendBucket,
      trendWarning: payload.trendWarning,
      limitations: {
        searchConsole:
          "Not included: Search Console / Google AI snapshots currently live only in dashboard browser localStorage.",
        privacy:
          "Aggregate Cloudflare Web Analytics only; no IP addresses, cookies, or raw user-agent strings are exported.",
        attribution:
          "X/SNS referrer paths can help diagnosis but do not guarantee post-level attribution.",
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

function aiExportPeriod(period) {
  const flows = Array.isArray(period?.flows) ? period.flows : [];
  return {
    pageviews: period?.pageviews || 0,
    visits: period?.visits || 0,
    pages: period?.pages || [],
    entryPages: [...(period?.pages || [])]
      .filter((page) => (page?.visits || 0) > 0)
      .sort((a, b) => (b.visits - a.visits) || (b.pageviews - a.pageviews)),
    channels: period?.channels || [],
    referrers: period?.referrers || [],
    externalEntryFlows: flows.filter(
      (flow) => flow.channel !== "Internal Navigation" && (flow.visits || 0) > 0,
    ),
    internalFlows: flows.filter(
      (flow) => flow.channel === "Internal Navigation" && (flow.pageviews || 0) > 0,
    ),
    snsEntries: period?.snsEntries || { pages: [], total: 0, complete: false },
    countries: period?.countries || [],
    devices: period?.devices || [],
  };
}

async function signAiExport(secret, windowKey, expires) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = new TextEncoder().encode(
    "vintage-alarm-ai-export:" + windowKey + ":" + expires,
  );
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeHexEqual(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function analyticsResponse(url, env) {
  try {
    requireEnv(env, "CF_API_TOKEN");
    requireEnv(env, "CF_ACCOUNT_ID");

    const windowSpec = normalizeWindow(url.searchParams.get("window"));
    const now = new Date();
    const currentStart = new Date(now.getTime() - windowSpec.ms);
    const previousStart = new Date(now.getTime() - windowSpec.ms * 2);
    const host = env.REQUEST_HOST || DEFAULT_HOST;

    const [current, previous, trendResult] = await Promise.all([
      fetchPeriod(env, host, currentStart, now),
      fetchPeriod(env, host, previousStart, currentStart),
      fetchTrend(env, host, currentStart, now, windowSpec),
    ]);

    const payload = {
      generatedAt: now.toISOString(),
      windowKey: windowSpec.key,
      windowLabel: windowSpec.label,
      windowStart: currentStart.toISOString(),
      windowEnd: now.toISOString(),
      host,
      current: normalizePeriod(current),
      previous: normalizePeriod(previous),
      trend: trendResult.points,
      trendBucket: trendResult.bucketField,
      trendWarning: trendResult.warning || null,
    };

    return jsonResponse(payload);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

function requireEnv(env, key) {
  if (!env[key]) throw new Error(`${key} is not configured.`);
}

function normalizeWindow(value) {
  const windows = {
    "1h": {
      key: "1h",
      label: "直近1時間",
      ms: 60 * 60 * 1000,
      bucketCandidates: ["datetimeFiveMinutes", "datetimeFifteenMinutes", "datetimeHour"],
    },
    "3h": {
      key: "3h",
      label: "直近3時間",
      ms: 3 * 60 * 60 * 1000,
      bucketCandidates: ["datetimeFifteenMinutes", "datetimeFiveMinutes", "datetimeHour"],
    },
    "24h": {
      key: "24h",
      label: "直近24時間",
      ms: 24 * 60 * 60 * 1000,
      bucketCandidates: ["datetimeHour", "datetimeFifteenMinutes"],
    },
    "7d": {
      key: "7d",
      label: "直近7日",
      ms: 7 * 24 * 60 * 60 * 1000,
      bucketCandidates: ["date", "datetimeHour"],
    },
    "30d": {
      key: "30d",
      label: "直近30日",
      ms: 30 * 24 * 60 * 60 * 1000,
      bucketCandidates: ["date", "datetimeHour"],
    },
  };
  return windows[value] || windows["7d"];
}

async function fetchPeriod(env, host, start, end) {
  const query = `
query VintageAlarmAnalytics(
  $accountTag: string!
  $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      total: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1) {
        count
        sum { visits }
      }
      pages: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 100
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      referers: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 100
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { refererHost refererPath }
      }
      flows: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 200
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath refererHost refererPath countryName deviceType }
      }
      entries: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 1000
        orderBy: [count_DESC]
      ) {
        sum { visits }
        dimensions { requestPath refererHost }
      }
      countries: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 100
        orderBy: [count_DESC]
      ) {
        count
        dimensions { countryName }
      }
      devices: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 30
        orderBy: [count_DESC]
      ) {
        count
        dimensions { deviceType }
      }
    }
  }
}
`;

  return cloudflareGraphQL(env, query, {
    accountTag: env.CF_ACCOUNT_ID,
    filter: {
      AND: [
        {
          datetime_geq: start.toISOString(),
          datetime_leq: end.toISOString(),
        },
        { requestHost: host },
        { bot: 0 },
      ],
    },
  });
}

async function fetchTrend(env, host, start, end, windowSpec) {
  let lastError = null;

  for (const bucketField of windowSpec.bucketCandidates) {
    const orderBy = bucketField + "_ASC";
    const query = `
query VintageAlarmTrend(
  $accountTag: string!
  $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      totals: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 2000
        orderBy: [${orderBy}]
      ) {
        count
        sum { visits }
        dimensions { bucket: ${bucketField} }
      }
      acquisition: rumPageloadEventsAdaptiveGroups(
        filter: $filter
        limit: 5000
        orderBy: [${orderBy}]
      ) {
        count
        sum { visits }
        dimensions { bucket: ${bucketField} refererHost }
      }
    }
  }
}
`;

    try {
      const data = await cloudflareGraphQL(env, query, {
        accountTag: env.CF_ACCOUNT_ID,
        filter: {
          AND: [
            {
              datetime_geq: start.toISOString(),
              datetime_leq: end.toISOString(),
            },
            { requestHost: host },
            { bot: 0 },
          ],
        },
      });

      return {
        bucketField,
        points: normalizeTrend(data),
        warning: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    bucketField: null,
    points: [],
    warning: lastError instanceof Error ? lastError.message : "Trend data unavailable.",
  };
}

function normalizeTrend(data) {
  const account = data?.viewer?.accounts?.[0] || {};
  const points = new Map();

  const ensure = (bucket) => {
    const key = String(bucket || "");
    if (!points.has(key)) {
      points.set(key, {
        bucket: key,
        pageviews: 0,
        visits: 0,
        x: 0,
        instagram: 0,
        facebook: 0,
        otherSns: 0,
        search: 0,
        direct: 0,
        ai: 0,
        other: 0,
      });
    }
    return points.get(key);
  };

  for (const row of account.totals || []) {
    const point = ensure(row?.dimensions?.bucket);
    point.pageviews += row?.count || 0;
    point.visits += row?.sum?.visits || 0;
  }

  for (const row of account.acquisition || []) {
    const point = ensure(row?.dimensions?.bucket);
    const channel = classifyReferrer(row?.dimensions?.refererHost || "");
    const visits = row?.sum?.visits || 0;

    if (channel === "X") point.x += visits;
    else if (channel === "Instagram") point.instagram += visits;
    else if (channel === "Facebook") point.facebook += visits;
    else if (channel === "Other SNS") point.otherSns += visits;
    else if (channel === "Organic Search") point.search += visits;
    else if (channel === "Direct / Unknown") point.direct += visits;
    else if (channel === "AI Assistant") point.ai += visits;
    else if (channel === "Other Referral") point.other += visits;
  }

  return [...points.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

async function cloudflareGraphQL(env, query, variables) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare GraphQL HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join(" / "));
  }
  if (!payload.data) throw new Error("Cloudflare GraphQL returned no data.");

  return payload.data;
}

function normalizePeriod(data) {
  const account = data?.viewer?.accounts?.[0] || {};
  const total = account.total?.[0] || { count: 0, sum: { visits: 0 } };

  const pages = (account.pages || []).map((row) => {
    const meta = pageMeta(row?.dimensions?.requestPath || "/");
    return {
      path: meta.path,
      name: meta.name,
      mapped: meta.mapped,
      pageviews: row?.count || 0,
      visits: row?.sum?.visits || 0,
    };
  });

  const rawReferers = (account.referers || []).map((row) => ({
    host: row?.dimensions?.refererHost || "",
    path: row?.dimensions?.refererPath || "",
    pageviews: row?.count || 0,
    visits: row?.sum?.visits || 0,
  }));

  const rawFlows = (account.flows || []).map((row) => ({
    requestPath: row?.dimensions?.requestPath || "/",
    refererHost: row?.dimensions?.refererHost || "",
    refererPath: row?.dimensions?.refererPath || "",
    country: row?.dimensions?.countryName || "Unknown",
    device: row?.dimensions?.deviceType || "Unknown",
    pageviews: row?.count || 0,
    visits: row?.sum?.visits || 0,
  }));

  return {
    pageviews: total.count || 0,
    visits: total.sum?.visits || 0,
    pages,
    referrers: rawReferers,
    flows: buildFlows(rawFlows),
    channels: buildChannels(rawReferers),
    snsEntries: aggregateSnsEntries(account.entries),
    countries: (account.countries || []).map((row) => ({
      name: friendlyCountry(row?.dimensions?.countryName || "Unknown"),
      pageviews: row?.count || 0,
    })),
    devices: (account.devices || []).map((row) => ({
      name: friendlyDevice(row?.dimensions?.deviceType || "Unknown"),
      pageviews: row?.count || 0,
    })),
  };
}

const PAGE_NAMES = Object.freeze({
  "/": "TOP",
  "/history/": "HISTORY",
  "/owners-notes/": "OWNER'S NOTES",
  "/basis-alarm/": "Basis Alarm",
  "/pierce-duofon/": "Pierce Duofon",
  "/cyma-time-o-vox/": "Cyma Time-O-Vox",
  "/cyma-time-o-vox/owners-note/": "Cyma OWNER'S NOTE",
  "/history/smartwatch/": "Smartwatch / HISTORY",
});

export function aggregateSnsEntries(rows) {
  const channels = ["X", "Instagram", "Facebook", "Other SNS"];
  const pages = [
    ["/cyma-time-o-vox/", "Cyma Time-O-Vox"],
    ["/pierce-duofon/", "Pierce Duofon"],
    ["/basis-alarm/", "Basis Alarm"],
    ["other", "Other pages"],
  ].map(([path, name]) => ({ path, name, values: Object.fromEntries(channels.map(c => [c, 0])), total: 0 }));
  for (const row of rows || []) {
    const channel = classifyReferrer(row?.dimensions?.refererHost);
    if (!channels.includes(channel)) continue;
    const path = cleanPath(row?.dimensions?.requestPath);
    const page = pages.find(p => p.path === path) || pages[3];
    const value = Number(row?.sum?.visits || 0);
    page.values[channel] += value;
    page.total += value;
  }
  return { pages, total: pages.reduce((sum, p) => sum + p.total, 0), complete: Array.isArray(rows) && rows.length < 1000 };
}

function cleanPath(path) {
  let out = String(path || "/").split(/[?#]/)[0];
  try { out = decodeURIComponent(out); } catch {}
  if (out.startsWith(BASE_PATH)) out = out.slice(BASE_PATH.length) || "/";
  if (!out.startsWith("/")) out = "/" + out;
  out = out.replace(/\/{2,}/g, "/");
  if (out !== "/" && !out.endsWith("/") && !out.split("/").pop().includes(".")) out += "/";
  return out;
}

function pageMeta(path) {
  const cleaned = cleanPath(path);
  return {
    path: cleaned,
    name: PAGE_NAMES[cleaned] || cleaned,
    mapped: Boolean(PAGE_NAMES[cleaned]),
  };
}

function friendlyPageName(path) {
  return pageMeta(path).name;
}

function buildFlows(rows) {
  return rows.map((row) => {
    const destination = pageMeta(row.requestPath);
    const channel = classifyReferrer(row.refererHost);
    let sourceName = channel;

    if (channel === "Internal Navigation") {
      sourceName = friendlyPageName(row.refererPath || "/");
    } else if (channel === "Direct / Unknown") {
      sourceName = "Direct";
    } else if (row.refererPath) {
      sourceName = channel + " · " + row.refererPath;
    }

    return {
      sourceName,
      sourceHost: row.refererHost,
      sourcePath: row.refererPath,
      sourceCleanPath: channel === "Internal Navigation" ? cleanPath(row.refererPath || "/") : row.refererPath,
      destinationName: destination.name,
      destinationPath: destination.path,
      destinationMapped: destination.mapped,
      channel,
      country: friendlyCountry(row.country),
      device: friendlyDevice(row.device),
      pageviews: row.pageviews,
      visits: row.visits,
    };
  }).sort((a, b) => (b.visits - a.visits) || (b.pageviews - a.pageviews));
}

function buildChannels(rows) {
  const channels = {
    "X": { pageviews: 0, visits: 0 },
    "Instagram": { pageviews: 0, visits: 0 },
    "Facebook": { pageviews: 0, visits: 0 },
    "Other SNS": { pageviews: 0, visits: 0 },
    "Organic Search": { pageviews: 0, visits: 0 },
    "Direct / Unknown": { pageviews: 0, visits: 0 },
    "AI Assistant": { pageviews: 0, visits: 0 },
    "Other Referral": { pageviews: 0, visits: 0 },
    "Internal Navigation": { pageviews: 0, visits: 0 },
  };

  for (const row of rows) {
    const category = classifyReferrer(row.host);
    channels[category].pageviews += row.pageviews;
    channels[category].visits += row.visits;
  }

  return Object.entries(channels)
    .map(([name, values]) => ({ name, ...values }));
}

function classifyReferrer(host) {
  const value = String(host || "").toLowerCase();
  if (!value) return "Direct / Unknown";
  if (value === DEFAULT_HOST || value.endsWith("." + DEFAULT_HOST)) return "Internal Navigation";

  if (
    value === "x.com" ||
    value.endsWith(".x.com") ||
    value === "twitter.com" ||
    value.endsWith(".twitter.com") ||
    value === "t.co"
  ) return "X";

  if (value.includes("instagram.com")) return "Instagram";
  if (value.includes("facebook.com")) return "Facebook";

  if (
    value.includes("threads.net") ||
    value.includes("whatsapp.com") ||
    value.includes("line.me") ||
    value.includes("linkedin.com")
  ) return "Other SNS";

  if (
    value.includes("google.") ||
    value.includes("bing.com") ||
    value.includes("yahoo.") ||
    value.includes("duckduckgo.com") ||
    value.includes("yandex.")
  ) return "Organic Search";

  if (
    value.includes("chatgpt.com") ||
    value.includes("perplexity.ai") ||
    value.includes("claude.ai") ||
    value.includes("gemini.google.com") ||
    value.includes("copilot.microsoft.com")
  ) return "AI Assistant";

  return "Other Referral";
}

function friendlyCountry(value) {
  const map = {
    JP: "Japan",
    IE: "Ireland",
    US: "United States",
    DE: "Germany",
    GB: "United Kingdom",
    FR: "France",
    CH: "Switzerland",
  };
  return map[value] || value;
}

function friendlyDevice(value) {
  const map = {
    mobile: "Mobile",
    desktop: "Desktop",
    tablet: "Tablet",
  };
  return map[String(value).toLowerCase()] || value;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>VINTAGE ALARM ANALYTICS</title>
<style>
:root{--paper:#f1f4f1;--ink:#17201f;--muted:#687471;--line:#d6ddda;--card:#fbfcfb;--accent:#963c33;--green:#13766e;--blue:#426d87;--gold:#9a7b4f;--violet:#7b5674;--soft:#e8eeeb;--shadow:0 5px 18px rgba(31,52,48,.055)}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}
main{width:min(1240px,calc(100% - 32px));margin:0 auto;padding:26px 0 48px}
header{display:flex;gap:18px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ink);padding-bottom:12px}
.eyebrow{font-size:10px;letter-spacing:.2em;color:var(--green);font-weight:800}
h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(25px,4vw,36px);font-weight:500;letter-spacing:.015em;margin:4px 0 0}
.actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
button{appearance:none;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--ink);padding:7px 10px;font:inherit;font-size:11px;cursor:pointer}
button:hover{border-color:var(--green)}
button.active{background:var(--ink);color:var(--paper);border-color:var(--ink)}
button.refresh{border-color:var(--ink)}
.status{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:10px;margin:9px 0 12px}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:14px;min-width:0}
.kpi{grid-column:span 2}
.kpi .label,.section-title{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:800}
.kpi .value{font-family:Georgia,"Times New Roman",serif;font-size:30px;line-height:1;margin-top:8px}
.delta{font-size:10px;margin-top:6px;color:var(--muted)}
.delta.up{color:#315c3d}.delta.down{color:var(--accent)}
.pages{grid-column:span 7}.channels{grid-column:span 5}.referrers{grid-column:1/-1}.half{grid-column:span 6}
.section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.section-head>span{font-size:10px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{text-align:left;padding:7px 5px;border-top:1px solid var(--line);vertical-align:top}
th{font-size:9px;color:var(--muted);font-weight:700}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.path{display:block;color:var(--muted);font-size:9px;margin-top:2px;overflow-wrap:anywhere}
.flag{display:inline-block;margin-left:6px;padding:2px 5px;border:1px solid var(--accent);color:var(--accent);font-size:9px;letter-spacing:.08em}
.flow{grid-column:1/-1}.audit{grid-column:1/-1;border-color:var(--accent);color:var(--accent)}.chart-card{grid-column:1/-1}.primary-chart{grid-column:span 8}.summary-chart{grid-column:span 4}.chart-half{grid-column:span 6}.chart-wrap{width:100%;overflow:hidden}.chart-wrap svg{display:block;max-height:205px}.chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin:5px 0 0;font-size:9px;color:var(--muted)}.legend-dot{width:7px;height:7px;border-radius:999px;display:inline-block;margin-right:5px}.low-sample{grid-column:1/-1;border-style:dashed;color:var(--accent);display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 12px}.entry-bar{display:grid;grid-template-columns:minmax(90px,1fr) 2fr auto;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--line);font-size:10px}.entry-track,.flow-track{height:6px;border-radius:99px;background:var(--soft);overflow:hidden}.entry-fill,.flow-fill{height:100%;background:var(--green)}.donut-grid{display:grid;grid-template-columns:112px minmax(0,1fr);gap:14px;align-items:center}.donut{width:106px;height:106px;border-radius:50%;position:relative;margin:auto}.donut:after{content:"";position:absolute;inset:22px;border-radius:50%;background:var(--card)}.donut-center{position:absolute;inset:0;display:grid;place-items:center;z-index:1;font-family:Georgia,"Times New Roman",serif;font-size:22px}.mix-list{display:grid;gap:5px;font-size:9px}.mix-row{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:6px;align-items:center}.flow-viz{display:grid;gap:6px}.flow-viz-row{display:grid;grid-template-columns:minmax(100px,1fr) auto minmax(100px,1fr) 2fr auto;gap:7px;align-items:center;font-size:10px}.campaign{grid-column:1/-1}.campaign-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:10px}.funnel-step{border:1px solid var(--line);border-radius:8px;padding:9px;min-height:66px}.funnel-step strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:21px;margin-top:5px}.campaign-form{display:grid;grid-template-columns:2fr 1.4fr 1.6fr repeat(4,1fr) auto;gap:6px;margin-top:12px}.campaign-form input,.campaign-form button{min-width:0;border:1px solid var(--line);border-radius:6px;background:transparent;padding:7px;font:inherit;font-size:10px}.campaign-list{margin-top:9px;display:grid;gap:5px;font-size:10px}.campaign-item{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:6px}.muted{color:var(--muted)}
details.drawer{grid-column:1/-1;padding:0}details.drawer>summary,details.discovery-shell>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;font-size:10px;letter-spacing:.13em;font-weight:800;color:var(--ink)}details.drawer>summary::-webkit-details-marker,details.discovery-shell>summary::-webkit-details-marker{display:none}details.drawer>summary:after,details.discovery-shell>summary:after{content:"＋";font-size:15px;color:var(--green)}details.drawer[open]>summary:after,details.discovery-shell[open]>summary:after{content:"−"}.drawer-content{padding:0 14px 14px}.drawer-meta{font-size:9px;letter-spacing:0;color:var(--muted);font-weight:600}.detail-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}.detail-grid>.card{box-shadow:none;background:#fff;border-radius:9px}
.bar-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--line);font-size:10px}
.bar-wrap{grid-column:1/-1;height:3px;background:#e5ded2;margin-top:-3px}
.bar{height:100%;background:var(--green)}
#discovery{margin-top:10px}.discovery{padding:0 14px 14px}.discovery .grid{margin-top:0}.discovery-shell{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}.discovery-status{grid-column:1/-1}.index-table{grid-column:1/-1}.health{grid-column:span 4}.seo-kpi{grid-column:span 2}.seo-kpi .value{font-family:Georgia,"Times New Roman",serif;font-size:24px;margin-top:6px}.inbox{grid-column:1/-1}.inbox-controls{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:7px;align-items:center}.inbox-controls select,.inbox-controls input,.inbox-controls button,.index-select{border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink);padding:7px;font:inherit;font-size:10px}.snapshot-list{display:grid;gap:6px;margin-top:8px}.snapshot-item{display:flex;justify-content:space-between;gap:12px;padding-top:6px;border-top:1px solid var(--line);font-size:10px}.drop-note{font-size:9px;color:var(--muted);line-height:1.55;margin-top:7px}.diagnostic{border-left:3px solid var(--accent)}.error{border:1px solid var(--accent);border-radius:10px;padding:12px;color:var(--accent);background:#fff8f5;white-space:pre-wrap}
.sns-row{padding:12px 0;border-top:1px solid var(--line)}.sns-heading{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:8px}.sns-heading span{font-variant-numeric:tabular-nums}.sns-track{display:flex;height:18px;background:var(--soft);border-radius:4px;overflow:hidden}.sns-track span{height:100%}.sns-breakdown{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;margin-top:7px}.sns-note{font-size:12px;line-height:1.6;color:var(--muted);margin:8px 0}.sns-heading strong{min-width:0}.sns-heading span{flex-shrink:0}@media(max-width:390px){.sns-heading{flex-wrap:wrap}.sns-breakdown{gap:6px 10px}}
footer{margin-top:16px;color:var(--muted);font-size:9px;line-height:1.6}
@media(max-width:980px){.kpi,.seo-kpi{grid-column:span 4}.health{grid-column:span 4}.primary-chart,.summary-chart{grid-column:span 6}.inbox-controls{grid-template-columns:1fr}.campaign-form{grid-template-columns:1fr 1fr}.campaign-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){main{width:min(100% - 20px,1240px);padding-top:18px}header{align-items:flex-start;flex-direction:column}.actions{justify-content:flex-start}.kpi,.seo-kpi,.health{grid-column:span 6}.pages,.channels,.referrers,.half,.chart-half,.primary-chart,.summary-chart{grid-column:1/-1}.donut-grid{grid-template-columns:100px minmax(0,1fr)}.campaign-grid{grid-template-columns:repeat(2,1fr)}.campaign-form{grid-template-columns:1fr}.flow-viz-row{grid-template-columns:1fr auto 1fr}.flow-viz-row .flow-track,.flow-viz-row .flow-count{grid-column:1/-1}.status{flex-direction:column}.detail-grid>.card{grid-column:1/-1}}@media(max-width:390px){main{width:calc(100% - 14px)}.actions{gap:4px}.actions button{padding:6px 8px}.seo-kpi,.health{grid-column:1/-1}details.drawer>summary,details.discovery-shell>summary{align-items:flex-start;flex-direction:column}.drawer-meta{line-height:1.5}}
</style>
</head>
<body>
<main>
<header>
<div><div class="eyebrow">PRIVATE / DISCOVERY DASHBOARD V3</div><h1>VINTAGE ALARM ANALYTICS</h1></div>
<div class="actions">
<button data-window="1h">1H</button>
<button data-window="3h">3H</button>
<button data-window="24h">24H</button>
<button data-window="7d" class="active">7D</button>
<button data-window="30d">30D</button>
<button class="refresh" id="refresh">REFRESH</button>
</div>
</header>
<div class="status"><span id="period">Loading…</span><span id="updated"></span></div>
<div id="content"></div>
<div id="discovery"></div>
<footer>Cloudflare Web Analytics / RUM。Page views と Visits は別定義。ページ表の ENTRY VISITS は、そのページが外部流入・直接流入の入口になった回数。内部遷移は0になり得る。検索露出は Search Console と分離して扱う。</footer>
</main>
<script>
let windowKey="7d";
const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#039;"}[c]));
const n=(v)=>new Intl.NumberFormat("ja-JP").format(Number(v||0));
const pct=(current,previous)=>{
  if(!previous)return current?null:0;
  return ((current-previous)/previous)*100;
};
const delta=(current,previous)=>{
  const d=pct(current,previous);
  if(d===null)return '<div class="delta">前期間 0 → '+n(current)+'</div>';
  const cls=d>0?"up":d<0?"down":"";
  const sign=d>0?"+":"";
  return '<div class="delta '+cls+'">前期間比 '+sign+d.toFixed(1)+'%</div>';
};
function rows(items,max=8){
  const maxValue=Math.max(1,...items.map(x=>Number(x.pageviews||0)));
  return items.slice(0,max).map(x=>{
    const width=x.pageviews?Math.max(2,(x.pageviews/maxValue)*100):0;
    return '<div class="bar-row"><span>'+esc(x.name)+'</span><strong>'+n(x.pageviews)+'</strong><div class="bar-wrap"><div class="bar" style="width:'+width+'%"></div></div></div>';
  }).join("");
}
const COLORS={pageviews:"#181716",visits:"#8d2c23",X:"#315c3d",Search:"#365f7d",Direct:"#9a7b4f",Meta:"#7b5674",AI:"#6b6b6b",Other:"#aaa197"};
function bucketTime(value){
  if(!value)return NaN;
  if(/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return new Date(value+"T00:00:00Z").getTime();
  return new Date(value).getTime();
}
function bucketLabel(value){
  const t=bucketTime(value);
  if(!Number.isFinite(t))return value;
  const opts=(windowKey==="1h"||windowKey==="3h"||windowKey==="24h")
    ?{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Tokyo"}
    :{month:"numeric",day:"numeric",timeZone:"Asia/Tokyo"};
  return new Intl.DateTimeFormat("ja-JP",opts).format(new Date(t));
}
function lineChart(points,series,campaigns=[]){
  if(!points?.length)return '<div class="muted">時系列データなし</div>';
  const w=900,h=220,l=42,r=18,t=16,b=30,iw=w-l-r,ih=h-t-b;
  const start=new Date(window.__vaWindowStart||points[0].bucket).getTime();
  const end=new Date(window.__vaWindowEnd||points[points.length-1].bucket).getTime();
  const values=points.flatMap(p=>series.map(s=>Number(p[s.key]||0)));
  const max=Math.max(1,...values);
  const xFor=(bucket,index)=>{
    const bt=bucketTime(bucket);
    if(Number.isFinite(bt)&&Number.isFinite(start)&&Number.isFinite(end)&&end>start){
      return l+Math.max(0,Math.min(1,(bt-start)/(end-start)))*iw;
    }
    return l+(points.length<=1?0:index/(points.length-1))*iw;
  };
  const yFor=v=>t+ih-(Number(v||0)/max)*ih;
  const grid=[0,.25,.5,.75,1].map(q=>{
    const y=t+ih-q*ih;
    return '<line x1="'+l+'" y1="'+y+'" x2="'+(w-r)+'" y2="'+y+'" stroke="#ded7cc" stroke-width="1"/><text x="'+(l-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="#706d67">'+Math.round(max*q)+'</text>';
  }).join("");
  const lines=series.map(s=>{
    const pts=points.map((p,i)=>xFor(p.bucket,i)+','+yFor(p[s.key])).join(" ");
    return '<polyline fill="none" stroke="'+s.color+'" stroke-width="2.2" points="'+pts+'"/>';
  }).join("");
  const tickIdx=[0,Math.floor((points.length-1)/4),Math.floor((points.length-1)/2),Math.floor((points.length-1)*3/4),points.length-1].filter((v,i,a)=>v>=0&&a.indexOf(v)===i);
  const ticks=tickIdx.map(i=>'<text x="'+xFor(points[i].bucket,i)+'" y="'+(h-8)+'" text-anchor="middle" font-size="9" fill="#706d67">'+esc(bucketLabel(points[i].bucket))+'</text>').join("");
  const markers=campaigns.map(item=>{
    if(!item.postedAt)return "";
    const mt=new Date(item.postedAt).getTime();
    if(!Number.isFinite(mt)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||mt<start||mt>end)return "";
    const x=l+((mt-start)/(end-start))*iw;
    return '<line x1="'+x+'" y1="'+t+'" x2="'+x+'" y2="'+(t+ih)+'" stroke="#8d2c23" stroke-width="1" stroke-dasharray="4 4"/><text x="'+Math.min(w-r-4,x+4)+'" y="'+(t+11)+'" font-size="9" fill="#8d2c23">'+esc(item.label||"X POST")+'</text>';
  }).join("");
  const legend='<div class="chart-legend">'+series.map(s=>'<span><i class="legend-dot" style="background:'+s.color+'"></i>'+esc(s.label)+'</span>').join("")+'</div>';
  return '<div class="chart-wrap"><svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img">'+grid+lines+markers+ticks+'</svg></div>'+legend;
}
function entryBars(pages){
  const items=[...pages].sort((a,b)=>(b.visits-a.visits)||(b.pageviews-a.pageviews)).slice(0,6);
  const max=Math.max(1,...items.map(x=>x.visits));
  return items.map(x=>'<div class="entry-bar"><span><strong>'+esc(x.name)+'</strong><span class="path">'+esc(x.path)+'</span></span><div class="entry-track"><div class="entry-fill" style="width:'+((x.visits/max)*100)+'%"></div></div><strong>'+n(x.visits)+'</strong></div>').join("");
}
function channelColor(name){
  if(name==="X")return COLORS.X;
  if(name==="Organic Search")return COLORS.Search;
  if(name==="Direct / Unknown")return COLORS.Direct;
  if(name==="Instagram")return "#925579";
  if(name==="Facebook")return "#426d9b";
  if(name==="Other SNS")return "#8a763a";
  if(name==="AI Assistant")return COLORS.AI;
  return COLORS.Other;
}
function trafficMix(channels){
  const items=channels.filter(x=>x.name!=="Internal Navigation"&&x.visits>0);
  const total=items.reduce((s,x)=>s+x.visits,0);
  if(!total)return '<div class="muted">流入データなし</div>';
  let cursor=0;
  const stops=items.map(x=>{
    const start=cursor;
    cursor+=x.visits/total*100;
    return channelColor(x.name)+' '+start.toFixed(2)+'% '+cursor.toFixed(2)+'%';
  });
  const list=items.map(x=>'<div class="mix-row"><i class="legend-dot" style="background:'+channelColor(x.name)+'"></i><span>'+esc(x.name)+'</span><strong>'+n(x.visits)+' · '+((x.visits/total)*100).toFixed(0)+'%</strong></div>').join("");
  return '<div class="donut-grid"><div class="donut" style="background:conic-gradient('+stops.join(",")+')"><div class="donut-center">'+n(total)+'</div></div><div class="mix-list">'+list+'</div></div>';
}
function flowVisual(items){
  const list=items.slice(0,7);
  const max=Math.max(1,...list.map(x=>x.pageviews));
  if(!list.length)return '<div class="muted">内部遷移データなし</div>';
  return '<div class="flow-viz">'+list.map(x=>'<div class="flow-viz-row"><strong>'+esc(x.sourceName)+'</strong><span>→</span><strong>'+esc(x.destinationName)+'</strong><div class="flow-track"><div class="flow-fill" style="width:'+((x.pageviews/max)*100)+'%"></div></div><span class="flow-count">'+n(x.pageviews)+'</span></div>').join("")+'</div>';
}
function snsEntryChart(data){
  if(!data)return '<div class="muted">SNS入口データを取得できませんでした。</div>';
  const channels=["X","Instagram","Facebook","Other SNS"];
  const max=Math.max(1,...data.pages.map(p=>p.total));
  const note=data.complete?'判別できたSNS入口 '+n(data.total)+'件':'取得上限に到達：表示分 '+n(data.total)+'件（全体比は算出保留）';
  return '<div class="sns-note">'+note+(data.total<30?' · 少数データ：傾向判断は保留':'')+'<br>棒の共通目盛り：0〜'+n(max)+'件</div>'+
    data.pages.map(p=>'<div class="sns-row"><div class="sns-heading"><strong>'+esc(p.name)+'</strong><span>'+n(p.total)+'件'+(data.complete&&data.total?' · SNS全体の'+(p.total/data.total*100).toFixed(0)+'%':'')+'</span></div><div class="sns-track" role="img" aria-label="'+esc(p.name+' '+channels.map(c=>c+' '+p.values[c]+'件').join('、'))+'">'+channels.map(c=>'<span style="width:'+(p.values[c]/max*100)+'%;background:'+channelColor(c)+'"></span>').join('')+'</div><div class="sns-breakdown">'+channels.map(c=>'<span><i class="legend-dot" style="background:'+channelColor(c)+'"></i>'+esc(c)+' '+n(p.values[c])+'</span>').join('')+'</div></div>').join('')+
    '<div class="sns-note">入口回数（人数・SNSクリック数ではありません）。Direct / UnknownにSNS由来が含まれる場合があります。Other pagesは上記3ページ以外。</div>';
}
const CAMPAIGN_KEY="vaCampaigns";
function getCampaigns(){
  try{
    const parsed=JSON.parse(localStorage.getItem(CAMPAIGN_KEY)||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch{return[]}
}
function saveCampaigns(items){
  localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(items));
}
function normalizeTargetPath(value){
  let out=String(value||"/").trim();
  if(!out.startsWith("/"))out="/"+out;
  if(out!=="/"&&!out.endsWith("/"))out+="/";
  return out;
}
function campaignPanel(entryFlows,internalFlows){
  const campaigns=getCampaigns().sort((a,b)=>String(b.postedAt||"").localeCompare(String(a.postedAt||"")));
  const active=campaigns[0]||null;
  if(!active){
    return '<div class="muted">投稿を登録すると、折れ線に投稿時刻を重ねてファネル比較できる。</div>'+campaignFormHtml();
  }
  const xEntries=entryFlows.filter(x=>x.channel==="X").reduce((s,x)=>s+x.visits,0);
  const targetEntries=entryFlows.filter(x=>x.channel==="X"&&x.destinationPath===active.targetPath).reduce((s,x)=>s+x.visits,0);
  const nextPages=internalFlows.filter(x=>x.sourceCleanPath===active.targetPath).reduce((s,x)=>s+x.pageviews,0);
  const steps=[
    ["IMPRESSIONS",active.impressions],
    ["LINK CLICKS",active.linkClicks],
    ["X ENTRIES*",xEntries],
    ["TARGET ENTRIES*",targetEntries],
    ["NEXT PAGE*",nextPages]
  ];
  const funnel='<div class="campaign-grid">'+steps.map(([label,val])=>'<div class="funnel-step"><span class="section-title">'+label+'</span><strong>'+esc(val)+'</strong></div>').join("")+'</div>'+
    '<div class="path">* Cloudflare側は選択期間の比較値。投稿単位の完全な帰属ではない。</div>';
  const list='<div class="campaign-list">'+campaigns.slice(0,5).map((x,i)=>'<div class="campaign-item"><span><strong>'+esc(x.label)+'</strong> · '+esc(x.postedAt||"時刻未登録")+' · '+esc(x.targetPath||"/")+(x.authorName?' · '+esc(x.authorName):'')+(x.postUrl?'<span class="path">'+esc(x.postUrl)+'</span>':'')+'</span><button type="button" data-campaign-delete="'+i+'">削除</button></div>').join("")+'</div>';
  return funnel+campaignFormHtml()+list;
}
function campaignFormHtml(){
  return '<form class="campaign-form" id="campaignForm">'+
    '<input name="postUrl" type="url" placeholder="X post URL（貼ると自動読込）">'+
    '<input name="label" placeholder="投稿名" required>'+
    '<input name="postedAt" type="datetime-local" required>'+
    '<input name="targetPath" placeholder="/cyma-time-o-vox/" required>'+
    '<input name="impressions" type="number" min="0" placeholder="imp">'+
    '<input name="engagements" type="number" min="0" placeholder="eng">'+
    '<input name="details" type="number" min="0" placeholder="detail">'+
    '<input name="linkClicks" type="number" min="0" placeholder="click">'+
    '<button type="submit">ADD</button></form>';
}
function bindCampaignUi(){
  const form=document.getElementById("campaignForm");
  if(form){
    const postUrl=form.elements.postUrl;
    if(postUrl)postUrl.addEventListener("change",async()=>{
      const value=String(postUrl.value||"").trim();
      if(!value)return;
      postUrl.dataset.state="loading";
      try{
        const res=await fetch('/api/x-preview?url='+encodeURIComponent(value),{cache:"no-store"});
        const preview=await res.json();
        if(!res.ok||preview.error)throw new Error(preview.error||("HTTP "+res.status));
        postUrl.value=preview.url||value;
        postUrl.dataset.postId=preview.postId||"";
        postUrl.dataset.authorName=preview.authorName||"";
        postUrl.dataset.postText=preview.text||"";
        if(!form.elements.label.value){
          const base=(preview.text||"").replace(/\\s+/g," ").trim();
          form.elements.label.value=base?base.slice(0,42):(preview.authorName||"X POST");
        }
        postUrl.dataset.state="ready";
      }catch(err){
        postUrl.dataset.state="error";
        alert("X投稿の読込に失敗: "+err.message);
      }
    });
    form.addEventListener("submit",event=>{
    event.preventDefault();
    const fd=new FormData(form);
    const items=getCampaigns();
    items.push({
      label:String(fd.get("label")||"X POST"),
      postUrl:String(fd.get("postUrl")||""),
      postId:String(form.elements.postUrl?.dataset.postId||""),
      authorName:String(form.elements.postUrl?.dataset.authorName||""),
      postText:String(form.elements.postUrl?.dataset.postText||""),
      postedAt:String(fd.get("postedAt")||""),
      targetPath:normalizeTargetPath(fd.get("targetPath")),
      impressions:Number(fd.get("impressions")||0),
      engagements:Number(fd.get("engagements")||0),
      details:Number(fd.get("details")||0),
      linkClicks:Number(fd.get("linkClicks")||0)
    });
    saveCampaigns(items);
    render(window.__vaLastData);
    });
  }
  document.querySelectorAll("[data-campaign-delete]").forEach(btn=>btn.addEventListener("click",()=>{
    const items=getCampaigns().sort((a,b)=>String(b.postedAt||"").localeCompare(String(a.postedAt||"")));
    items.splice(Number(btn.dataset.campaignDelete),1);
    saveCampaigns(items);
    render(window.__vaLastData);
  }));
}
function render(data){
  window.__vaLastData=data;
  window.__vaWindowStart=data.windowStart;
  window.__vaWindowEnd=data.windowEnd;
  const c=data.current,p=data.previous;
  document.getElementById("period").textContent=data.windowLabel || windowKey;
  document.getElementById("updated").textContent='更新 '+new Date(data.generatedAt).toLocaleString("ja-JP");
  const xNow=c.channels.find(x=>x.name==="X")?.visits||0;
  const xPrev=p.channels.find(x=>x.name==="X")?.visits||0;
  const searchNow=c.channels.find(x=>x.name==="Organic Search")?.visits||0;
  const searchPrev=p.channels.find(x=>x.name==="Organic Search")?.visits||0;
  const entryFlows=c.flows.filter(x=>x.visits>0 && x.channel!=="Internal Navigation");
  const internalFlows=c.flows.filter(x=>x.channel==="Internal Navigation");
  const campaigns=getCampaigns();
  const trend=data.trend||[];
  const pagesPerVisit=c.visits?c.pageviews/c.visits:0;
  const watchEntry=c.pages.filter(x=>["Basis Alarm","Pierce Duofon","Cyma Time-O-Vox"].includes(x.name)).reduce((s,x)=>s+x.visits,0);
  const watchShare=c.visits?(watchEntry/c.visits)*100:0;
  const unmapped=c.pages.filter(x=>!x.mapped);
  const audit=unmapped.length
    ? '<section class="card audit"><strong>MAPPING AUDIT</strong> · 未登録Path '+unmapped.map(x=>esc(x.path)).join(", ")+'</section>'
    : '';
  const flowRows=(items,internal=false)=>items.slice(0,20).map(x=>
    '<tr><td><strong>'+esc(x.sourceName)+'</strong>'+
    (x.sourceHost?'<span class="path">'+esc(x.sourceHost+(x.sourcePath||""))+'</span>':'')+
    '<span class="path">'+esc(x.country)+' · '+esc(x.device)+'</span>'+
    '</td><td>→</td><td><strong>'+esc(x.destinationName)+'</strong>'+
    (!x.destinationMapped?'<span class="flag">UNMAPPED</span>':'')+
    '<span class="path">'+esc(x.destinationPath)+'</span></td>'+
    '<td class="num">'+n(x.pageviews)+'</td><td class="num">'+n(x.visits)+'</td></tr>'
  ).join("");
  const lowSample=c.visits<30?'<section class="card low-sample"><strong>LOW SAMPLE</strong><span>'+n(c.visits)+' visits · まだ傾向断定は保留</span></section>':'';
  const trafficSeries=[{key:"pageviews",label:"Page views",color:COLORS.pageviews},{key:"visits",label:"Visits",color:COLORS.visits}];
  const acquisitionSeries=[{key:"x",label:"X",color:COLORS.X},{key:"search",label:"Search",color:COLORS.Search},{key:"direct",label:"Direct",color:COLORS.Direct},{key:"instagram",label:"Instagram",color:channelColor("Instagram")},{key:"facebook",label:"Facebook",color:channelColor("Facebook")},{key:"otherSns",label:"Other SNS",color:channelColor("Other SNS")}];
  document.getElementById("content").innerHTML=
  '<div class="grid analytics-grid">'+audit+lowSample+
    '<section class="card kpi"><div class="label">VISITS</div><div class="value">'+n(c.visits)+'</div>'+delta(c.visits,p.visits)+'</section>'+
    '<section class="card kpi"><div class="label">PAGE VIEWS</div><div class="value">'+n(c.pageviews)+'</div>'+delta(c.pageviews,p.pageviews)+'</section>'+
    '<section class="card kpi"><div class="label">X VISITS</div><div class="value">'+n(xNow)+'</div>'+delta(xNow,xPrev)+'</section>'+
    '<section class="card kpi"><div class="label">ORGANIC SEARCH</div><div class="value">'+n(searchNow)+'</div>'+delta(searchNow,searchPrev)+'</section>'+
    '<section class="card kpi"><div class="label">PAGES / VISIT</div><div class="value">'+pagesPerVisit.toFixed(2)+'</div><div class="delta">回遊の粗い指標</div></section>'+
    '<section class="card kpi"><div class="label">WATCH ENTRY SHARE</div><div class="value">'+watchShare.toFixed(0)+'%</div><div class="delta">全流入 '+n(c.visits)+'件中 '+n(watchEntry)+'件</div></section>'+
    '<section class="card primary-chart"><div class="section-head"><div class="section-title">TRAFFIC TREND</div><span>'+esc(data.trendBucket||"no bucket")+'</span></div>'+lineChart(trend,trafficSeries,campaigns)+(data.trendWarning?'<div class="path">'+esc(data.trendWarning)+'</div>':'')+'</section>'+
    '<section class="card summary-chart"><div class="section-head"><div class="section-title">TRAFFIC MIX</div><span>Visits構成</span></div>'+trafficMix(c.channels)+'</section>'+
    '<section class="card primary-chart"><div class="section-head"><div class="section-title">ACQUISITION TREND</div><span>流入元別の入口回数</span></div>'+lineChart(trend,acquisitionSeries,campaigns)+'</section>'+
    '<section class="card summary-chart"><div class="section-head"><div class="section-title">ENTRY PAGES</div><span>入口回数</span></div>'+entryBars(c.pages)+'</section>'+
    '<section class="card flow"><div class="section-head"><div class="section-title">SNS → WATCH ENTRY</div><span>判別できたSNS流入の着地先</span></div>'+snsEntryChart(c.snsEntries)+'</section>'+
    '<section class="card flow"><div class="section-head"><div class="section-title">SITE FLOW</div><span>内部遷移</span></div>'+flowVisual(internalFlows)+'</section>'+
    '<details class="card drawer campaign"><summary><span>CAMPAIGN FUNNEL</span><span class="drawer-meta">投稿ログはこのブラウザだけに保存</span></summary><div class="drawer-content">'+campaignPanel(entryFlows,internalFlows)+'</div></details>'+
    '<section class="card pages"><div class="section-head"><div class="section-title">PAGES</div><span>'+n(c.pages.length)+' paths</span></div><table><thead><tr><th>PAGE</th><th class="num">PV</th><th class="num">ENTRY VISITS</th></tr></thead><tbody>'+
      c.pages.slice(0,20).map(x=>'<tr><td><strong>'+esc(x.name)+'</strong>'+(!x.mapped?'<span class="flag">UNMAPPED</span>':'')+'<span class="path">'+esc(x.path)+'</span></td><td class="num">'+n(x.pageviews)+'</td><td class="num">'+n(x.visits)+'</td></tr>').join("")+
    '</tbody></table></section>'+
    '<section class="card channels"><div class="section-head"><div class="section-title">CHANNELS / PV</div></div>'+rows(c.channels,10)+'</section>'+
    '<details class="card drawer raw"><summary><span>RAW / AUDIT TABLES</span><span class="drawer-meta">流入元・内部遷移・国・端末の詳細</span></summary><div class="drawer-content detail-grid">'+
    '<section class="card flow"><div class="section-head"><div class="section-title">ENTRY SOURCE → PAGE</div><span>同一行で取得</span></div><table><thead><tr><th>SOURCE</th><th></th><th>DESTINATION</th><th class="num">PV</th><th class="num">ENTRY VISITS</th></tr></thead><tbody>'+flowRows(entryFlows)+'</tbody></table></section>'+
    '<section class="card flow"><div class="section-head"><div class="section-title">SITE FLOW</div><span>内部遷移</span></div><table><thead><tr><th>FROM</th><th></th><th>TO</th><th class="num">PV</th><th class="num">VISITS</th></tr></thead><tbody>'+flowRows(internalFlows,true)+'</tbody></table></section>'+
    '<section class="card referrers"><div class="section-head"><div class="section-title">REFERRERS</div><span>raw host</span></div><table><thead><tr><th>HOST</th><th class="num">PV</th><th class="num">ENTRY VISITS</th></tr></thead><tbody>'+
      c.referrers.slice(0,20).map(x=>'<tr><td><strong>'+esc(x.host||"(Direct)")+'</strong>'+(x.path?'<span class="path">'+esc(x.path)+'</span>':'')+'</td><td class="num">'+n(x.pageviews)+'</td><td class="num">'+n(x.visits)+'</td></tr>').join("")+
    '</tbody></table></section>'+
    '<section class="card half"><div class="section-head"><div class="section-title">COUNTRIES</div></div>'+rows(c.countries,10)+'</section>'+
    '<section class="card half"><div class="section-head"><div class="section-title">DEVICES</div></div>'+rows(c.devices,10)+'</section>'+
    '</div></details>'+
  '</div>';
  bindCampaignUi();
}
const DISCOVERY_KEY="vaDiscoverySnapshotsV1";
const INDEX_KEY="vaIndexStatusV1";
const KEY_PAGES=[
  {name:"TOP",path:"/"},
  {name:"HISTORY",path:"/history/"},
  {name:"OWNER'S NOTES",path:"/owners-notes/"},
  {name:"Basis Alarm",path:"/basis-alarm/"},
  {name:"Pierce Duofon",path:"/pierce-duofon/"},
  {name:"Cyma Time-O-Vox",path:"/cyma-time-o-vox/"}
];

function getDiscoverySnapshots(){
  try{
    const parsed=JSON.parse(localStorage.getItem(DISCOVERY_KEY)||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch{return[]}
}
function saveDiscoverySnapshots(items){
  localStorage.setItem(DISCOVERY_KEY,JSON.stringify(items.slice(-20)));
}
function getIndexStatus(){
  try{
    const parsed=JSON.parse(localStorage.getItem(INDEX_KEY)||"{}");
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{return{}}
}
function saveIndexStatus(value){
  localStorage.setItem(INDEX_KEY,JSON.stringify(value));
}
function normHeader(value){
  return String(value||"").trim().toLowerCase().replace(/[\\s_\\-（）()％%]/g,"");
}
function detectMetric(header){
  const h=normHeader(header);
  if(["clicks","click","クリック数","クリック"].includes(h))return "clicks";
  if(["impressions","impression","表示回数","インプレッション数","インプレッション"].includes(h))return "impressions";
  if(["ctr","クリック率"].includes(h))return "ctr";
  if(["position","avgposition","averageposition","掲載順位","平均掲載順位"].includes(h))return "position";
  return null;
}
function detectDimension(header){
  const h=normHeader(header);
  if(["date","日付"].includes(h))return "date";
  if(["query","queries","topqueries","クエリ","上位のクエリ"].includes(h))return "query";
  if(["page","pages","toppages","ページ","上位のページ"].includes(h))return "page";
  if(["country","countries","国","国名"].includes(h))return "country";
  if(["device","devices","デバイス"].includes(h))return "device";
  if(["searchappearance","検索での見え方"].includes(h))return "appearance";
  return "other";
}
function parseNumber(value){
  const raw=String(value??"").trim().replace(/,/g,"").replace(/[~－—-]$/,"");
  if(!raw)return 0;
  if(raw.endsWith("%"))return Number(raw.slice(0,-1))||0;
  return Number(raw)||0;
}
function parseCsv(text){
  const rows=[]; let row=[]; let cell=""; let quoted=false;
  const src=String(text||"").replace(/^\\uFEFF/,"");
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(quoted){
      if(ch==='"'&&src[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"'){quoted=false;}
      else cell+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===","){row.push(cell);cell="";}
      else if(ch==="\\n"){row.push(cell);rows.push(row);row=[];cell="";}
      else if(ch!=="\\r")cell+=ch;
    }
  }
  if(cell.length||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
function normalizeCsvFile(name,text){
  const matrix=parseCsv(text);
  if(matrix.length<2)throw new Error(name+": データ行がありません");
  const headers=matrix[0].map(v=>String(v).trim());
  const metricCols={};
  headers.forEach((h,i)=>{const key=detectMetric(h);if(key)metricCols[key]=i;});
  const dimIndex=headers.findIndex(h=>!detectMetric(h));
  const dimension=dimIndex>=0?detectDimension(headers[dimIndex]):"other";
  const rows=matrix.slice(1).map(r=>({
    key:dimIndex>=0?String(r[dimIndex]||"").trim():"",
    clicks:metricCols.clicks!==undefined?parseNumber(r[metricCols.clicks]):0,
    impressions:metricCols.impressions!==undefined?parseNumber(r[metricCols.impressions]):0,
    ctr:metricCols.ctr!==undefined?parseNumber(r[metricCols.ctr]):0,
    position:metricCols.position!==undefined?parseNumber(r[metricCols.position]):0
  })).filter(r=>r.key||r.clicks||r.impressions||r.ctr||r.position);
  return {name,dimension,headers,rows};
}
function snapshotSummary(files,kind){
  const dateFile=files.find(f=>f.dimension==="date");
  const source=dateFile||files.find(f=>f.rows.length)||null;
  if(!source)return {clicks:0,impressions:0,ctr:0,position:0,estimated:true};
  const impressions=source.rows.reduce((s,r)=>s+r.impressions,0);
  const clicks=kind==="seo"?source.rows.reduce((s,r)=>s+r.clicks,0):0;
  const ctr=impressions?clicks/impressions*100:0;
  const weightedPos=source.rows.reduce((s,r)=>s+(r.position*r.impressions),0);
  const position=impressions?weightedPos/impressions:0;
  return {clicks,impressions,ctr,position,estimated:!dateFile};
}
function latestSnapshots(kind){
  return getDiscoverySnapshots().filter(x=>x.kind===kind).sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt)));
}
function discoveryDiagnosis(latest,previous,indexedCount){
  if(indexedCount<KEY_PAGES.length)return {label:"INDEX CHECK",detail:"主要ページのIndex確認が未完了。まず上流を確認。"};
  if(!latest)return {label:"NO DATA",detail:"Search ConsoleのCSVを読み込むと診断開始。"};
  if(latest.summary.impressions===0)return {label:"NO VISIBILITY YET",detail:"Index確認済みでもImpressionsが0。露出発生待ちか需要/検索面を確認。"};
  if(!previous)return {label:"BASELINE",detail:"初回スナップショット。次回Exportから変化判定。"};
  const impPrev=previous.summary.impressions||0;
  const impDelta=impPrev?(latest.summary.impressions-impPrev)/impPrev:null;
  const ctrPrev=previous.summary.ctr||0;
  const ctrDelta=ctrPrev?(latest.summary.ctr-ctrPrev)/ctrPrev:null;
  const posBad=previous.summary.position>0&&latest.summary.position>previous.summary.position+2;
  if(impDelta!==null&&impDelta<-.2&&posBad)return {label:"VISIBILITY / RANKING SUSPECTED",detail:"Impressions低下＋平均掲載順位悪化。Page / Queryへ掘る。"};
  if(impDelta!==null&&impDelta>.1&&ctrDelta!==null&&ctrDelta<-.2)return {label:"SNIPPET / INTENT SUSPECTED",detail:"露出増に対してCTR低下。Query / Page / title・descriptionを確認。"};
  return {label:"OBSERVE",detail:"強い異常パターンはまだなし。"};
}
function discoveryTrend(snapshot){
  const file=snapshot?.files?.find(f=>f.dimension==="date");
  if(!file?.rows?.length)return '<div class="muted">日付CSVを同時に読み込むと時系列が出ます。</div>';
  const points=file.rows
    .map(r=>({bucket:r.key,impressions:r.impressions,clicks:r.clicks}))
    .sort((a,b)=>bucketTime(a.bucket)-bucketTime(b.bucket));
  const series=snapshot.kind==="seo"
    ?[{key:"impressions",label:"Impressions",color:COLORS.Search},{key:"clicks",label:"Clicks",color:COLORS.visits}]
    :[{key:"impressions",label:"Google AI impressions",color:COLORS.AI}];
  const prevStart=window.__vaWindowStart,prevEnd=window.__vaWindowEnd;
  window.__vaWindowStart=points[0]?.bucket;window.__vaWindowEnd=points[points.length-1]?.bucket;
  const out=lineChart(points,series,[]);
  window.__vaWindowStart=prevStart;window.__vaWindowEnd=prevEnd;
  return out;
}
function discoveryTopRows(snapshot){
  if(!snapshot)return "";
  const priority=["page","query","country","device","appearance"];
  const file=priority.map(d=>snapshot.files.find(f=>f.dimension===d)).find(Boolean);
  if(!file)return "";
  const rows=[...file.rows].sort((a,b)=>b.impressions-a.impressions).slice(0,10);
  return '<section class="card index-table"><div class="section-head"><div class="section-title">DRILLDOWN / '+esc(file.dimension.toUpperCase())+'</div><span>'+esc(file.name)+'</span></div><table><thead><tr><th>'+esc(file.dimension.toUpperCase())+'</th><th class="num">IMP</th>'+(snapshot.kind==="seo"?'<th class="num">CLICK</th><th class="num">CTR</th><th class="num">POS</th>':'')+'</tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+esc(r.key)+'</td><td class="num">'+n(r.impressions)+'</td>'+(snapshot.kind==="seo"?'<td class="num">'+n(r.clicks)+'</td><td class="num">'+r.ctr.toFixed(1)+'%</td><td class="num">'+(r.position?r.position.toFixed(1):"—")+'</td>':'')+'</tr>').join("")+
    '</tbody></table></section>';
}
function renderDiscoveryInbox(){
  const mount=document.getElementById("discovery");
  const wasOpen=Boolean(mount.querySelector("details.discovery-shell")?.open);
  const seo=latestSnapshots("seo");
  const geo=latestSnapshots("geo");
  const latestSeo=seo[0]||null,prevSeo=seo[1]||null,latestGeo=geo[0]||null,prevGeo=geo[1]||null;
  const indexState=getIndexStatus();
  const indexedCount=KEY_PAGES.filter(p=>indexState[p.path]?.status==="indexed").length;
  const diagnosis=discoveryDiagnosis(latestSeo,prevSeo,indexedCount);
  const seoSummary=latestSeo?.summary||{impressions:0,clicks:0,ctr:0,position:0};
  const geoSummary=latestGeo?.summary||{impressions:0};
  const indexRows=KEY_PAGES.map(p=>{
    const state=indexState[p.path]||{status:"unknown",checkedAt:""};
    return '<tr><td><strong>'+esc(p.name)+'</strong><span class="path">'+esc(p.path)+'</span></td><td><select class="index-select" data-index-path="'+esc(p.path)+'"><option value="unknown" '+(state.status==="unknown"?"selected":"")+'>未確認</option><option value="indexed" '+(state.status==="indexed"?"selected":"")+'>INDEXED</option><option value="not_indexed" '+(state.status==="not_indexed"?"selected":"")+'>NOT INDEXED</option></select></td><td>'+esc(state.checkedAt||"—")+'</td></tr>';
  }).join("");
  const history=[...getDiscoverySnapshots()].sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt))).slice(0,6);
  const historyHtml=history.map(x=>'<div class="snapshot-item"><span><strong>'+(x.kind==="seo"?"SEO":"GOOGLE AI")+'</strong> · '+new Date(x.importedAt).toLocaleString("ja-JP")+' · '+x.files.length+' files</span><span>IMP '+n(x.summary.impressions)+(x.kind==="seo"?' / CLICK '+n(x.summary.clicks):'')+'</span></div>').join("");
  mount.innerHTML=
    '<details class="discovery-shell" '+(wasOpen?'open':'')+'><summary><span>DISCOVERY / SEO &amp; GEO TOOLS</span><span class="drawer-meta">INDEX '+indexedCount+'/'+KEY_PAGES.length+' · '+esc(diagnosis.label)+'</span></summary><div class="discovery"><div class="grid">'+
      '<section class="card inbox"><div class="section-head"><div class="section-title">DISCOVERY INBOX / ZERO-COST</div><span>Search Console CSVをローカル保存</span></div>'+
        '<div class="inbox-controls"><select id="discoveryKind"><option value="seo">通常SEO</option><option value="geo">Google生成AI</option></select><input id="discoveryFiles" type="file" accept=".csv,text/csv" multiple><button id="importDiscovery" type="button">IMPORT</button></div>'+
        '<div class="drop-note">Search Consoleで「エクスポート → CSV」。CSVが複数ならまとめて選択。API・Google Cloud・課金経路は使わない。データはこのブラウザのlocalStorageだけに保存。</div>'+
      '</section>'+
      '<section class="card seo-kpi"><div class="label">INDEX STATUS</div><div class="value">'+indexedCount+'/'+KEY_PAGES.length+'</div><div class="delta">手動URL検査の記録</div></section>'+
      '<section class="card seo-kpi"><div class="label">SEO IMPRESSIONS</div><div class="value">'+n(seoSummary.impressions)+'</div>'+(prevSeo?delta(seoSummary.impressions,prevSeo.summary.impressions):'<div class="delta">baseline待ち</div>')+'</section>'+
      '<section class="card seo-kpi"><div class="label">SEO CLICKS</div><div class="value">'+n(seoSummary.clicks)+'</div>'+(prevSeo?delta(seoSummary.clicks,prevSeo.summary.clicks):'<div class="delta">baseline待ち</div>')+'</section>'+
      '<section class="card seo-kpi"><div class="label">SEO CTR</div><div class="value">'+Number(seoSummary.ctr||0).toFixed(1)+'%</div><div class="delta">date CSV基準</div></section>'+
      '<section class="card seo-kpi"><div class="label">AVG POSITION</div><div class="value">'+(seoSummary.position?Number(seoSummary.position).toFixed(1):"—")+'</div><div class="delta">date CSVのimp加重</div></section>'+
      '<section class="card seo-kpi"><div class="label">GOOGLE AI IMP</div><div class="value">'+n(geoSummary.impressions)+'</div>'+(prevGeo?delta(geoSummary.impressions,prevGeo.summary.impressions):'<div class="delta">baseline待ち</div>')+'</section>'+
      '<section class="card health diagnostic"><div class="label">DISCOVERY HEALTH</div><div class="value" style="font-size:22px">'+esc(diagnosis.label)+'</div><div class="delta">'+esc(diagnosis.detail)+'</div></section>'+
      '<section class="card chart-card"><div class="section-head"><div class="section-title">SEO VISIBILITY TREND</div><span>imported CSV</span></div>'+discoveryTrend(latestSeo)+'</section>'+
      (latestGeo?'<section class="card chart-card"><div class="section-head"><div class="section-title">GOOGLE AI VISIBILITY TREND</div><span>imported CSV</span></div>'+discoveryTrend(latestGeo)+'</section>':'')+
      discoveryTopRows(latestSeo)+
      discoveryTopRows(latestGeo)+
      '<section class="card index-table"><div class="section-head"><div class="section-title">INDEX STATUS / MANUAL</div><span>Search Console URL検査の結果だけ記録</span></div><table><thead><tr><th>PAGE</th><th>STATUS</th><th>CHECKED</th></tr></thead><tbody>'+indexRows+'</tbody></table></section>'+
      '<section class="card inbox"><div class="section-head"><div class="section-title">IMPORT HISTORY</div><button id="clearDiscovery" type="button">CLEAR</button></div><div class="snapshot-list">'+(historyHtml||'<div class="muted">まだImportなし。</div>')+'</div></section>'+
    '</div></div></details>';
  bindDiscoveryInbox();
}
function bindDiscoveryInbox(){
  const importBtn=document.getElementById("importDiscovery");
  if(importBtn)importBtn.addEventListener("click",async()=>{
    const input=document.getElementById("discoveryFiles");
    const kind=document.getElementById("discoveryKind")?.value||"seo";
    const files=[...(input?.files||[])];
    if(!files.length){alert("CSVを選んでください");return;}
    try{
      const normalized=[];
      for(const file of files){
        if(!file.name.toLowerCase().endsWith(".csv"))continue;
        normalized.push(normalizeCsvFile(file.name,await file.text()));
      }
      if(!normalized.length)throw new Error("CSVを読めませんでした");
      const snapshot={kind,importedAt:new Date().toISOString(),files:normalized,summary:snapshotSummary(normalized,kind)};
      const items=getDiscoverySnapshots();items.push(snapshot);saveDiscoverySnapshots(items);
      renderDiscoveryInbox();
    }catch(err){alert("Import失敗: "+err.message);}
  });
  document.querySelectorAll("[data-index-path]").forEach(select=>select.addEventListener("change",()=>{
    const state=getIndexStatus();
    state[select.dataset.indexPath]={status:select.value,checkedAt:new Date().toLocaleDateString("ja-JP")};
    saveIndexStatus(state);renderDiscoveryInbox();
  }));
  const clear=document.getElementById("clearDiscovery");
  if(clear)clear.addEventListener("click",()=>{
    if(confirm("SEO/GEO Import履歴をこのブラウザから消しますか？")){
      localStorage.removeItem(DISCOVERY_KEY);renderDiscoveryInbox();
    }
  });
}

async function load(){
  document.getElementById("content").innerHTML='<div class="card">Loading Cloudflare Web Analytics…</div>';
  try{
    const res=await fetch('/api/analytics?window='+encodeURIComponent(windowKey),{cache:"no-store"});
    const data=await res.json();
    if(!res.ok||data.error)throw new Error(data.error||('HTTP '+res.status));
    render(data);
  }catch(err){
    document.getElementById("content").innerHTML='<div class="error">'+esc(err.message)+'</div>';
  }
}
document.querySelectorAll("[data-window]").forEach(btn=>btn.addEventListener("click",()=>{
  windowKey=btn.dataset.window;
  document.querySelectorAll("[data-window]").forEach(x=>x.classList.toggle("active",x===btn));
  load();
}));
document.getElementById("refresh").addEventListener("click",()=>{load();renderDiscoveryInbox();});
renderDiscoveryInbox();
load();
</script>
</body>
</html>`;
