# VINTAGE ALARM — DISCOVERY / SEO / GEO ANALYTICS V3

更新日: 2026-09-09

## 固定目的

VINTAGE ALARM Analyticsの主語は「来訪者」ではなく「発見性」。

`存在を認識されたか → 表示されたか → 選ばれたか → 来たか → 読まれたか → 興味が広がったか`

追加月額0円を優先する。
Billing account / Google Cloud / 有料APIを前提にしない。

## DISCOVERY PIPELINE

1. INDEX STATUS
2. SEO IMPRESSIONS
3. SEO CLICKS / CTR / AVG POSITION
4. SEARCH VISITS
5. ENTRY PAGE
6. NEXT PAGE
7. DIAGNOSIS
8. AUDIT

INDEX STATUSは主要ページだけSearch Console URL検査を手動確認して記録する。

## ZERO-COST DATA FLOW

### Cloudflare

自動:
- Page views / Visits
- Referrer
- Entry page
- Site flow
- Country / Device
- Traffic trend

### Search Console — 通常SEO

無料UIからExportしたCSVをDISCOVERY INBOXへImportする。

対象:
- Date
- Page
- Query
- Country
- Device
- Search appearance
- Clicks
- Impressions
- CTR
- Average position

全体KPIはDate系CSVを優先する。
Page / Query等はドリルダウンとして扱う。
ChartとTableの集計方法差を無視して単純合算しない。

### Google生成AI

Search Consoleの生成AI Performance ReportからCSV Exportして別SnapshotとしてImportする。

見るもの:
- Impressions
- Date
- Page
- Country
- Device

通常SEO ImpressionsとGoogle AI Impressionsを混ぜない。

### X

- oEmbed: URL識別 / 表示用metadata
- Analytics: 手入力またはスクショFallback
- Cloudflare: X Entry
- FunnelはESTIMATED / INDICATIVE

## DISCOVERY SURFACES

### OWNED WEB
- Google Web Search
- Google Search generative AI
- Discover
- Image Search

### OWNED SOCIAL
- X native
- Google → X
- その他Platform property

### EXTERNAL AI
- ChatGPT
- Perplexity
- Gemini等

AIで表示された / AIから来た / AIに引用された、を同一視しない。

## 診断

### SEO

Index未確認
→ INDEX CHECK

Index確認済み + Impressions 0
→ NO VISIBILITY YET

Impressions ↓ + Position悪化
→ VISIBILITY / RANKING SUSPECTED

Impressions ↑ + CTR ↓
→ SNIPPET / INTENT SUSPECTED

Search Console Clicks ↑ + Cloudflare Search Entry ↓
→ MEASUREMENT GAP SUSPECTED

診断は原因確定ではなく、次に掘る場所の候補。

## 現在のUI階層

1. DISCOVERY INBOX
2. SEO / Google AI KPI
3. Visibility Trend
4. Page / Query Drilldown
5. Manual Index Status
6. Cloudflare Traffic
7. Campaign
8. Advanced / Audit

## 保存

現在:
- SEO/GEO CSV snapshot → browser localStorage
- INDEX STATUS → browser localStorage
- X Campaign → browser localStorage

次の検討:
- 追加月額0円で使える永続ストレージのみ候補にする
- 導入前に無料枠 / 課金条件 / データ量をWeb監査する

## Evidence-gated rule

1. 最新公式仕様をWeb確認
2. 判断したい問いを分解
3. 取得可能な事実 / 推測 / 取得不能を分離
4. 意思決定に必要か確認
5. 最小実装
6. 実データで反証
7. 問題がなければ次へ

「取れるから取る」は禁止。
「綺麗に見えるから結び付ける」も禁止。
