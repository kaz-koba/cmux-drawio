# cmux-drawio 分割実装プラン

## Context

既存の単一プラン（`rippling-cooking-teapot.md`）を5つの独立したプランファイルに分割し、各プランごとに**TDD開発 → 実装 → Codexレビュー → 改善**のローテーションで進める。

現在の状態: スキャフォールディング済み（設定ファイルのみ、ソースコード0）。

## 開発サイクル（各プランごと）

```
1. RED    — 失敗するテストを書く
2. GREEN  — テストを通す最小限のコードを書く
3. REFACTOR — クリーンアップ
4. CODEX REVIEW — codex:codex-rescue エージェントでレビュー
5. IMPROVE — レビュー指摘を反映
```

TDD非対象のプラン（01, 05）は `実装 → Codexレビュー → 改善` のみ。

## プランファイル構成

```
.claude/plans/
  01-scaffolding.md          # 設定・スタブ作成（TDDなし）
  02-server.md               # サーバー実装（TDD）
  03-client.md               # クライアント実装（TDD＋静的ファイル）
  04-cli.md                  # CLI実装（TDD）
  05-integration-finish.md   # cmux.json・統合検証（TDDなし）
```

## 依存関係

```
01-scaffolding
      │
      ▼
02-server ──────────┐
      │              │
      ▼              ▼
03-client       04-cli
      │              │
      ▼              ▼
05-integration-finish
```

## 各プランの概要

### 01-scaffolding（TDDなし）

- [ ] 既存設定ファイルの整合性確認
- [ ] 空のソースファイルスタブ作成: `src/server.ts`, `src/bin.ts`, `src/client/index.html`, `src/client/main.ts`
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` が exit 0 で通ることを確認
- [ ] Codexレビュー → 改善

### 02-server（TDD）

対象: `src/server.ts`, `src/server.test.ts`（+ `src/pathUtils.ts`, `src/pathUtils.test.ts` 抽出の可能性）

**RED（テストを先に書く）:**
- [ ] パス検証テスト: `.drawio`拡張子チェック、相対パス拒否、パストラバーサル拒否、nullバイト拒否
- [ ] `GET /api/health`: 200返却
- [ ] `GET /api/file`: 正常系（xml, filename返却）、パス未指定400、不正拡張子400、ファイル未存在404、パストラバーサル400
- [ ] `POST /api/file`: 正常書き込み200、不正パス400、xml未指定400

**GREEN（最小実装）:**
- [ ] `validateDrawioPath()` 実装
- [ ] Honoアプリ: 3ルート実装（`mkdtemp`で実ファイルテスト、モックなし）

**REFACTOR → Codexレビュー → 改善**

### 03-client（TDD＋静的ファイル）

対象: `src/client/index.html`, `src/client/main.ts`, `src/client/main.test.ts`

**静的ファイル（TDDなし）:** `index.html` — iframe全画面コンテナ + CSS

**RED（テストを先に書く）:**
- [ ] `parsePathFromUrl()`: URLからpath取得、未指定時エラー
- [ ] `buildEmbedUrl()`: embed.diagrams.net URL生成
- [ ] `handleDrawioMessage()`: init/save/exitイベント処理、origin検証、不正メッセージ無視
- [ ] `createLoadAction()`: loadアクション生成

**GREEN（最小実装）:**
- [ ] テスト可能な純粋関数として抽出
- [ ] DOM操作は薄いグルーコードで接続

**REFACTOR → Codexレビュー → 改善**

### 04-cli（TDD）

対象: `src/bin.ts`, `src/bin.test.ts`（+ `src/cli.ts` 抽出の可能性）

**RED（テストを先に書く）:**
- [ ] 引数パース: `serve`/`open <path>`/引数なし/不明コマンド
- [ ] パス解決: 相対→絶対変換
- [ ] ポートファイル管理: 書き込み/読み取り/クリーンアップ

**GREEN（最小実装）:**
- [ ] 純粋関数で引数パース・パス解決
- [ ] `bin.ts`はエントリポイントとしてサーバー起動・`cmux browser open-split`呼び出し

**REFACTOR → Codexレビュー → 改善**

### 05-integration-finish（TDDなし）

- [ ] `cmux.json` 作成（コマンドパレット定義）
- [ ] ビルド検証: `pnpm build` → `dist/`完成、`dist/bin.js`実行可能
- [ ] スモークテスト: サーバー起動 → health check → ファイル読み書き → クライアントHTML配信
- [ ] `pnpm lint` 警告なし、`pnpm test` 全パス
- [ ] Codexレビュー → 改善

## 検証手順（最終）

1. `pnpm build` エラーなし
2. `pnpm lint` 警告なし
3. `pnpm test` 全テストパス
4. `pnpm start` → `/api/health` が200
5. ブラウザで `/?path=/path/to/test.drawio` → draw.ioエディタ表示
6. 編集 → 保存 → ファイル更新確認
7. `cmux-drawio open test.drawio` → ブラウザペインでエディタ起動

## 主要ファイル

- `src/server.ts` - Honoサーバー
- `src/client/main.ts` - postMessageクライアントロジック
- `src/client/index.html` - draw.io iframeホスト
- `src/bin.ts` - CLIエントリポイント
- `cmux.json` - cmuxコマンド定義
- `.claude/skills/test-driven-development/SKILL.md` - TDDスキル定義
