# 03-client — クライアント実装（TDD）

## Context

対象: `src/client/main.ts`, `src/client/main.test.ts`
静的ファイル: `src/client/index.html`（TDDなし、スタブ更新）

TDDサイクル: RED → GREEN → REFACTOR → Codexレビュー → 改善

## タスク

### 静的ファイル更新

- [x] `src/client/index.html`: iframeを含む全画面コンテナに更新

### RED（テスト先行）

- [x] `src/client/main.test.ts` 作成
  - [x] `parsePathFromUrl()`: URLからpath取得
  - [x] `parsePathFromUrl()`: path未指定→Errorスロー
  - [x] `parsePathFromUrl()`: path空文字→Errorスロー
  - [x] `buildEmbedUrl()`: 正しいURL文字列を返す
  - [x] `createLoadAction()`: loadアクションJSONを返す
  - [x] `createLoadAction()`: 特殊文字含むXMLも正しくシリアライズ
  - [x] `handleDrawioMessage()`: 不正origin → 無視
  - [x] `handleDrawioMessage()`: 非文字列data → 無視
  - [x] `handleDrawioMessage()`: 不正JSON → 無視
  - [x] `handleDrawioMessage()`: saveイベント → onSave呼び出し
  - [x] `handleDrawioMessage()`: exitイベント → onExit呼び出し
  - [x] `handleDrawioMessage()`: initイベント → 無視
- [x] `pnpm test` が失敗することを確認（正しい理由で失敗すること）

### GREEN（最小実装）

- [x] 純粋関数4つを実装（parsePathFromUrl, buildEmbedUrl, createLoadAction, handleDrawioMessage）
- [x] DOMグルーコード実装（initEditor: iframe生成、postMessage/fetch連携）
- [x] `pnpm test` が全パスすることを確認

### REFACTOR

- [x] コード整理（命名・型など）
- [x] `pnpm lint` が通ることを確認
- [x] `pnpm build` が通ることを確認

### Codexレビュー → 改善

- [x] codex:codex-rescue エージェントでレビュー
- [x] レビュー指摘の反映
  - `fetch` の `res.ok` 確認追加（GET/POST両方）
  - サーバー応答の実行時型検証（xml が string であることを確認）
  - `iframe.contentWindow` null チェック（早期失敗）
  - テスト: スキーマ不正JSON（{}、[]等）→ 無視
  - テスト: saveイベントでxmlが欠落/非文字列 → 無視
  - テスト: 未知イベント（autosave等）→ 無視
- [x] 非対応指摘（意図的にスキップ）
  - `event.source` 検証: handleDrawioMessageにiframe参照を渡す設計変更が必要。ローカル開発者ツールとして現在のシンプルな構造を優先
  - initフロー・fetchエラーのDOMグルーテスト: jsdomモックが必要で副作用テストになるため、モック禁止ルールに従いスキップ
  - メッセージ解釈ロジックの二重化解消: 現在の構造で十分に読みやすく、リファクタリングのコストが高いためスキップ

## 主要ファイル

- `src/client/main.ts`
- `src/client/main.test.ts`
- `src/client/index.html`

## 検証コマンド

```bash
pnpm test
pnpm lint
pnpm build
```
