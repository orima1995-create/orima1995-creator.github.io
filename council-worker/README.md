# Council Worker

COUNCIL LAB の実AIバックエンド用 Cloudflare Worker。

## 何をするか

- `QUICK`: 複数住民が独立回答 → 一部が相互反論
- `PROJECT SOURCES`: OpenAI File Search の Vector Store を優先して同様に議論
- `DEEP WEB ×10`: 10住民が独立して Web Search → 10住民が別レスへ反論し必要なら再検索 → 議長が争点整理

フロント側がローカルデモのときは、このWorkerは呼ばれない。

## 必須

Cloudflare Worker secret:

- `OPENAI_API_KEY`

任意:

- `COUNCIL_VECTOR_STORE_ID` — Alarm am Arm / The Alarm Wristwatch 等を格納した OpenAI Vector Store ID
- D1 binding `DB` — スレを短い共有IDで保存したい場合

APIキーはGitHubやブラウザへ置かない。Cloudflare Worker Secretへ保存する。

## エンドポイント

- `GET /health`
- `POST /api/council`
- `GET /api/thread/:id`（D1接続時）

## SOURCE PACK

Project PDFを実際に参照させる場合、対象ファイルをOpenAI Vector Storeへ登録し、`COUNCIL_VECTOR_STORE_ID`をWorkerに設定する。未設定時はFile Searchを使わず、資料を読んだふりもしない。

## D1

`schema.sql` を適用し、`wrangler.jsonc` にD1 bindingを追加する。

## 注意

`DEEP WEB ×10` は最大で、初回10リクエスト + 相互反論10リクエスト + 議長1リクエストを行う。通常モードより時間・APIコストが大きい前提の設計。
