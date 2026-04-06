---
name: cmux-drawio
description: .drawioファイルをcmuxのブラウザペインで開く。「drawioで開いて」「図を表示して」「ダイアグラムを編集して」などユーザーが明示的にdrawioの使用を指示した場合に使用する
---

# cmux-drawio: .drawioファイルを開く

## 前提条件

- cmux環境で実行されていること（`cmux browser open-split` を内部で使用する）

## ファイルを開く

```bash
cmux-drawio open <file>
```

- `<file>` は相対パス・絶対パスどちらも可（内部で絶対パスに変換される）
- `.drawio` 拡張子のファイルのみ対応
- サーバーが未起動の場合は自動起動するため、事前の `serve` コマンドは不要

## 例

```bash
cmux-drawio open ./diagrams/architecture.drawio
cmux-drawio open /Users/user/project/design.drawio
```

## エラー時の対処

| エラー | 対処 |
|--------|------|
| `サーバーの起動に失敗しました` | cmux-drawioが正しくインストールされているか確認する |
| `タイムアウトしました` | サーバープロセスが残っていないか確認し、リトライ |
