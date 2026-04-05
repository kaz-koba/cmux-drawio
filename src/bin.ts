#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// ポートファイル名
const PORT_FILE = ".cmux-drawio-port";

// CLIで解析された引数の型
export type ParsedArgs =
  | { command: "serve" }
  | { command: "open"; filePath: string }
  | { command: "unknown"; raw: string[] }
  | { command: "none" };

/**
 * process.argv.slice(2) を受け取り、サブコマンドを解析する。
 * 相対パスは path.resolve で絶対パスに変換する。
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [cmd, ...rest] = argv;

  if (cmd === undefined) {
    return { command: "none" };
  }

  if (cmd === "serve") {
    return { command: "serve" };
  }

  if (cmd === "open") {
    const rawPath = rest[0];
    if (rawPath === undefined || rawPath === "") {
      throw new Error(
        "使い方: cmux-drawio open <file>\nファイルパスを指定してください。",
      );
    }
    const filePath = path.resolve(rawPath);
    return { command: "open", filePath };
  }

  return { command: "unknown", raw: argv };
}

/**
 * ローカルサーバーでdraw.ioエディタを開くURLを生成する。
 */
export function buildOpenUrl(port: number, filePath: string): string {
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`;
}

/**
 * 指定ディレクトリにポート番号を書き込む。
 */
export async function writePortFile(dir: string, port: number): Promise<void> {
  const filePath = path.join(dir, PORT_FILE);
  await writeFile(filePath, String(port), "utf-8");
}

/**
 * 指定ディレクトリのポートファイルを読み取る。
 * ファイルが存在しない場合は null を返す。
 */
export async function readPortFile(dir: string): Promise<number | null> {
  const filePath = path.join(dir, PORT_FILE);
  try {
    const content = await readFile(filePath, "utf-8");
    const port = Number(content.trim());
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }
}

// -----------------------------------------------------------------------
// メイン処理（テスト対象外）
// -----------------------------------------------------------------------
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "serve") {
    // dist/client が存在しない場合は起動前に早期失敗
    const clientIndex = path.join(
      process.cwd(),
      "dist",
      "client",
      "index.html",
    );
    try {
      await access(clientIndex);
    } catch {
      throw new Error(
        `クライアントビルドが見つかりません: ${path.join(process.cwd(), "dist/client")}\n先に pnpm build を実行してください。`,
      );
    }

    const { serve } = await import("@hono/node-server");
    const { app } = await import("./server.js");

    await new Promise<void>((resolve, reject) => {
      const server = serve(
        { fetch: app.fetch, hostname: "127.0.0.1", port: 0 },
        async (info) => {
          const port = info.port;
          try {
            await writePortFile(process.cwd(), port);
            process.stdout.write(
              `cmux-drawio server listening on http://127.0.0.1:${port}\n`,
            );
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      );
      server.on("error", reject);
    });
    return;
  }

  if (args.command === "open") {
    const port = await readPortFile(process.cwd());
    if (port === null) {
      process.stderr.write(
        "サーバーが起動していません。先に cmux-drawio serve を実行してください。\n",
      );
      process.exit(1);
    }
    const url = buildOpenUrl(port, args.filePath);
    execFileSync("cmux", ["browser", "open-split", url], { stdio: "inherit" });
    return;
  }

  if (args.command === "none") {
    process.stdout.write(
      "使い方:\n  cmux-drawio serve       サーバーを起動する\n  cmux-drawio open <file> draw.ioファイルを開く\n",
    );
    process.exit(1);
  }

  // unknown
  process.stderr.write(`不明なコマンド: ${args.raw.join(" ")}\n`);
  process.exit(1);
}

// エントリポイントとして直接実行された場合のみ main() を呼び出す
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.url.slice(7))
) {
  main().catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
