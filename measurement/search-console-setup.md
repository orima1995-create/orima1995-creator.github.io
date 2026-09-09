# Search Console 接続手順 — VINTAGE ALARM ANALYTICS

更新日: 2026-09-09

## 目的

VINTAGE ALARM ANALYTICSへ以下を追加する。

- 主要ページのINDEX STATUS
- SEO Impressions
- SEO Clicks
- CTR
- Average Position
- 28日 vs 前28日
- Page / Query / Date
- searchAppearance PoC

## 実装済み

Worker endpoint:

- `/api/discovery?days=28`

未設定時はダッシュボードに `SEARCH CONSOLE NOT CONNECTED` を表示する。

## Google側

1. Google Cloudでプロジェクトを作成または選択する
2. Google Search Console APIを有効化する
3. Service Accountを作成する
4. JSON keyを1個作成する
5. Service Accountのemailを控える

秘密鍵JSONはGitHubへ絶対にコミットしない。

## Search Console側

対象URL-prefix property:

`https://orima1995-create.github.io/orima1995-creator.github.io/`

プロパティが未作成なら、このURL-prefix propertyを追加・所有権確認する。

既存propertyがある場合:

Settings → Users and permissions → Add user

へService Account emailを追加する。

まずFull userでPoCする。
Search Analyticsにはread permissionが必要。
URL Inspectionも`webmasters.readonly` OAuth scopeで呼び出す。

## Cloudflare側

Worker:

`vintage-alarm-analytics`

runtime variable:

`GSC_SITE_URL=https://orima1995-create.github.io/orima1995-creator.github.io/`

runtime secret:

`GSC_SERVICE_ACCOUNT_JSON`

値はGoogle Cloudから取得したService Account JSON全文。

チャットやGitHubへ秘密鍵を貼らない。

## PoCの成功条件

ダッシュボードのDISCOVERY欄で:

- property accessが通る
- INDEX STATUSが主要5ページについて返る
- Search Analyticsが0件でも正常レスポンスになる
- 0 impressionsとAPI errorを区別できる
- searchAppearance取得可否が分かる

## 失敗時の切り分け

### 401 Google OAuth

Service Account JSON / private keyを確認。

### 403 Property not accessible

- `GSC_SITE_URL`がSearch Console上のproperty文字列と完全一致しているか
- URL-prefix末尾`/`があるか
- Service Account emailにproperty権限があるか

### INDEX STATUS ERRORのみ

Search AnalyticsとURL Inspectionを別々に扱う。
URL Inspection APIはGoogle Indexにある版を確認するAPIで、Live URL Testではない。

### Impressions = 0

接続失敗とは扱わない。
まずINDEX STATUSを確認し、indexedなのに0なら「検索露出未発生」として扱う。
