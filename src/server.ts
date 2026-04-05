import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

/**
 * drawioファイルパスを検証する。
 * 無効なパスは Error をスローする（呼び出し元で 400 に変換すること）。
 *
 * 検証ルール:
 * - 絶対パスであること
 * - nullバイトを含まないこと
 * - `..` セグメントを含まないこと（パストラバーサル防止）
 * - `.drawio` 拡張子で終わること
 */
export function validateDrawioPath(filePath: string): void {
  if (filePath.includes("\0")) {
    throw new Error("無効なパス: nullバイトが含まれています");
  }

  if (!path.isAbsolute(filePath)) {
    throw new Error("無効なパス: 絶対パスを指定してください");
  }

  // path.normalize で `..` や余分な区切り文字を解決し、元のパスと異なれば拒否する
  // （例: `/a/../b.drawio` → `/b.drawio` に変化するため拒否）
  const normalized = path.normalize(filePath);
  if (normalized !== filePath) {
    throw new Error("無効なパス: パストラバーサルは許可されていません");
  }

  if (!filePath.endsWith(".drawio")) {
    throw new Error("無効なパス: .drawio ファイルのみ対応しています");
  }
}

export const app = new Hono();

// ヘルスチェック
app.get("/api/health", (c) => {
  return c.json({ ok: true });
});

// drawioファイル読み取り
app.get("/api/file", async (c) => {
  const filePath = c.req.query("path");

  if (!filePath) {
    return c.json({ error: "path パラメータが必要です" }, 400);
  }

  try {
    validateDrawioPath(filePath);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "無効なパス" },
      400,
    );
  }

  let xml: string;
  try {
    xml = await readFile(filePath, "utf-8");
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return c.json({ error: "ファイルが見つかりません" }, 404);
    }
    throw err;
  }

  return c.json({ xml, filename: path.basename(filePath) });
});

// drawioファイル書き込み
app.post("/api/file", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("path" in body) ||
    typeof (body as Record<string, unknown>).path !== "string"
  ) {
    return c.json({ error: "path フィールドが必要です" }, 400);
  }

  const filePath = (body as Record<string, unknown>).path as string;
  const xml = (body as Record<string, unknown>).xml;

  try {
    validateDrawioPath(filePath);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "無効なパス" },
      400,
    );
  }

  if (typeof xml !== "string") {
    return c.json({ error: "xml フィールドが必要です" }, 400);
  }

  try {
    await writeFile(filePath, xml, "utf-8");
  } catch {
    return c.json({ error: "ファイルの書き込みに失敗しました" }, 500);
  }

  return c.json({ ok: true });
});

// 静的ファイル配信（dist/client/ → /）
app.use("/*", serveStatic({ root: "./dist/client" }));
