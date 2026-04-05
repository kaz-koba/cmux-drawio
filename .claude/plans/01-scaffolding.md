# 01-scaffolding — 設定確認・ソースファイルスタブ作成

## Context

設定ファイルはすでに存在する。このプランでは、ソースコードの空スタブを作成してビルド・lint・テストが正常に動作することを確認する。TDDは適用しない（テスト可能なロジックが存在しないため）。

## タスク

- [x] 既存設定ファイルの整合性確認（tsconfig, vite.config, biome.json, package.json）
- [x] スタブファイル作成
  - [x] `src/server.ts` — Honoアプリのエクスポートのみ
  - [x] `src/bin.ts` — エントリポイントのみ
  - [x] `src/client/index.html` — 最小HTML
  - [x] `src/client/main.ts` — 空のエントリポイント
- [x] `pnpm build` が exit 0 で通ること
- [x] `pnpm lint` が exit 0 で通ること
- [x] `pnpm test` が exit 0 で通ること（テスト0件でも可）
- [x] Codexレビュー（codex:codex-rescue）
- [x] レビュー指摘の反映
  - tsup追加・ビルドスクリプト整備（typecheck/build:client/build:node）
  - tsconfig.jsonからemit設定削除
  - tsconfig.node.jsonにvitest.config.tsを追加
  - vitest.config.tsにpassWithNoTests: true追加

## 主要ファイル

- `src/server.ts`
- `src/bin.ts`
- `src/client/index.html`
- `src/client/main.ts`
- `package.json` — scriptsの確認
- `tsconfig.json` / `tsconfig.node.json` — パス整合性確認
- `vite.config.ts` — クライアントビルド設定

## 検証コマンド

```bash
pnpm build
pnpm lint
pnpm test
```
