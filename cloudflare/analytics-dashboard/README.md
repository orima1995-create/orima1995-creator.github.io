# VINTAGE ALARM ANALYTICS — Cloudflare Worker

VINTAGE ALARM専用の非公開アクセス解析ダッシュボード。

## 役割

- Cloudflare Web Analytics / RUMをGraphQL APIから読む
- URLを時計名・ページ名へ変換する
- 24時間 / 7日 / 30日と直前期間を比較する
- Page views / Visitsを分離する
- Referrerを X / SNS、Organic Search、Direct / Unknown、AI Assistant、Other Referralへ分類する
- Country / Deviceを表示する
- Cloudflare API tokenをブラウザやGitHub Pagesへ露出させない

## セキュリティ

Worker自身をBasic Authで保護する。
API token・Account ID・パスワードはCloudflare Worker Secretにのみ保存し、GitHubへコミットしない。
全レスポンスにno-store、noindex系ヘッダーを付ける。

## 必要なCloudflare API Token

Cloudflare公式ドキュメントに従い、カスタムAPI Tokenへ以下を付与する。

- Account
- Account Analytics
- Read

対象アカウントだけに絞る。

## デプロイ

```bash
cd cloudflare/analytics-dashboard
npx wrangler@latest deploy
npx wrangler@latest secret put CF_API_TOKEN
npx wrangler@latest secret put CF_ACCOUNT_ID
npx wrangler@latest secret put DASHBOARD_PASSWORD
```

任意:

```bash
npx wrangler@latest secret put CF_SITE_TAG
npx wrangler@latest secret put DASHBOARD_USER
```

`CF_SITE_TAG`を省略した場合、直近30日のRUMデータから `REQUEST_HOST` に一致するsiteTagを自動検出する。

## URL表示名

Worker内の `friendlyPageName()` で管理する。
新しいOWNER'S NOTEを公開したらここへ追加する。

現在:

- TOP
- HISTORY
- OWNER'S NOTES
- Pierce Duofon
- Cyma Time-O-Vox
- Cyma OWNER'S NOTE
- Smartwatch / HISTORY

## 注意

Web AnalyticsのPage views / VisitsとSearch Consoleの表示回数・クリックは別指標。
公開・計測・流入・検索露出を同一の成果として扱わない。
