# VINTAGE ALARM — 実験ログ

## 2026-09-09｜CYMA関連X投稿 → サイト導線

### X側 初動

投稿19分時点:

- Impressions: 11
- Engagements: 5
- Detail expands: 3
- Link clicks: 2

確定して言えること:
- 投稿からリンククリックが2回発生した。

言ってはいけないこと:
- 「CYMAへ2人到達した」
- 「CYMAへ7人来た」
- 「CloudflareのX / SNS 7はこの投稿由来」

X AnalyticsのLink clicksとCloudflare Web AnalyticsのVisitsは定義・期間が違う。

### 同時期に確認した旧ダッシュボード 7D表示

- Page views: 13
- Visits: 11
- Watch pages: 7
- X / SNS: 7
- Pierce Duofon: 7
- Cyma Time-O-Vox: 表示なし
- TOP: 4
- HISTORY: 1
- OWNER'S NOTES: 1

### 問題提起

CYMA関連投稿の直後なのに、7Dダッシュボード上ではPierce Duofon 7のみがWATCHとして表示された。

この時点では以下を区別できないため、マッピング不具合と断定しない。

仮説:
1. 7D集計に過去のDuofon流入が混ざっている
2. Xの2クリックがCloudflareへまだ反映されていない
3. X投稿内リンクの実際のdestinationがCYMAではない
4. beacon読み込み前離脱・ブロック等でX clickとRUM arrivalが一致しない
5. requestPathの表記揺れでCYMAの表示名変換に失敗している
6. 管理者自身のアクセスが初期値へ混在している

### 検証方法

ダッシュボードを以下へ改修する。

- 1H / 3H / 24H / 7D / 30D
- raw requestPathを必ず残す
- URL正規化
- UNMAPPED path警告
- requestPath + refererHost + refererPathの同時集計
- ENTRY SOURCE → PAGE
- SITE FLOW
- raw Referrer host / path
- 管理者ブラウザのCloudflare beacon opt-out

CYMA判定は、
`X referrer → /cyma-time-o-vox/`
が同じ集計行で確認できてから行う。

### 判定保留

現時点では、
「X投稿で2リンククリック発生」
までは確定。

「その2クリックがCYMAへ何件到達したか」は未確認。
