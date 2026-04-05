# 05-integration-finish — cmux.json・統合検証（TDDなし）

## Context

対象: `cmux.json`
TDDなし: 実装 → 検証 → Codexレビュー → 改善

## タスク

### cmux.json 作成

- [x] `cmux.json` 作成（コマンドパレット定義）
  - Draw.io: サーバー起動（`cmux-drawio serve`）

### 統合検証

- [x] `pnpm build` → `dist/` 完成確認、`dist/bin.js` 実行可能確認
- [x] `pnpm lint` 警告なし
- [x] `pnpm test` 45テスト全パス
- [x] スモークテスト: サーバー起動 → `/api/health` 200確認 → ファイルI/O確認 → クライアントHTML配信確認

### Codexレビュー → 改善

- [x] codex:codex-rescue エージェントでレビュー
- [x] レビュー指摘の反映
  - `cmux.json` の「ポート3000」記述を修正（実際はOSが自動割り当て）
  - `dist/client` 未ビルド時の早期失敗を `src/bin.ts` に追加
- [x] 非対応指摘（意図的にスキップ）
  - `process.cwd()` 依存: プロジェクトルートから実行するCLIツールとして意図した動作
  - Promise resolve後のserverエラー監視: ローカル開発ツールとして許容範囲
  - 静的配信・起動ライフサイクルの統合テスト: 副作用テストのためモック禁止ルールに従いスキップ

## 主要ファイル

- `cmux.json`

## 検証コマンド

```bash
pnpm test
pnpm lint
pnpm build
node dist/bin.js serve &
curl -s http://127.0.0.1:3000/api/health
```
