import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app, validateDrawioPath } from "./server.js";

// テスト用の一時ディレクトリ
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "cmux-drawio-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------
// validateDrawioPath: パス検証関数のテスト
// -----------------------------------------------------------------------
describe("validateDrawioPath", () => {
  it(".drawio拡張子のファイルは有効", () => {
    // 前提: 絶対パスかつ .drawio 拡張子
    expect(() =>
      validateDrawioPath("/home/ユーザー/設計図.drawio"),
    ).not.toThrow();
  });

  it(".drawio以外の拡張子は無効（400相当のエラー）", () => {
    // 前提: 拡張子が .xml の場合
    expect(() => validateDrawioPath("/home/ユーザー/ファイル.xml")).toThrow();
  });

  it("拡張子なしのパスは無効", () => {
    expect(() => validateDrawioPath("/home/ユーザー/ファイル")).toThrow();
  });

  it("相対パスは無効（絶対パスのみ許可）", () => {
    // 前提: 相対パスはサーバー起動ディレクトリに依存するため拒否
    expect(() => validateDrawioPath("./設計図.drawio")).toThrow();
    expect(() => validateDrawioPath("設計図.drawio")).toThrow();
  });

  it("パストラバーサル（..）を含むパスは無効", () => {
    // 前提: ディレクトリ境界を越えるアクセスは危険
    expect(() =>
      validateDrawioPath("/home/ユーザー/../secret/設計図.drawio"),
    ).toThrow();
  });

  it("nullバイトを含むパスは無効", () => {
    // 前提: nullバイトはOSのパス解析を欺く攻撃手法
    expect(() =>
      validateDrawioPath("/home/ユーザー/設計図.drawio\0extra"),
    ).toThrow();
  });
});

// -----------------------------------------------------------------------
// GET /api/health: ヘルスチェックエンドポイント
// -----------------------------------------------------------------------
describe("GET /api/health", () => {
  it("200を返す", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
  });
});

// -----------------------------------------------------------------------
// GET /api/file: ファイル読み取りエンドポイント
// -----------------------------------------------------------------------
describe("GET /api/file", () => {
  it("正常系: drawioファイルのXMLとファイル名を返す", async () => {
    // 前提: tmpDirに有効な .drawio ファイルを配置
    const filePath = path.join(tmpDir, "テスト.drawio");
    const xmlContent = "<mxGraphModel><root/></mxGraphModel>";
    await writeFile(filePath, xmlContent, "utf-8");

    const res = await app.request(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as { xml: string; filename: string };
    expect(body.xml).toBe(xmlContent);
    expect(body.filename).toBe("テスト.drawio");
  });

  it("pathクエリパラメータ未指定 → 400", async () => {
    const res = await app.request("/api/file");
    expect(res.status).toBe(400);
  });

  it(".drawio以外の拡張子 → 400", async () => {
    const res = await app.request(
      `/api/file?path=${encodeURIComponent("/home/ユーザー/ファイル.xml")}`,
    );
    expect(res.status).toBe(400);
  });

  it("ファイルが存在しない → 404", async () => {
    const filePath = path.join(tmpDir, "存在しない.drawio");
    const res = await app.request(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    );
    expect(res.status).toBe(404);
  });

  it("パストラバーサルを含むパス → 400", async () => {
    const res = await app.request(
      `/api/file?path=${encodeURIComponent("/tmp/../etc/passwd.drawio")}`,
    );
    expect(res.status).toBe(400);
  });
});

// -----------------------------------------------------------------------
// POST /api/file: ファイル書き込みエンドポイント
// -----------------------------------------------------------------------
describe("POST /api/file", () => {
  it("正常系: drawioファイルにXMLを書き込み200を返す", async () => {
    // 前提: tmpDirに書き込み先 .drawio ファイルを配置
    const filePath = path.join(tmpDir, "保存テスト.drawio");
    await writeFile(filePath, "<old/>", "utf-8");
    const newXml = "<mxGraphModel><root><保存済み/></root></mxGraphModel>";

    const res = await app.request("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, xml: newXml }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // 実際にファイルへ書き込まれたことを検証
    const written = await readFile(filePath, "utf-8");
    expect(written).toBe(newXml);
  });

  it("不正なJSONボディ → 400", async () => {
    const res = await app.request("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });

  it("不正なパス → 400", async () => {
    const res = await app.request("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "./相対パス.drawio",
        xml: "<mxGraphModel/>",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("xmlフィールド未指定 → 400", async () => {
    const filePath = path.join(tmpDir, "テスト.drawio");
    const res = await app.request("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    expect(res.status).toBe(400);
  });
});
