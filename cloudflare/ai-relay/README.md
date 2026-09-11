# VINTAGE ALARM AI relay

Cloudflare Pages Functionsで、Analytics Workerの短時間署名付きread-only exportをAI向けMarkdownへ整形する。

- Production target: `https://vintage-alarm-ai-relay.pages.dev/`
- Upstream allowlist: `https://vintage-alarm-analytics.orima1995.workers.dev/api/ai-export`
- Dashboardの`AI URL`は通常15分TTLで発行する。
- Relay自身はAnalytics token / Dashboard passwordを保持しない。
- 任意URL proxyにはしない。許可host/path/queryのみfetchする。
- `text/markdown`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`。

このリポジトリはCloudflare認証済みの一時deploy bridge。正規repoへdeployment secretsを移したらdeploy元も戻す。
