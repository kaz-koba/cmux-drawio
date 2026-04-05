# cmux-drawio 実装プラン

## Context

cmux上で.drawioファイルを編集できるプラグインを作成する。cmuxのブラウザペイン機能とdraw.ioのembed modeを組み合わせ、ローカルのNode.jsサーバーがファイルI/Oを仲介する構成。

## アーキテクチャ

```
┌─────────────┐     postMessage      ┌──────────────────────┐
│ draw.io     │◄────────────────────►│ Host HTML (client)   │
│ (iframe)    │  init/load/save/exit  │ - path解析           │
│ embed.      │                      │ - API呼び出し         │
│ diagrams.net│                      │ - メッセージ中継      │
└─────────────┘                      └──────────┬───────────┘
                                                │ fetch
                                     ┌──────────▼───────────┐
                                     │ Hono Server (Node.js)│
                                     │ 127.0.0.1:PORT       │
                                     │ GET /api/file        │
                                     │ POST /api/file       │
                                     └──────────┬───────────┘
                                                │ fs
                                     ┌──────────▼───────────┐
                                     │ .drawio ファイル      │
                                     └──────────────────────┘
```

**CLIフロー:** `cmux-drawio open diagram.drawio` → サーバー起動 → `cmux browser open-split http://127.0.0.1:PORT/?path=...`

## プロジェクト構成

```
cmux-drawio/
├── cmux.json              # cmuxコマンドパレット定義
├── package.json
├── tsconfig.json
├── vite.config.ts          # クライアントHTML/TSビルド用
├── biome.json
├── .gitignore
├── src/
│   ├── server.ts           # Honoサーバー（ファイルI/O API）
│   ├── bin.ts              # CLIエントリ（serve / open）
│   └── client/
│       ├── index.html      # draw.io iframeホストページ
│       └── main.ts         # postMessage制御ロジック
└── dist/                   # ビルド出力
```

## サーバー API

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/` | GET | クライアントHTML配信 |
| `/api/file` | GET | `?path=<abs-path>` で.drawioファイル読み込み → `{xml, filename}` |
| `/api/file` | POST | `{path, xml}` で.drawioファイル書き込み → `{ok: true}` |
| `/api/health` | GET | ヘルスチェック |

セキュリティ: `127.0.0.1`バインドのみ、パス検証（.drawio拡張子チェック）

## クライアント postMessage フロー

1. draw.ioが`{event:"init"}`を送信 → クライアントがサーバーからXML取得 → `{action:"load", xml}`を返送
2. ユーザーが保存 → `{event:"save", xml}` → クライアントがサーバーにPOST
3. ユーザーが終了 → `{event:"exit"}` → エディタ終了表示

origin検証: `event.origin === "https://embed.diagrams.net"`

## ファイルパス受け渡し

CLI引数 → URL query param `?path=` → クライアントがAPIリクエスト時に付与

複数ファイルの同時編集をサポート（サーバー側にセッション状態なし）

## 依存パッケージ

**本番:** `hono`, `@hono/node-server`
**開発:** `vite`, `typescript`, `@biomejs/biome`, `vitest`, `tsx`

## 実装タスク

- [ ] **Step 1: プロジェクトスキャフォールディング**
  - `pnpm init` + `package.json` 設定
  - `tsconfig.json` (target: ES2022, module: ESNext, moduleResolution: bundler)
  - `biome.json` 作成
  - `vite.config.ts` 作成（`src/client/index.html`をエントリに、`dist/client/`へ出力）
  - `.gitignore` 作成
  - 依存インストール

- [ ] **Step 2: サーバー実装 (`src/server.ts`)**
  - Honoアプリ: `GET /api/file`, `POST /api/file`, `GET /api/health`
  - `GET /api/file`: `fs.readFile` → `{xml, filename}`返却
  - `POST /api/file`: パス検証 → `fs.writeFile` → `{ok: true}`
  - `dist/client/`の静的ファイル配信
  - `127.0.0.1`バインド

- [ ] **Step 3: クライアントHTML (`src/client/index.html`)**
  - フルビューポートiframeコンテナ
  - CSS: iframe全画面、パディング・スクロールバーなし

- [ ] **Step 4: クライアントロジック (`src/client/main.ts`)**
  - URL search paramsから`path`解析
  - draw.io embed URL でiframe生成
  - `message`イベントリスナー（origin検証付き）
  - `init`ハンドラ: サーバーからXML取得 → `load`アクション送信
  - `save`ハンドラ: サーバーにXML POST → 保存確認表示
  - `exit`ハンドラ: エディタ終了処理
  - エラーハンドリング（ファイル未存在、サーバー到達不能）

- [ ] **Step 5: CLIエントリ (`src/bin.ts`)**
  - `serve`サブコマンド: サーバー起動、ポート表示
  - `open <path>`サブコマンド: パス解決 → サーバー起動（or再利用） → `cmux browser open-split <url>`
  - 再利用: `/tmp/cmux-drawio.port`にポート保存、既存サーバーのヘルスチェック
  - グレースフルシャットダウン

- [ ] **Step 6: cmux.json 作成**
  - コマンドパレット用のワークスペースレイアウト定義

- [ ] **Step 7: テスト**
  - サーバールートのユニットテスト（Honoテストクライアント使用）
  - パス検証ロジックのテスト
  - パストラバーサル攻撃の防御テスト

- [ ] **Step 8: 仕上げ**
  - `biome check` パス確認
  - cmuxでのE2E動作確認

## コマンド一覧

```bash
pnpm dev        # 開発モード（watch）
pnpm build      # プロダクションビルド
pnpm start      # サーバー起動
pnpm lint       # biome check
pnpm format     # biome format --write
pnpm test       # vitest
```

## 検証手順

1. `pnpm build` がエラーなく完了すること
2. `pnpm lint` が警告なしで通ること
3. `pnpm test` が全テストパスすること
4. `pnpm start` → `http://127.0.0.1:PORT/api/health` が200を返すこと
5. ブラウザで `http://127.0.0.1:PORT/?path=/path/to/test.drawio` を開き、draw.ioエディタにファイル内容が表示されること
6. ダイアグラムを編集 → 保存 → ファイルが更新されていること
7. cmuxターミナルから `cmux-drawio open test.drawio` → ブラウザペインでエディタが開くこと
8. 複数ファイルを別ペインで同時編集できること

## 主要ファイル

- `src/server.ts` - Honoサーバー
- `src/client/main.ts` - postMessageクライアントロジック
- `src/client/index.html` - draw.io iframeホスト
- `src/bin.ts` - CLIエントリポイント
- `cmux.json` - cmuxコマンド定義
