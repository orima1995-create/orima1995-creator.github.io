# VINTAGE ALARM — 計測定義

更新日: 2026-09-08

## 原則

数字を増やすことより、何が増えたかを区別できることを優先する。

同じ現象を複数の指標で二重計上しない。
取得できない指標を推測で埋めない。
計測条件が変わった場合は、比較期間に注記する。

## 計測の役割分担

### GoatCounter — 来訪者解析

来訪者数・ページ別閲覧・流入元を見る主系統。

公開ページ上にカウンターは表示しない。
閲覧は管理者だけがGoatCounterダッシュボードで行う。

主に確認する項目:

- Page views / Visits
- Paths / pages
- Referrers
- Campaigns
- Country / location
- Browser
- Screen size

アカウント名は `vintagealarmwatch` を使用する。
計測エンドポイントは `https://vintagealarmwatch.goatcounter.com/count`。

### Cloudflare Web Analytics — 性能監視

Cloudflareは来訪分析の主系統にはせず、主にCore Web Vitalsを見る。

- LCP
- INP
- CLS
- Page load time

GoatCounterとCloudflareの数字は目的・集計方法が異なるため一致を期待しない。

## VINTAGE ALARMで分ける流入

最低限、次を分ける。

- X / SNS
- Organic Search
- Direct / Unknown
- Other referrals
- AI Assistant系リファラー（取得できる場合）

GoogleのAI検索経由など、通常検索と同じ分類に入るものは独自に二重加算しない。

## ページ単位

優先して見るページ:

- TOP
- HISTORY
- OWNER'S NOTES
- Pierce Duofon
- Cyma Time-O-Vox

WATCHページでは、単純PVだけでなく「入口ページになったか」を見る。

## Duofon基準実験

基準日:
- 2026-09-07 — WATCH v1.0完成・ギャラリー実装
- X既存投稿へのサイト導線追加日は、実施時点で別途記録する

比較単位:
- 当日
- 7日
- 30日

見る項目:
- Duofon Page views / Visits
- XからのReferrer
- SearchからのReferrer
- Country
- Browser / screen size
- 他ページへの遷移が確認できる場合はその導線

## 検索データ

Search Consoleを利用する場合は、GoatCounterの訪問データと混同しない。

Search Console:
- 表示回数
- クリック
- CTR
- 平均掲載順位

GoatCounter:
- 実際のサイト訪問
- ページ閲覧
- リファラー
- Campaign

定義が異なるため、数字が一致しなくても片方を誤りと決めつけない。

## X導線

X投稿からリンクする場合は、必要に応じてUTMを使う。

例:
`?utm_source=x&utm_medium=social&utm_campaign=duofon`

既存投稿からの流入と検索流入を分けて観測する。

## AI検索観測

AI検索での露出は補助観測として扱う。

固定質問を使う場合は、
- サービス / モデル
- 日時
- 言語
- 地域
- 検索機能の有無

を記録する。

「自分のURLを質問文に入れて紹介された」結果は、自然発見と分ける。

## 成果判定

公開直後に成功判定しない。

次を別々に扱う。

1. 実装できた
2. 正常に公開できた
3. 発見・露出が増えた
4. 来訪が増えた
5. 他ページへ回遊した

数字が増えた場合も、X投稿、季節性、外部言及など別要因を確認する。
