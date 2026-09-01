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

## 方針

速度改善のためにフレームワークやライブラリを増やさない。
現在のAstro + CSS + 素JSを維持し、主に保守性・一貫性・CMS編集性を改善する。
