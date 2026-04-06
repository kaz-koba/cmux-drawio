# cmux-drawio

[cmux](https://cmux.com/ja)のブラウザペインで`.drawio`ファイルを編集するプラグイン。

[draw.io](https://www.drawio.com/)のembed modeをiframeで埋め込み、ローカルNode.jsサーバーがファイルI/Oを仲介する構成。

## セットアップ

```bash
pnpm install
pnpm build
```

## 使い方

### ファイルを開く

```bash
cmux-drawio open <file.drawio>
```

指定した`.drawio`ファイルをcmuxのブラウザペインで開く。サーバーが未起動の場合は自動でバックグラウンド起動する。

### サーバーを手動起動する（任意）

```bash
cmux-drawio serve
```

ローカルサーバーを明示的に起動する。cmuxのコマンドパレットから「Draw.io: サーバー起動」でも可能。

## アーキテクチャ

```
┌────────────────────────────────────────────────────────┐
│ cmux                                                   │
│  ┌──────────────┐   ┌───────────────────────────────┐  │
│  │ ターミナル   │   │ ブラウザペイン                │  │
│  │              │   │  ┌─────────────────────────┐  │  │
│  │ $ cmux-drawio│   │  │ クライアント            │  │  │
│  │   open foo.  │   │  │  ┌───────────────────┐  │  │  │
│  │   drawio     │──▶│  │  │ draw.io iframe    │  │  │  │
│  │              │   │  │  │ (embed mode)      │  │  │  │
│  │              │   │  │  └───────────────────┘  │  │  │
│  │              │   │  └──────────┬──────────────┘  │  │
│  └──────────────┘   └────────────┼──────────────────┘  │
│                                  │ HTTP API             │
│                        ┌─────────▼─────────┐           │
│                        │ ローカルサーバー   │           │
│                        │ (Hono on Node.js)  │           │
│                        └─────────┬─────────┘           │
│                                  │ ファイルI/O          │
│                           ┌──────▼──────┐              │
│                           │ .drawio     │              │
│                           │  ファイル   │              │
│                           └─────────────┘              │
└────────────────────────────────────────────────────────┘
```

### コンポーネント

| コンポーネント | ファイル | 役割 |
|---|---|---|
| CLI | `src/bin.ts` | `serve`と`open`サブコマンドを提供 |
| サーバー | `src/server.ts` | `.drawio`ファイルの読み書きAPIと静的ファイル配信 |
| クライアント | `src/client/` | draw.ioのiframeをホストし、postMessage APIで通信 |

### データフロー

1. `cmux-drawio open <file>` でサーバー稼働を確認し、未起動ならバックグラウンド起動
2. ファイルパスをURLクエリパラムに変換し、`cmux browser open-split` でブラウザペインを開く
3. クライアントが`GET /api/file?path=...`でXMLを取得
4. draw.io iframeにpostMessageでXMLをロード
5. ユーザーが編集・保存すると`POST /api/file`でディスクに書き込み

## 開発

```bash
pnpm dev          # 開発モード（watch）
pnpm build        # プロダクションビルド
pnpm test         # テスト実行
pnpm lint         # lint
pnpm format       # フォーマット
```

## 技術スタック

- TypeScript + Node.js
- [Hono](https://hono.dev/) + @hono/node-server（HTTPサーバー）
- [Vite](https://vite.dev/)（クライアントビルド）
- [Biome](https://biomejs.dev/)（lint/format）
- [Vitest](https://vitest.dev/)（テスト）
- pnpm（パッケージ管理）
