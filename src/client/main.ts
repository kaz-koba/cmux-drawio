const DRAWIO_ORIGIN = "https://embed.diagrams.net";
const DRAWIO_EMBED_URL =
  "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=1&saveAndExit=1";

/**
 * URLのsearchParamsからdrawioファイルパスを取り出す。
 * path パラメータが未指定または空の場合はErrorをスローする。
 */
export function parsePathFromUrl(url: string): string {
  const { searchParams } = new URL(url);
  const filePath = searchParams.get("path");
  if (!filePath) {
    throw new Error(
      "URLに path クエリパラメータが必要です（例: ?path=/absolute/path/to/file.drawio）",
    );
  }
  return filePath;
}

/**
 * draw.io embed modeのURLを返す。
 */
export function buildEmbedUrl(): string {
  return DRAWIO_EMBED_URL;
}

/**
 * draw.io embed modeへ送る load アクションのJSON文字列を生成する。
 */
export function createLoadAction(xml: string): string {
  return JSON.stringify({ action: "load", xml });
}

/**
 * draw.ioからのpostMessageを処理する。
 * - origin が embed.diagrams.net 以外 → 無視
 * - data が文字列でない → 無視
 * - JSON.parse 失敗 → 無視
 * - event.event === "save" → onSave(xml) 呼び出し
 * - event.event === "exit" → onExit() 呼び出し
 * - それ以外（init 等）→ 無視
 */
export function handleDrawioMessage(
  event: MessageEvent,
  onSave: (xml: string) => void,
  onExit: () => void,
): void {
  if (event.origin !== DRAWIO_ORIGIN) {
    return;
  }

  if (typeof event.data !== "string") {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.data);
  } catch {
    return;
  }

  if (typeof parsed !== "object" || parsed === null || !("event" in parsed)) {
    return;
  }

  const msg = parsed as Record<string, unknown>;

  if (msg.event === "save" && typeof msg.xml === "string") {
    onSave(msg.xml);
    return;
  }

  if (msg.event === "exit") {
    onExit();
    return;
  }

  // init など未処理のイベントは無視する
}

// -----------------------------------------------------------------------
// DOMグルーコード（テスト対象外）
// -----------------------------------------------------------------------
function initEditor(): void {
  const filePath = parsePathFromUrl(window.location.href);

  const iframe = document.createElement("iframe");
  iframe.id = "editor";
  iframe.src = buildEmbedUrl();
  iframe.style.cssText = "width:100%;height:100%;border:none;";
  iframe.title = "draw.io editor";
  document.body.appendChild(iframe);

  window.addEventListener("message", (event) => {
    // initイベント: draw.ioが準備完了したらXMLをロードする
    if (event.origin === DRAWIO_ORIGIN && typeof event.data === "string") {
      let msg: unknown;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        typeof msg === "object" &&
        msg !== null &&
        (msg as Record<string, unknown>).event === "init"
      ) {
        fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
          .then((res) => {
            if (!res.ok) throw new Error(`GET /api/file failed: ${res.status}`);
            return res.json();
          })
          .then((body) => {
            const xml = (body as Record<string, unknown>).xml;
            if (typeof xml !== "string") {
              throw new Error(
                "サーバーのレスポンスにxmlフィールドがありません",
              );
            }
            if (!iframe.contentWindow) {
              throw new Error("iframeのcontentWindowが取得できません");
            }
            iframe.contentWindow.postMessage(
              createLoadAction(xml),
              DRAWIO_ORIGIN,
            );
          })
          .catch(console.error);
        return;
      }
    }

    handleDrawioMessage(
      event,
      (xml) => {
        // saveイベント: サーバーにXMLを書き込む
        fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, xml }),
        })
          .then((res) => {
            if (!res.ok)
              throw new Error(`POST /api/file failed: ${res.status}`);
          })
          .catch(console.error);
      },
      () => {
        // exitイベント: ウィンドウを閉じる
        window.close();
      },
    );
  });
}

// エントリポイント（DOM読み込み後に起動）
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initEditor();
}
