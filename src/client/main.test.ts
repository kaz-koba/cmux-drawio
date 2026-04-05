import { describe, expect, it, vi } from "vitest";
import {
  buildEmbedUrl,
  createLoadAction,
  handleDrawioMessage,
  parsePathFromUrl,
} from "./main.js";

// -----------------------------------------------------------------------
// parsePathFromUrl: URLからdrawioファイルパスを取得するテスト
// -----------------------------------------------------------------------
describe("parsePathFromUrl", () => {
  it("URLのsearchParamsから path を返す", () => {
    // 前提: ?path=/absolute/path.drawio のクエリパラメータが存在する
    const url =
      "http://127.0.0.1:3000/?path=%2Fhome%2Fuser%2F%E8%A8%AD%E8%A8%88%E5%9B%B3.drawio";
    expect(parsePathFromUrl(url)).toBe("/home/user/設計図.drawio");
  });

  it("path パラメータが未指定の場合はErrorをスローする", () => {
    // 前提: URLにpathクエリパラメータがない場合、エディタを開けないためエラー
    expect(() => parsePathFromUrl("http://127.0.0.1:3000/")).toThrow();
  });

  it("path パラメータが空文字の場合はErrorをスローする", () => {
    // 前提: 空のpathは無効なため拒否する
    expect(() => parsePathFromUrl("http://127.0.0.1:3000/?path=")).toThrow();
  });
});

// -----------------------------------------------------------------------
// buildEmbedUrl: draw.io embed URLを生成するテスト
// -----------------------------------------------------------------------
describe("buildEmbedUrl", () => {
  it("draw.io embed modeのURLを返す", () => {
    // 前提: embed=1&proto=json を含む決まったURL
    const url = buildEmbedUrl();
    expect(url).toBe(
      "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=1&saveAndExit=1",
    );
  });
});

// -----------------------------------------------------------------------
// createLoadAction: draw.ioへ送るloadアクションを生成するテスト
// -----------------------------------------------------------------------
describe("createLoadAction", () => {
  it("xmlを含むloadアクションのJSON文字列を返す", () => {
    // 前提: draw.io embed modeのpostMessage仕様（proto=json）に従うフォーマット
    const xml = "<mxGraphModel><root/></mxGraphModel>";
    const action = createLoadAction(xml);
    expect(action).toBe(JSON.stringify({ action: "load", xml }));
  });

  it("XMLに特殊文字が含まれても正しくシリアライズされる", () => {
    // 前提: 日本語・記号を含むXMLでも壊れないこと
    const xml =
      '<mxGraphModel><root><設計図 name="テスト&amp;例"/></root></mxGraphModel>';
    const action = createLoadAction(xml);
    const parsed = JSON.parse(action) as { action: string; xml: string };
    expect(parsed.action).toBe("load");
    expect(parsed.xml).toBe(xml);
  });
});

// -----------------------------------------------------------------------
// handleDrawioMessage: draw.ioからのpostMessageを処理するテスト
// -----------------------------------------------------------------------
describe("handleDrawioMessage", () => {
  it("不正なoriginのメッセージは無視する（onSave/onExitを呼ばない）", () => {
    // 前提: embed.diagrams.net 以外のoriginからのメッセージはセキュリティ上無視する
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://evil.example.com",
      data: JSON.stringify({ event: "save", xml: "<xml/>" }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("dataが文字列でない場合は無視する", () => {
    // 前提: postMessageのdataは文字列（JSON）であることを期待する
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: { event: "save" }, // オブジェクト（非文字列）
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("不正なJSONは無視する", () => {
    // 前提: JSON.parseが失敗するデータはエラーをスローせず無視する
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: "not-valid-json",
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("saveイベントでonSaveをxmlと共に呼び出す", () => {
    // 前提: draw.ioがファイルを保存したとき、XMLを取り出してサーバーに書き込む
    const onSave = vi.fn();
    const onExit = vi.fn();
    const xml = "<mxGraphModel><root/></mxGraphModel>";
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "save", xml }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).toHaveBeenCalledWith(xml);
    expect(onExit).not.toHaveBeenCalled();
  });

  it("exitイベントでonExitを呼び出す", () => {
    // 前提: draw.ioが閉じられたとき、ブラウザペインを閉じるなどの処理を行う
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "exit" }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("initイベントはonSave/onExitを呼ばない", () => {
    // 前提: initはエディタ起動通知であり、loadアクション送信はDOMグルーコードの責務
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "init" }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("有効なJSONだがeventプロパティがない場合は無視する", () => {
    // 前提: {} や [] など構造が合わないメッセージは無視する
    const onSave = vi.fn();
    const onExit = vi.fn();
    for (const data of ["null", "{}", "[]", '"文字列"']) {
      const event = new MessageEvent("message", {
        origin: "https://embed.diagrams.net",
        data,
      });
      handleDrawioMessage(event, onSave, onExit);
    }
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("saveイベントでxmlが欠落している場合は無視する", () => {
    // 前提: xmlなしのsaveイベントはデータ破損とみなして無視する
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "save" }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saveイベントでxmlが文字列でない場合は無視する", () => {
    // 前提: xmlが数値や配列の場合はプロトコル違反として無視する
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "save", xml: 123 }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("未知のイベント種別は無視する", () => {
    // 前提: autosaveなど将来追加されるイベントを誤って処理しないようにする
    const onSave = vi.fn();
    const onExit = vi.fn();
    const event = new MessageEvent("message", {
      origin: "https://embed.diagrams.net",
      data: JSON.stringify({ event: "autosave", xml: "<xml/>" }),
    });
    handleDrawioMessage(event, onSave, onExit);
    expect(onSave).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });
});
