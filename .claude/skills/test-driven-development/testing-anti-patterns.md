# テストのアンチパターン

モックやテストユーティリティを追加する前にこのファイルを読むこと。

## アンチパターン 1：モックの動作をテストしている

実際のコードではなく、モックが正しく呼ばれたかをテストしてしまう。

**悪い例：**
```typescript
it("drawioファイルを読み込む", () => {
  // 前提条件: モック関数を作成
  const mockReadFile = vi.fn().mockResolvedValue("<mxGraphModel/>");

  const result = mockReadFile("/tmp/設計図.drawio");

  // 検証: モックが呼ばれたことをテスト（実際の動作ではない）
  expect(mockReadFile).toHaveBeenCalledWith("/tmp/設計図.drawio");
  expect(mockReadFile).toHaveBeenCalledTimes(1);
});
```

**良い例：**
```typescript
it("drawioファイルが存在するとき、ファイル内容を返す", async () => {
  // 前提条件: 一時ディレクトリに実際のファイルを作成
  const tmpDir = await mkdtemp(join(tmpdir(), "cmux-drawio-test-"));
  const filePath = join(tmpDir, "設計図.drawio");
  await writeFile(filePath, "<mxGraphModel/>", "utf-8");

  // 検証: 実際の動作をテスト
  const result = await readDrawioFile(filePath);
  expect(result).toBe("<mxGraphModel/>");
});
```

**確認フロー：**
モックを追加する前に自問すること：
1. このモックはなぜ必要か？
2. 実際のファイルや一時ディレクトリを使ってテストできないか？
3. テストしているのはモックの動作か、実際の動作か？

モックの動作をテストしているなら → 実際のコードを使うようにテストを書き直すこと。

## アンチパターン 2：テスト専用メソッドを本番コードに追加している

テストのためだけに本番クラスやモジュールに公開メソッドを追加する。

**悪い例：**
```typescript
// 本番コード
export class FileManager {
  async readFile(filePath: string): Promise<string> {
    // ...
  }

  // テスト用（本来不要）
  _getCache() {
    return this.cache;
  }
}

// テストコード
it("内部キャッシュを確認する", () => {
  const mgr = new FileManager();
  const cache = mgr._getCache();
  expect(cache).toBeDefined();
});
```

**良い例：**
```typescript
// 本番コード：テスト専用メソッドなし
export class FileManager {
  async readFile(filePath: string): Promise<string> {
    // ...
  }
}

// テストコード：公開 API のみを使用
it("同じファイルを2回読み込んだとき、同じ内容を返す", async () => {
  // 前提条件: 一時ファイルを作成
  const filePath = join(tmpDir, "ネットワーク構成図.drawio");
  await writeFile(filePath, "<mxGraphModel/>", "utf-8");
  const mgr = new FileManager();

  // 検証: 公開 API の戻り値のみを確認
  const first = await mgr.readFile(filePath);
  const second = await mgr.readFile(filePath);
  expect(first).toBe(second);
});
```

**確認フロー：**
テスト専用メソッドを追加する前に自問すること：
1. このメソッドは本番コードで使われるか？
2. 公開 API だけでテストできないか？
3. テストが難しい場合、設計を見直す必要はないか？

公開 API でテストできない場合 → 設計が複雑すぎる可能性がある。インターフェースを見直すこと。

## アンチパターン 3：依存関係を理解せずにモックしている

依存関係の動作を理解しないままモックし、実際と異なる動作をテストしてしまう。

**悪い例：**
```typescript
it("ファイルに保存する", async () => {
  // 依存関係を理解せずにモック
  const mockFs = {
    writeFile: vi.fn(),
    readFile: vi.fn(),
  };
  vi.mock("node:fs/promises", () => mockFs);

  await saveDrawioFile("/tmp/設計図.drawio", "<mxGraphModel/>");

  // モックが呼ばれたことのみ確認（実際の保存内容を確認していない）
  expect(mockFs.writeFile).toHaveBeenCalled();
});
```

**良い例：**
```typescript
// 実際のファイルシステムを使って動作を確認する
it("drawioファイルを保存したとき、その内容をファイルから読み出せる", async () => {
  // 前提条件: 一時ディレクトリにファイルパスを用意
  const filePath = join(tmpDir, "設計図.drawio");
  const content = "<mxGraphModel><root/></mxGraphModel>";

  await saveDrawioFile(filePath, content);

  // 検証: 実際にファイルから読み出せること
  const saved = await readFile(filePath, "utf-8");
  expect(saved).toBe(content);
});
```

**確認フロー：**
モックを追加する前に自問すること：
1. モック対象の実際の動作を理解しているか？
2. 一時ディレクトリ（`mkdtemp`）を使って実ファイルでテストできないか？
3. 実際の依存関係をそのまま使えないか？

依存関係を理解していない場合 → まず実際のコードを読んで動作を把握すること。

## アンチパターン 4：不完全なモックデータを使っている

実際のデータ構造と異なる不完全なオブジェクトをテストデータとして使い、本番では起きないケースをテストしてしまう。

**悪い例：**
```typescript
it("ファイル情報を表示する", () => {
  // 実際の型と異なる不完全なデータ
  const fakeFile = { path: "/tmp/設計図.drawio" }; // size, mtime などが欠落

  const result = formatFileInfo(fakeFile as DrawioFile);

  expect(result).toContain("設計図.drawio");
});
```

**良い例：**
```typescript
it("drawioファイル情報を整形したとき、ファイル名とサイズが含まれる", () => {
  // 前提条件: 実際のデータ構造に準拠したテストデータ
  const 設計図ファイル: DrawioFile = {
    path: "/home/user/設計図.drawio",
    size: 1024,
    mtime: new Date("2024-01-01"),
  };

  // 検証: 整形結果にファイル名とサイズが含まれること
  const result = formatFileInfo(設計図ファイル);
  expect(result).toContain("設計図.drawio");
  expect(result).toContain("1024");
});
```

**確認フロー：**
テストデータを作成する前に自問すること：
1. 型定義と一致しているか？
2. 省略したフィールドはテスト対象の動作に影響しないか？
3. 実際のファイルから生成したデータを使えないか？

## アンチパターン 5：統合テストを後回しにしている

ユニットテストだけ書いて、HTTPエンドポイント全体の動作確認を後回しにする。

**悪い例：**
ファイル読み込みロジック単体のユニットテストのみ書き、実際のHTTPリクエストでの動作確認を省略する。

**良い例：**
```typescript
// ユニットテスト：ロジック単体
it("drawioパスのバリデーションが正しく動作する", () => {
  expect(isValidDrawioPath("/tmp/設計図.drawio")).toBe(true);
  expect(isValidDrawioPath("/tmp/image.png")).toBe(false);
});

// 統合テスト：HTTPエンドポイント全体
it("GET /api/file に存在するパスを渡したとき200を返す", async () => {
  // 前提条件: 実際のファイルを用意してHonoアプリにリクエスト
  const filePath = join(tmpDir, "設計図.drawio");
  await writeFile(filePath, "<mxGraphModel/>", "utf-8");

  const response = await app.request(`/api/file?path=${encodeURIComponent(filePath)}`);

  // 検証: 200でファイル内容が返ること
  expect(response.status).toBe(200);
});
```

**確認フロー：**
ユニットテストを書いた後に自問すること：
1. HTTPエンドポイントとしての動作も確認できているか？
2. クライアントからのリクエスト〜レスポンスの流れを確認すべき動作はないか？
3. ファイルI/Oを含む一連の処理が正しく機能するか？

## まとめ

| アンチパターン | 確認ポイント |
|---|---|
| モックの動作をテスト | 実際のコードの動作をテストしているか |
| テスト専用メソッド | 公開 API だけでテストできるか |
| 理解なしのモック | 一時ディレクトリで実ファイルを使えないか |
| 不完全なデータ | 型定義と一致しているか |
| 統合テスト後回し | HTTPエンドポイントレベルでも確認できているか |
