# Search Console 無料Import手順 — VINTAGE ALARM ANALYTICS

更新日: 2026-09-09

## 固定条件

Google Cloud / Billing account / Service Account / Search Console APIは使用しない。

Search Console本体の無料Exportだけを使う。

## 通常SEO

Search Console:
1. 対象propertyを開く
2. 検索パフォーマンスを開く
3. 比較したい期間を設定
4. Clicks / Impressions / CTR / Positionを表示
5. エクスポート
6. CSVを選択
7. ダウンロードされたCSVをVINTAGE ALARM ANALYTICSのDISCOVERY INBOXで「通常SEO」としてImport

複数CSVがある場合はまとめて選択する。

## Google生成AI

Search Console:
1. 生成AI Performance Reportを開く
2. 期間を設定
3. エクスポート
4. CSV
5. DISCOVERY INBOXで「Google生成AI」としてImport

## INDEX STATUS

主要6ページだけURL検査を行う。

- TOP
- HISTORY
- OWNER'S NOTES
- Basis Alarm
- Pierce Duofon
- Cyma Time-O-Vox

結果をダッシュボードのManual Index Statusで記録する。

## 保存先

現時点ではブラウザlocalStorage。

- GitHubへ送信しない
- Google Cloudへ送信しない
- API token不要
- Billing account不要

別ブラウザ/別端末では共有されない。
永続化は無料条件を監査してから別フェーズで行う。

## 読み方

Impressions 0 ≠ API失敗。
INDEX STATUSと分けて判断する。

Chart / Dateは全体KPI。
Page / Queryはドリルダウン。
両者の集計方法が違う場合があるため、単純合計で一致を要求しない。
