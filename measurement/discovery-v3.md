# VINTAGE ALARM — DISCOVERY / SEO / GEO ANALYTICS V3

更新日: 2026-09-09

## 目的

VINTAGE ALARM Analyticsの主語を「来訪者」から「発見性」へ変更する。

最終的に答える問い:

`存在を認識されたか → 表示されたか → 選ばれたか → 来たか → 読まれたか → 興味が広がったか`

アクセス数を眺めること自体を目的にしない。

## DISCOVERY PIPELINE

主要ページごとに次の順で見る。

1. INDEXED?
2. SEO IMPRESSIONS
3. SEO CLICKS
4. SEARCH VISITS
5. ENTRY PAGE
6. NEXT PAGE

Google Search Console URL Inspection APIでGoogle Index上の状態を確認する。
Search Analytics APIでClicks / Impressions / CTR / Average PositionをQuery / Page / Country / Device / Date / Hour等で分析する。

## DISCOVERY SURFACES

発見面を分ける。

### OWNED WEB

- Google Web Search
- Google Search generative AI
- Discover
- Image Search

### OWNED SOCIAL

- X native
- Google → X
- Instagram / TikTok / YouTube等のGoogle露出

### EXTERNAL AI

- ChatGPT
- Perplexity
- Gemini等

「AIで表示された」「AIから来た」「AIに引用された」を同一視しない。

## GOOGLE GEO

Search Consoleの生成AI専用Performance Reportを、Google AI露出の第一級指標とする。

見るもの:
- Impressions
- Page
- Country
- Device
- Date / 時系列

対象:
- AI Overviews
- AI Mode

専用生成AIビューの自動取得はAPI仕様をPoCしてから確定する。
通常Search Analytics APIのsearchAppearanceを実データで列挙し、生成AIを分離できるか確認する。
公式に分離APIを確認できない場合はSearch Console UIのExportを取り込む。

## PLATFORM PROPERTIES

Search Console Platform propertiesで、X / Instagram / TikTok / YouTube上の自分の投稿がGoogle Search / Discover / Google Newsでどう発見されるかを補助観測する。

VINTAGE ALARM本体のSEOと、X投稿自体のGoogle露出を別指標として扱う。

## X CAMPAIGN INBOX

X投稿URLを主キー候補としてCampaignを登録する。

段階:
1. URL貼付
2. Post ID / 作者 / 表示用本文の自動取得
3. 投稿時刻 / target page確認
4. X Analytics metrics取得
5. Cloudflare Entryとの比較

oEmbedは投稿識別・表示用metadataに限定する。
X Analytics値の本体はX API。
スクリーンショット読取はFallback。

Campaign Funnelは同一人物追跡ではないため、`ESTIMATED / INDICATIVE`として扱う。

## CHATGPT / AI REFERRAL

AI Assistant Referrerは「AIから実際にサイトへ来た」証拠として扱う。

ChatGPT Search由来のUTM等が存在しても、Cloudflare Web Analyticsがquery stringを分析用に保持しない場合はCampaign識別に使えない。

したがって:
- AI Referrer = 来訪
- Google AI Impression = Google生成AI上の露出
- Citation Monitor = 回答内引用観測

を別々に持つ。

## 診断エンジン

単なるドリルダウンではなく、次に何を調べるべきかを提示する。

例:

### SEO

Indexed ✅
Impressions ↑
Position ↑
CTR ↓

→ LIKELY ISSUE: SNIPPET / INTENT

Indexed ✅
Impressions ↓
Position ↓
CTR →

→ LIKELY ISSUE: VISIBILITY / RANKING

Search Clicks ↑
Cloudflare Search Entries ↓

→ MEASUREMENT GAP SUSPECTED

### SOCIAL

X Impressions正常
Link Clicks ↓

→ 投稿訴求 / CTA候補

Link Clicks正常
X Entries ↓

→ Measurement / WebView / Referrer / Load候補

### DATA QUALITY

Meta Referrer急増
海外 / 特定Device偏重
公開投稿との時間不一致

→ PREFETCH / LINK SHIM / BOT SUSPECTED

## 画面階層

### 1. DISCOVERY

- Indexed
- SEO Impressions
- SEO Clicks
- Avg Position
- Google AI Impressions
- X Visits
- Traffic / Visibility Trend

### 2. VISIBILITY / SELECTION

- SEO Trend
- Google AI Trend
- Platform property Trend
- X Impressions / Link Clicks
- CTR

### 3. ACQUISITION

- Search / X / AI / Direct Entry
- Entry Pages
- Traffic Mix

### 4. CONTENT / DEPTH

- Pages per Visit
- WATCH Entry
- refererPath → requestPath

### 5. DIAGNOSIS

- Why did this change?
- Query
- Page
- Position
- CTR
- Campaign
- Device
- Country

### 6. AUDIT

- Raw Referrers
- Raw Paths
- UNMAPPED
- Unknown
- Bot / Prefetch疑い
- LOW SAMPLE

## 実装順

1. Search Console接続 + URL Inspection
2. 通常SEO Metrics
3. Discovery Health / 診断ツリー
4. Campaign MemoryをD1へ永続化
5. X Campaign Inbox自動登録
6. X Analytics API
7. Google AI Performance取得方法PoC
8. AI Referrals
9. GEO Citation Monitor
10. データが十分に溜まった後で高度なSite Flow / WATCH別比較

## Evidence-gated rule

各実装は必ず以下で進める。

1. 最新の公式仕様をWeb確認
2. 判断したい問いを分解
3. 取得可能な事実 / 推測 / 取得不能を分離
4. 意思決定に必要か確認
5. 最小実装
6. 実データで反証
7. 問題がなければ次へ

「取れるから取る」は禁止。
「綺麗に見えるから結び付ける」も禁止。
