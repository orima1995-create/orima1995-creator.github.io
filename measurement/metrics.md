# VINTAGE ALARM — 計測定義

更新日: 2026-09-09

## 原則

数字を増やすことより、何が増えたかを区別できることを優先する。

同じ現象を複数の指標で二重計上しない。
取得できない指標を推測で埋めない。
計測条件が変わった場合は、比較期間に注記する。

## 計測の役割分担

### Cloudflare Web Analytics — 来訪 + 性能

既存のCloudflare Web Analyticsを計測の主系統とする。

来訪:
- Page views
- Visits
- Path
- Referrer host / path
- Country
- Device

性能:
- LCP
- INP
- CLS
- Page load time

### VINTAGE ALARM ANALYTICS — 管理者用表示層

Cloudflare Web Analytics / RUMをGraphQL APIから読み、VINTAGE ALARM用の名称へ変換して表示する。

実装:
- 開発元: `cloudflare/analytics-dashboard/worker.js`
- デプロイ元: `orima1995-create/vintage-alarm-analytics`
- Worker: `vintage-alarm-analytics.orima1995.workers.dev`
- Basic Authで管理者だけが閲覧する

表示:
- 1時間 / 3時間 / 24時間 / 7日 / 30日
- Page views / Visits
- 直前同期間比
- URL → ページ名
- ENTRY SOURCE → PAGE
- SITE FLOW
- X
- Instagram
- Facebook
- Other SNS
- Organic Search
- Direct / Unknown
- AI Assistant
- Other Referral
- Internal Navigation
- Referrer host / path
- Country
- Device
- 未登録PathのMAPPING AUDIT

Cloudflare API tokenはWorker Secretにのみ保存し、GitHub Pagesやブラウザへ公開しない。

## Visits / Page views / Entryの扱い

Page viewsとVisitsを同一視しない。

Cloudflare Web AnalyticsのVisitsは、外部サイトまたはDirectから始まったページビューを基準にする。
内部遷移ではPage viewが増えてもVisitsが0になり得る。

ページ表の`ENTRY VISITS`は、そのページが外部流入またはDirectの入口になった回数として読む。

`ENTRY SOURCE → PAGE`では、`requestPath + refererHost + refererPath`を同じGraphQL集計行で取得する。
別々に集計したPageとReferrerを推測で結び付けない。

`SITE FLOW`では、自サイトをRefererに持つ内部遷移を分離して表示する。

## URL → 表示名の監査

表示名は必ずraw `requestPath`を残したまま変換する。

現在の主要マッピング:
- `/` → TOP
- `/history/` → HISTORY
- `/owners-notes/` → OWNER'S NOTES
- `/pierce-duofon/` → Pierce Duofon
- `/cyma-time-o-vox/` → Cyma Time-O-Vox
- `/cyma-time-o-vox/owners-note/` → Cyma OWNER'S NOTE
- `/history/smartwatch/` → Smartwatch / HISTORY

base path、末尾スラッシュ、URLエンコード差を正規化する。
既知マッピングに一致しないPathは`UNMAPPED`として表示し、勝手に既存ページ名へ丸めない。

新規ページ公開時は表示名マッピングも更新する。

## 管理者アクセス除外

母数が小さい段階では管理者自身の確認アクセスが結果を大きく歪めるため、最優先で除外する。

公開サイトはブラウザ単位のlocalStorageフラグ`vintageAlarmAnalyticsOptOut`を確認し、ONの場合Cloudflare beaconを読み込まない。

設定:
- 任意ページを `?__va_analytics=off` 付きで一度開く → そのブラウザを除外
- `?__va_analytics=on` → 計測へ戻す

PC / スマホなどブラウザごとに設定する。
除外設定前に発生した過去アクセスは遡って消えない。

## VINTAGE ALARMで分ける流入

最低限、次を分ける。

- X
- Instagram
- Facebook
- Other SNS
- Organic Search
- Direct / Unknown
- Other Referral
- AI Assistant系リファラー（取得できる場合）
- Internal Navigation

同じ流入を複数カテゴリへ二重計上しない。

## X導線の検証

X AnalyticsとCloudflareを1対1の同一指標として扱わない。

X:
- Impressions
- Engagements
- Detail expands
- Link clicks

Cloudflare:
- X / SNS Entry Visits
- Entry destination
- Referrer host / path
- その後のSITE FLOW

特定投稿のLink clicksとCloudflareの7日集計を直接比較しない。
投稿直後の検証には1H / 3H / 24Hを使い、同じ時間帯へ寄せる。

可能な場合はGraphQLの`refererPath`でX投稿のstatus pathを確認する。
ただしX / t.co / WebViewの仕様で完全な投稿単位識別ができない場合は、推測で補わない。

## ページ単位

優先して見るページ:

- TOP
- HISTORY
- OWNER'S NOTES
- Pierce Duofon
- Cyma Time-O-Vox

WATCHページでは、
1. 入口になったか
2. どの流入元から入ったか
3. 次のページへ進んだか

を分けて見る。

## Duofon基準実験

基準日:
- 2026-09-07 — WATCH v1.0完成・ギャラリー実装
- X既存投稿へのサイト導線追加日は別途記録する

比較単位:
- 投稿直後: 1時間 / 3時間 / 24時間
- 継続: 7日 / 30日

見る項目:
- Duofon Page views / Entry Visits
- XからのEntry
- SearchからのEntry
- SITE FLOW
- Country
- Device

## 検索データ

Search ConsoleとCloudflareを混同しない。

Search Console:
- 表示回数
- クリック
- CTR
- 平均掲載順位
- Query

Cloudflare Web Analytics:
- 実際のサイト訪問
- ページ閲覧
- Entry source
- Referrer
- Country / Device
- Site flow

`Organic Search = 0`は、検索結果への表示が0という意味ではない。
表示されたがクリックされていない状態はSearch Consoleで確認する。

## Country / Device / Browser / OS

CountryとDeviceは継続観測するが、母数が小さい段階では成功指標にしない。

Browser / OS / Navigation typeは取得可能でも、現時点では常設KPIにしない。
表示崩れ・ブラウザ依存不具合・特殊な遷移を調査するときの診断項目とする。

## Core Web Vitals

LCP / INP / CLS / Page load timeは集客成果ではなく、集客を阻害する技術問題の健康診断として扱う。
VINTAGE ALARM ANALYTICSの主画面へ無理に統合せず、Cloudflare本体で確認してよい。

## AI検索観測

AI検索での露出は補助観測として扱う。

固定質問を使う場合は、
- サービス / モデル
- 日時
- 言語
- 地域
- 検索機能の有無

を記録する。

AI Assistant Referrerが取得できても、AI回答内での自然露出そのものとは同一視しない。

## 成果判定

VINTAGE ALARM ANALYTICSの目的はアクセスカウンターではなく、

`X / 検索 → 時計ページ → 次の興味`

が成立したかを見ること。

次を別々に扱う。

1. 実装できた
2. 正常に公開できた
3. 発見・露出が増えた
4. 来訪が増えた
5. 狙ったページが入口になった
6. 次ページへ回遊した

数字が増えた場合も、SNS投稿、外部言及、季節性、管理者アクセス、計測変更など別要因を確認する。


## SNSリファラー監査

X / Instagram / Facebookを同一カテゴリにまとめない。

raw `refererHost` が以下を含む場合のみ分類する。

- X: `x.com` / `twitter.com` / `t.co`
- Instagram: `instagram.com`
- Facebook: `facebook.com`
- Other SNS: Threads / WhatsApp / LINE / LinkedIn等

Facebook / InstagramのRefererがあることだけで「公開投稿から人間が来た」と断定しない。
Web Analyticsは既知Botを除外する設定を使うが、アプリ内プリフェッチ・未識別自動アクセス・Link Shim・DM等の経路は別途raw host / pathで確認する。

特定SNS投稿の成果判定は、SNS側のLink clicksと同時間帯のENTRY SOURCE → PAGEを照合して行う。
