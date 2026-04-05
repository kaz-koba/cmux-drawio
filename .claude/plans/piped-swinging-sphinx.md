# TDDスキルをcmux-drawioに導入する

## Context

`my-dev-prj/main` リポジトリにあるTDDスキル（`test-driven-development`）を、`cmux-drawio` リポジトリでも活用したい。元スキルはReact/Playwright向けのプロジェクト固有パターンを含んでいるため、cmux-drawio（Hono + Vite + Vitestのサーバー/クライアント構成）向けに適応する必要がある。

## 作業内容

- [x] `.claude/skills/test-driven-development/SKILL.md` を作成
  - 元スキルのコア部分（TDDの原則、Red-Green-Refactorサイクル、良いテストの基準、よくある言い訳、危険信号）はそのまま維持
  - 「このプロジェクト固有のパターン」セクションを以下に差し替え：
    - **ファイル配置**: `*.test.ts`（ソースと同じディレクトリに配置）
    - **Honoサーバーのテスト**: `app.request()` を使ったHTTPエンドポイントテストのRED例
    - **ファイルI/Oのテスト**: `node:fs` のモックパターン（一時ディレクトリ `mkdtemp` で実ファイルを使うか、`vi.mock` を使うか）
    - **テストコマンド**: `pnpm test`（vitest run）
  - 完了チェックリストはそのまま維持（テストコマンドは `pnpm test` で同じ）

- [x] `.claude/skills/test-driven-development/testing-anti-patterns.md` を作成
  - 元ファイルの汎用的なアンチパターン（1〜5）はそのまま維持
  - 例コードをcmux-drawioの文脈に差し替え（Hono APIルート、drawioファイル操作など）

## 変更の方針

- スキルの核心（TDDの哲学・ルール・サイクル）は**一切変更しない**
- プロジェクト固有パターンのみをcmux-drawioの技術スタックに合わせる
- React/Playwright関連の例を、Hono/Node.js/ファイルI/O関連の例に置換

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `.claude/skills/test-driven-development/SKILL.md` | 新規作成 |
| `.claude/skills/test-driven-development/testing-anti-patterns.md` | 新規作成 |

## 検証

- スキルファイルの内容を確認し、SKILL.mdのフロントマターが正しい形式であること
- プロジェクト固有の例がcmux-drawioの技術スタック（Hono, Vitest, Node.js）と整合していること
