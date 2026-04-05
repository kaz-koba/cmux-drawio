# 02-server — サーバー実装（TDD）

## Context

対象: `src/server.ts`, `src/server.test.ts`（パス検証ロジックは同ファイル内または `src/pathUtils.ts` に抽出可）

TDDサイクル: RED → GREEN → REFACTOR → Codexレビュー → 改善

## タスク

### RED（テスト先行）

- [x] `src/server.test.ts` 作成
  - [x] `validateDrawioPath()`: `.drawio`拡張子チェック
  - [x] `validateDrawioPath()`: 相対パス拒否
  - [x] `validateDrawioPath()`: パストラバーサル拒否（`..` 含む）
  - [x] `validateDrawioPath()`: nullバイト拒否
  - [x] `GET /api/health`: 200返却
  - [x] `GET /api/file`: 正常系（xml, filename返却）
  - [x] `GET /api/file`: path未指定 → 400
  - [x] `GET /api/file`: 不正拡張子 → 400
  - [x] `GET /api/file`: ファイル未存在 → 404
  - [x] `GET /api/file`: パストラバーサル → 400
  - [x] `POST /api/file`: 正常書き込み → 200
  - [x] `POST /api/file`: 不正パス → 400
  - [x] `POST /api/file`: xml未指定 → 400
- [x] `pnpm test` が失敗することを確認（正しい理由で失敗すること）

### GREEN（最小実装）

- [x] `validateDrawioPath()` 実装
- [x] `GET /api/health` 実装
- [x] `GET /api/file` 実装（`node:fs/promises` で実ファイル読み取り）
- [x] `POST /api/file` 実装（`node:fs/promises` で実ファイル書き込み）
- [x] `pnpm test` が全パスすることを確認

### REFACTOR

- [x] コード整理（抽出・命名・型など）
- [x] `pnpm lint` が通ることを確認
- [x] `pnpm build` が通ることを確認

### Codexレビュー → 改善

- [x] codex:codex-rescue エージェントでレビュー
- [x] レビュー指摘の反映
  - readFile エラーを ENOENT のみ 404、それ以外は 500 に変更
  - writeFile に try/catch 追加（権限不足等で 500 を返す）
  - パストラバーサル判定コメントを実装と一致させる
  - POST 正常系テストに readFile で書き込み内容を検証する assertion を追加
  - 不正 JSON ボディ → 400 のテストケース追加
- [x] 非対応指摘（意図的にスキップ）
  - 許可ディレクトリ制約: ローカル開発者ツールとして意図的にシンプルにする
  - Origin/Content-Type 検証: 127.0.0.1 バインドのローカルサーバーのため後回し

## 主要ファイル

- `src/server.ts`
- `src/server.test.ts`

## 検証コマンド

```bash
pnpm test
pnpm lint
pnpm build
```
