# VINTAGE ALARM — Safe Refactor Audit

このブランチでは、本番デザイン・SEO・URL・表示内容を壊さず、1項目ずつ改善して毎回監査する。

## 絶対に壊さないもの

- 公開URLと既存アンカー
- HISTORYの文章・編集思想
- OWNER'S NOTEの既存表示
- `<details>`による折りたたみ
- CSS scroll-snap + 軽量な素JSカルーセル
- Astro静的生成
- SEO title / description / canonical / structured data
- スマホ表示

## 改善順序

1. HISTORY内の重複データを一元化する
   - MILESTONES / OWNER'S NOTES / RESEARCH / INDEX の同一情報を1か所で管理
   - HISTORYのカードとINDEXを同じデータから生成
   - 既存の文言・順序・リンクを変えない

2. HISTORY本文とUI構造を分離する
   - 文章をCMS編集可能なデータへ移す
   - Astro側はレイアウトと表示ロジックだけにする

3. Pages CMS対応をHISTORYへ拡張する
   - 文章・カード・出典のみ編集可能
   - CSS / JS / SEO構造はCMSから触れない

4. HISTORY固有CSSを整理する
   - inline styleをhistory-magazine.cssへ集約
   - 見た目を変えない

5. 画像運用を固定する
   - WebP/AVIF中心
   - 一覧サムネイルと高解像度画像を分離
   - lazy loading / width / height を標準化

6. URL生成と時計追加手順を簡略化する
   - 新規時計追加時の手入力箇所を最小化
   - 将来的な動的ルーティングを検討

## 各ステップの監査項目

- ビルド可能か
- 既存URLが変わっていないか
- HISTORYの表示文言が変わっていないか
- カード順序が変わっていないか
- アンカーリンクが維持されているか
- SEO情報が維持されているか
- スマホ向けCSSが維持されているか
- JavaScript量が増えていないか
- 同じ事実を複数箇所へ手入力していないか

## 監査ログ

### Step 1A — HISTORYカタログの単一ソースを追加

- 追加: `src/data/history-catalog.ts`
- 対象: MILESTONES / OWNER'S NOTES / RESEARCH / INDEX で重複する時計・テーマ情報
- 現行HISTORYのカード文言とINDEX文言を別フィールドで保持し、既存表示を変更せず移行できる形にした
- `PIERCE DUOFON` の2香箱表記を現行表示どおり保持
- この段階では `history/index.astro` から未参照。公開HTML・URL・SEO・CSS・JSには変更なし

#### Step 1A 監査結果

- 公開HTML変更: なし
- URL / anchor変更: なし
- SEO変更: なし
- CSS変更: なし
- JavaScript変更: なし
- 表示文言変更: なし
- ライブラリ追加: なし
- リスク: 未使用データファイル追加のみのため極小
- 次: Step 1Bで、まずINDEXだけをこのデータから生成し、出力一致を監査する。その後カード側へ広げる

### Step 1B — WATCH / RESEARCH INDEXをカタログから生成

- 変更: `src/pages/history/index.astro`
- 対象: HISTORY下部の `WATCH / RESEARCH INDEX` だけ
- `src/data/history-catalog.ts` の `historyCatalogByGroup` から MILESTONES / OWNER'S NOTES / RESEARCH の各項目を静的生成するようにした
- `hrefKind: 'hash'` は従来のページ内アンカーをそのまま使用し、`hrefKind: 'site'` は従来どおり `BASE_URL` を付与する
- INDEXのセクションID、見出し、レイアウト構造は変更していない
- Astroのビルド時にだけ展開されるため、クライアントJavaScriptの追加はない

#### Step 1B 監査結果

- 変更前ビルド: `npm run build` 成功（4ページ）
- 変更後ビルド: `npm run build` 成功（4ページ）
- 生成HTML: 変更前後の `dist/history/index.html` を全ページ比較し、タグ間の整形空白を正規化してHTMLエンティティを復号すると完全一致
- 生HTMLでの差は、動的出力による整形空白と、Astroがアポストロフを `&#39;` へエスケープする点のみ。DOMの意味と表示文字は同一
- 項目数 / 順序: MILESTONES 5件、OWNER'S NOTES 4件、RESEARCH 1件で完全一致
- 項目内容: `meta` / 名称 / INDEX文言 / `href` を全件照合し、完全一致
- URL / anchor: `#1910s` / `#1940s` / `#1950s` / `#1960s` と `pierce-duofon/` の生成URLは変更なし
- SEO: title / description / canonical / structured dataを含む全ページ意味比較で変更なし
- CSS変更: なし
- JavaScript変更: なし
- ライブラリ追加: なし
- main / 本番: 変更なし
- 次: MILESTONEカード側へ移行する前に、本Stepの差分を独立して保持する

## 方針

速度改善のためにフレームワークやライブラリを増やさない。
現在のAstro + CSS + 素JSを維持し、主に保守性・一貫性・CMS編集性を改善する。
