# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

cmux-drawioは、cmux（macOS向けAIコーディングターミナル）のプラグインで、.drawioファイルをcmuxのブラウザペインで編集できるようにする。draw.ioのembed mode（`embed.diagrams.net`）をiframeで埋め込み、ローカルNode.jsサーバーがファイルI/Oを仲介する構成。

## アーキテクチャ

- **サーバー (`src/server.ts`)**: Hono on Node.js。`127.0.0.1`にバインドし、.drawioファイルの読み書きAPIと静的ファイル配信を担当
- **クライアント (`src/client/`)**: draw.ioのiframeをホストするHTMLページ。postMessage APIでdraw.ioエディタと通信し、サーバーAPIでファイルI/Oを行う
- **CLI (`src/bin.ts`)**: `serve`（サーバー起動）と`open <file>`（ファイルを開く）サブコマンド。`cmux browser open-split`でブラウザペインを開く

ファイルパスはCLI引数 → URLクエリパラム(`?path=`) → API呼び出しと受け渡される。サーバーはステートレスで、複数ファイルの同時編集をサポート。

## 開発コマンド

```bash
pnpm install    # 依存インストール
pnpm dev        # 開発モード（watch）
pnpm build      # プロダクションビルド
pnpm start      # サーバー起動
pnpm lint       # biome check
pnpm format     # biome format --write
pnpm test       # vitest実行
```

## 技術スタック

- TypeScript + Node.js
- Hono（HTTPサーバー）+ @hono/node-server
- Vite（クライアントビルド）
- Biome（lint/format）
- Vitest（テスト）
- pnpm（パッケージ管理）

## draw.io Embed Mode

- URL: `https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=1&saveAndExit=1`
- 通信: postMessage（JSON形式、`proto=json`指定時）
- イベント: `init`（エディタ準備完了）→ `load`アクション送信、`save`（保存）、`exit`（終了）
- origin検証: `event.origin === "https://embed.diagrams.net"`
- ドキュメント: https://www.drawio.com/doc/faq/embed-mode

## cmux連携

- `cmux browser open-split <url>`: ブラウザペインを開く
- `cmux.json`: コマンドパレット定義
- ドキュメント: https://cmux.com/docs/custom-commands, https://cmux.com/docs/browser-automation
