import { describe, expect, it } from "vitest";
import {
  convertMarkdown,
  markdownToPlainText,
  plainTextToMarkdown,
} from "@/lib/services/markdown/markdown.service";

describe("markdownToPlainText", () => {
  it("drops heading markers and unwraps emphasis", () => {
    expect(markdownToPlainText("# Title\n\nSome **bold** and *italic* text")).toBe(
      "Title\n\nSome bold and italic text",
    );
  });

  it("keeps link text and image alt text", () => {
    expect(
      markdownToPlainText("See [docs](https://x.test) and ![logo](logo.png)"),
    ).toBe("See docs and logo");
  });

  it("unwraps code spans and drops fence markers", () => {
    expect(markdownToPlainText("Use `code` here\n```js\nlet a = 1;\n```")).toBe(
      "Use code here\n\nlet a = 1;",
    );
  });

  it("drops list markers", () => {
    expect(markdownToPlainText("- one\n- two\n1. three")).toBe(
      "one\ntwo\nthree",
    );
  });
});

describe("plainTextToMarkdown", () => {
  it("joins blank-line-separated blocks as paragraphs", () => {
    expect(plainTextToMarkdown("First.\n\nSecond.")).toBe("First.\n\nSecond.");
  });
});

describe("convertMarkdown", () => {
  it("routes by target", async () => {
    expect(await convertMarkdown({ content: "# Hi", target: "txt" })).toEqual({
      output: "Hi",
      target: "txt",
    });
    expect(await convertMarkdown({ content: "Hi", target: "md" })).toEqual({
      output: "Hi",
      target: "md",
    });
    expect(await convertMarkdown({ content: "# Hi", target: "html" })).toEqual({
      output: "<h1>Hi</h1>\n",
      target: "html",
    });
  });
});
