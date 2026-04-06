import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOpenUrl,
  isServerAlive,
  parseArgs,
  readPortFile,
  waitForPortFile,
  writePortFile,
} from "./bin.js";

// テスト用の一時ディレクトリ
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "cmux-drawio-cli-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------
// parseArgs: CLI引数パース関数のテスト
// -----------------------------------------------------------------------
describe("parseArgs", () => {
  it("serve コマンドを認識する", () => {
    // 前提: argv に "serve" のみ指定
    expect(parseArgs(["serve"])).toEqual({ command: "serve" });
  });

  it("open コマンドと絶対パスを認識する", () => {
    // 前提: argv に "open" と絶対パスを指定
    expect(parseArgs(["open", "/path/to/設計図.drawio"])).toEqual({
      command: "open",
      filePath: "/path/to/設計図.drawio",
    });
  });

  it("open コマンドの相対パスを絶対パスに解決する", () => {
    // 前提: 相対パスはサーバー起動ディレクトリに依存するため、絶対パスに変換する
    const result = parseArgs(["open", "./相対パス.drawio"]);
    expect(result).toMatchObject({ command: "open" });
    if (result.command === "open") {
      expect(path.isAbsolute(result.filePath)).toBe(true);
      expect(result.filePath).toContain("相対パス.drawio");
    }
  });

  it("引数なしの場合は none を返す", () => {
    // 前提: サブコマンドが指定されていない場合はヘルプ表示を促す
    expect(parseArgs([])).toEqual({ command: "none" });
  });

  it("不明なコマンドは unknown として raw 配列を保持する", () => {
    // 前提: 未知のサブコマンドは raw に格納してエラーメッセージに使用する
    expect(parseArgs(["不明コマンド", "--flag"])).toEqual({
      command: "unknown",
      raw: ["不明コマンド", "--flag"],
    });
  });

  it("open コマンドでファイルパス未指定の場合はエラーをスローする", () => {
    // 前提: open には必須のファイルパス引数が必要
    expect(() => parseArgs(["open"])).toThrow();
  });
});

// -----------------------------------------------------------------------
// buildOpenUrl: draw.ioエディタを開くURLの生成テスト
// -----------------------------------------------------------------------
describe("buildOpenUrl", () => {
  it("ポートとファイルパスからURLを生成する", () => {
    // 前提: 127.0.0.1 バインドのローカルサーバーURLを生成する
    const url = buildOpenUrl(3000, "/path/to/設計図.drawio");
    expect(url).toBe(
      `http://127.0.0.1:3000/?path=${encodeURIComponent("/path/to/設計図.drawio")}`,
    );
  });

  it("パスに特殊文字が含まれても正しくエンコードする", () => {
    // 前提: スペースや記号を含むパスでも壊れないこと
    const url = buildOpenUrl(8080, "/Users/テスト ユーザー/図.drawio");
    expect(url).toContain(
      encodeURIComponent("/Users/テスト ユーザー/図.drawio"),
    );
  });
});

// -----------------------------------------------------------------------
// writePortFile / readPortFile: ポートファイルI/Oのテスト
// -----------------------------------------------------------------------
describe("writePortFile / readPortFile", () => {
  it("writePortFile でポート番号を書き込み、readPortFile で読み取れる", async () => {
    // 前提: tmpDir に .cmux-drawio-port ファイルが書き込まれ、同じ値が読み取れること
    await writePortFile(tmpDir, 3000);
    const port = await readPortFile(tmpDir);
    expect(port).toBe(3000);
  });

  it("ポートファイルが存在しない場合は null を返す", async () => {
    // 前提: サーバーが起動していない（ポートファイルなし）の場合は null
    const port = await readPortFile(tmpDir);
    expect(port).toBeNull();
  });

  it("別のポート番号でも正しく保存・読み取りできる", async () => {
    // 前提: ランダムポートなど任意の正整数が正しく扱えること
    await writePortFile(tmpDir, 54321);
    const port = await readPortFile(tmpDir);
    expect(port).toBe(54321);
  });

  it("ポートファイルの内容が非数値の場合は null を返す", async () => {
    // 前提: 破損したポートファイルは無効として null を返す
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${tmpDir}/.cmux-drawio-port`, "not-a-number", "utf-8");
    const port = await readPortFile(tmpDir);
    expect(port).toBeNull();
  });

  it("ポート番号が範囲外（0や65536）の場合は null を返す", async () => {
    // 前提: 有効なTCPポート範囲（1-65535）外の値は拒否する
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${tmpDir}/.cmux-drawio-port`, "0", "utf-8");
    expect(await readPortFile(tmpDir)).toBeNull();

    await writeFile(`${tmpDir}/.cmux-drawio-port`, "65536", "utf-8");
    expect(await readPortFile(tmpDir)).toBeNull();
  });
});

// -----------------------------------------------------------------------
// isServerAlive: サーバー死活確認のテスト
// -----------------------------------------------------------------------
describe("isServerAlive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ヘルスチェックエンドポイントが200を返すとき、trueを返す", async () => {
    // 前提: fetchが正常なレスポンスを返す（サーバーが稼働中）
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    // 検証: trueが返ること
    const result = await isServerAlive(3000);
    expect(result).toBe(true);
  });

  it("ヘルスチェックエンドポイントが200以外を返すとき、falseを返す", async () => {
    // 前提: fetchが500エラーを返す（サーバー異常）
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );

    // 検証: falseが返ること
    const result = await isServerAlive(3000);
    expect(result).toBe(false);
  });

  it("ネットワークエラー（接続拒否）のとき、falseを返す", async () => {
    // 前提: fetchがネットワークエラーをスロー（サーバーが起動していない）
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("fetch failed"),
    );

    // 検証: 例外を握りつぶしてfalseが返ること
    const result = await isServerAlive(59999);
    expect(result).toBe(false);
  });

  it("AbortErrorのとき、falseを返す", async () => {
    // 前提: タイムアウトによりfetchがAbortErrorをスロー
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

    // 検証: タイムアウトでもfalseが返ること
    const result = await isServerAlive(3000);
    expect(result).toBe(false);
  });

  it("正しいヘルスチェックURLにリクエストを送る", async () => {
    // 前提: 指定ポートのヘルスチェックエンドポイントにアクセスすること
    const mockFetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await isServerAlive(8080);

    // 検証: 正しいURLが呼ばれていること
    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

// -----------------------------------------------------------------------
// waitForPortFile: ポートファイル待機のテスト
// -----------------------------------------------------------------------
describe("waitForPortFile", () => {
  it("ポートファイルが既に存在するとき、すぐにポート番号を返す", async () => {
    // 前提: 起動済みサーバーのポートファイルが存在する
    await writePortFile(tmpDir, 3000);

    // 検証: 即座にポート番号が返ること
    const port = await waitForPortFile(tmpDir, { timeoutMs: 1000 });
    expect(port).toBe(3000);
  });

  it("ポートファイルが遅延して作成されたとき、待機してポート番号を返す", async () => {
    // 前提: 200ms後にポートファイルが書き込まれる（サーバー起動中）
    setTimeout(() => writePortFile(tmpDir, 4000), 200);

    // 検証: 最大2000ms待機してポート番号が返ること
    const port = await waitForPortFile(tmpDir, {
      intervalMs: 50,
      timeoutMs: 2000,
    });
    expect(port).toBe(4000);
  });

  it("タイムアウト時間内にポートファイルが作成されなかったとき、エラーをスローする", async () => {
    // 前提: サーバー起動に失敗してポートファイルが書き込まれない
    await expect(
      waitForPortFile(tmpDir, { intervalMs: 50, timeoutMs: 200 }),
    ).rejects.toThrow();
  });
});
