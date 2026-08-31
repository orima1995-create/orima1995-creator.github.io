# VINTAGE ALARM — 編集・実装ルール

## 原則

- 資料で確認した事実を書く。必要な関係だけ示し、そこで止める。
- 未確認事項は断定しない。資料間の差は差のまま扱う。
- OWNER'S NOTE原文は、明示指示なしに改変しない。
- キャッチコピー、感想、意味づけ、読者への煽りをAIが追加しない。
- 「面白いのは」「つまり」「単なる〜ではない」「現代につながる」等の編集的解釈を追加しない。
- OWNER'S NOTEのキャッチをDEEP DIVEで回収・説明しない。
- 通常の確定事実では著者名・文献名を本文で連呼しない。文献差そのものが論点の場合のみ本文で区別する。

## サイト階層

- `HISTORY`：時代と技術上の問題を追う全体史。
- `THEMES`：音、防水、香箱、通知などを横断して読む。
- `OWNER'S NOTES / WATCH`：実機・個体から読む。
- `DEEP DIVE`：個別時計の機構、変遷、文献差、供給関係などを掘る。
- HISTORY本文で個別時計のDEEP DIVEまで説明しない。必要ならWATCHページへ送る。

## HISTORY

- 主題は「アラームを、腕へ。」。
- 年表を並べるだけではなく、腕時計へ載せる際に発生した小型化・動力・設定・音響・ケース・装着時の可聴性などの問題を軸にする。
- 1950年代を中心章として扱い、Vulcain Cricket / Jaeger-LeCoultre Memovox / Pierce Duofon / Cyma Time-O-Vox / Citizen Alarmなど、異なる構造上の回答を並べる。
- HISTORYからWATCHへリンクし、WATCHから該当時代のHISTORYへ戻れるようにする。
- 最終章の見出しは「現状の到達点」。入口では皮肉やオチを説明しない。
- SMARTWATCHページは通常の歴史章として入場させ、ページ内部でのみ通知過多のビジュアルを見せる。
- SMARTWATCHを機械式アラーム腕時計の直接的な系譜として断定しない。
- SMARTWATCH画像の前に「通知地獄」「皮肉」などのネタバレ見出しを追加しない。

## WATCHページ固定順序

1. Header / Title / Catch
2. OWNER'S NOTE
3. SPEC
4. 実機鳴動（YouTube 1本 + Original post on X）
5. DEEP DIVE
6. 参考資料・出典

## SPEC

固定ラベル：年代 / ケースサイズ / Cal / 石 / 振動 / 香箱 / 手巻き / 音響 / 特記事項。
ラベルをAI判断で言い換えない。

## 実機鳴動

- 動画は1本。
- WECKER / SIGNALの別プレイヤーや説明カードを追加しない。
- 自動再生しない。

## コード変更範囲

- 通常の記事追加・文章修正：`src/content/watches/` と `public/images/` を中心に変更する。
- HISTORYの追加・修正：`src/pages/history/` と、必要なHISTORY用画像を変更する。
- デザイン変更の明示指示がある場合のみ：`src/components/`、`src/layouts/`、`src/styles/` を変更可。
- 一つの記事修正を理由に共通テンプレートを勝手に変更しない。

## モバイル

- 基準幅は390px。320pxでも横スクロールを発生させない。
- 日本語本文は `line-break: strict` / `word-break: normal` を基準とし、`break-all` を使わない。
- 本文へ見た目調整だけを目的とした `<br>` を追加しない。
- タイトルやキャッチなど意図した行単位は構造側で固定する。

## 検索・公開の最低基準

- TOP / HISTORY / WATCH / SMARTWATCHは、それぞれ固有の `title` と `description` を持つ。
- 公開ページには canonical URL を付ける。
- OGP / Twitter Cardの基本メタデータを付ける。利用できる実画像があるページは `og:image` を設定する。
- `robots.txt` でクロールを許可し、`sitemap.xml` を明示する。
- 検索対象ページを追加したら `sitemap.xml` にURLを追加する。
- TOPは `WebSite`、HISTORYは `Article`、WATCH / SMARTWATCHは `CreativeWork` を基本に構造化データを付ける。階層ページには `BreadcrumbList` を付ける。
- 検索用タイトルやdescriptionに未確認事項・過剰主張を追加しない。
- SEO目的で本文を水増ししない。本文の編集品質と検索メタデータを分離する。

## 公開前確認

- Astro build成功。
- TOP / HISTORY / WATCH / SMARTWATCHの必要ページが生成される。
- WATCHではタイトル、OWNER'S NOTE、SPEC、動画、DEEP DIVE、出典が存在する。
- HISTORYからWATCH、WATCHからHISTORYの往復リンクが存在する。
- `robots.txt` と `sitemap.xml` が生成物に存在する。
- canonical / description / OGP / 構造化データが主要ページに存在する。
- `data:image/...base64` を生成HTMLへ残さない。
- `word-break: break-all` を生成物へ入れない。
- 既存ページの原文を意図なく変更していない。
