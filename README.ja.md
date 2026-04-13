[English](README.md) | [日本語](README.ja.md)

# cmux-drawio

[cmux](https://cmux.com/ja) のブラウザペインで `.drawio` ファイルを編集するプラグインです。

[draw.io](https://www.drawio.com/) の embed mode を iframe で埋め込み、ローカル Node.js サーバーがファイル I/O を仲介します。

## Overview

`cmux-drawio` は、cmux のブラウザペインで draw.io エディタを開き、編集結果をローカルの `.drawio` ファイルへ保存します。

- CLI がローカルサーバーを起動または再利用し、対象ファイルを cmux で開きます。
- クライアントページが draw.io iframe をホストし、`postMessage` で通信します。
- サーバーがローカル HTTP API 経由で `.drawio` ファイルを読み書きします。

## Setup

```bash
pnpm install
pnpm build
```

## Usage

### ファイルを開く

```bash
cmux-drawio open <file.drawio>
```

指定した `.drawio` ファイルを cmux のブラウザペインで開きます。サーバーが未起動の場合は、自動でバックグラウンド起動します。

### サーバーを手動起動する

```bash
cmux-drawio serve
```

ローカルサーバーを明示的に起動します。cmux のコマンドパレットから `Draw.io: サーバー起動` を実行しても起動できます。

## Architecture

```text
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
│                        │ (Hono on Node.js) │           │
│                        └─────────┬─────────┘           │
│                                  │ ファイル I/O         │
│                           ┌──────▼──────┐              │
│                           │ .drawio     │              │
│                           │ ファイル    │              │
│                           └─────────────┘              │
└────────────────────────────────────────────────────────┘
```

### Components

| コンポーネント | ファイル | 役割 |
| --- | --- | --- |
| CLI | `src/bin.ts` | `serve` と `open` サブコマンドを提供します。 |
| Server | `src/server.ts` | `.drawio` ファイルの読み書き API と静的ファイル配信を担当します。 |
| Client | `src/client/` | draw.io iframe をホストし、`postMessage` API で通信します。 |

### Data Flow

1. `cmux-drawio open <file>` でサーバー稼働を確認し、未起動ならバックグラウンド起動します。
2. ファイルパスを URL クエリパラメータに変換し、`cmux browser open-split` でブラウザペインを開きます。
3. クライアントが `GET /api/file?path=...` で XML を取得します。
4. draw.io iframe に `postMessage` で XML をロードします。
5. ユーザーが保存すると、`POST /api/file` で更新後の XML をディスクへ書き込みます。

## Development

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm format
```

## Tech Stack

- TypeScript + Node.js
- [Hono](https://hono.dev/) + `@hono/node-server`
- [Vite](https://vite.dev/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- pnpm
