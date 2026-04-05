# 04-cli — CLI実装（TDD）

## Context

対象: `src/bin.ts`, `src/bin.test.ts`

TDDサイクル: RED → GREEN → REFACTOR → Codexレビュー → 改善

## タスク

### RED（テスト先行）

- [x] `src/bin.test.ts` 作成
  - [x] `parseArgs(["serve"])` → `{ command: "serve" }`
  - [x] `parseArgs(["open", "/abs/path.drawio"])` → `{ command: "open", filePath: "/abs/path.drawio" }`
  - [x] `parseArgs(["open", "./relative.drawio"])` → 絶対パスに解決される
  - [x] `parseArgs([])` → `{ command: "none" }`
  - [x] `parseArgs(["unknown-command"])` → `{ command: "unknown", raw: ["unknown-command"] }`
  - [x] `parseArgs(["open"])` → Errorをスローする（引数欠落の早期失敗）
  - [x] `buildOpenUrl(3000, "/path/to/file.drawio")` → 正しいURL生成
  - [x] `writePortFile` / `readPortFile`: 実ファイルI/O（mkdtemp使用）
  - [x] `readPortFile`: 非数値内容 → null
  - [x] `readPortFile`: 範囲外ポート（0, 65536）→ null
- [x] `pnpm test` が失敗することを確認（正しい理由で失敗すること）

### GREEN（最小実装）

- [x] `parseArgs()` 実装（open引数欠落で早期失敗）
- [x] `buildOpenUrl()` 実装
- [x] `writePortFile()` / `readPortFile()` 実装（ポート範囲検証付き）
- [x] メイン処理実装（serve: サーバー起動＋ポートファイル書き込み、open: cmux browser open-split呼び出し）
- [x] `pnpm test` が全パスすることを確認

### REFACTOR

- [x] コード整理（命名・型など）
- [x] `pnpm lint` が通ることを確認
- [x] `pnpm build` が通ることを確認

### Codexレビュー → 改善

- [x] codex:codex-rescue エージェントでレビュー
- [x] レビュー指摘の反映
  - `execSync` → `execFileSync` でコマンドインジェクション防止
  - `open` 引数欠落の早期失敗（エラースロー）
  - `readPortFile` でポート番号の範囲検証追加（1-65535）
  - `server.address()` の暗黙フォールバック排除（不正時は即失敗）
  - `readPortFile` の非数値・範囲外テストケース追加
- [x] 非対応指摘（意図的にスキップ）
  - main関数分岐のユニットテスト: `serve`/`open`のメイン処理は副作用（サーバー起動・execFile）を含み、注入可能な設計へのリファクタリングが必要。ローカル開発者ツールとして現在のシンプルな構造を優先し、スキップ

## 主要ファイル

- `src/bin.ts`
- `src/bin.test.ts`

## 検証コマンド

```bash
pnpm test
pnpm lint
pnpm build
```
