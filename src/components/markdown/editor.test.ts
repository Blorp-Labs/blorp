import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { getEditorExtensions, getMarkdown, setMarkdown } from "./editor";

/**
 * Create a headless Editor that matches the production extension set.
 * We pass no options so Placeholder, Mention, and the React node view
 * on CodeBlockLowlight are all omitted — none of them affect serialization.
 */
function createEditor(): Editor {
  return new Editor({
    // null = don't mount to the DOM (headless)
    element: null,
    extensions: getEditorExtensions(),
  });
}

// ---------------------------------------------------------------------------
// Round-trip tests: parse markdown → serialize → compare
// ---------------------------------------------------------------------------

describe("markdown round-trip", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("bold text", () => {
    setMarkdown(editor, "**bold text**");
    expect(getMarkdown(editor)).toBe("**bold text**");
  });

  it("italic text", () => {
    setMarkdown(editor, "*italic text*");
    expect(getMarkdown(editor)).toBe("*italic text*");
  });

  it("strikethrough", () => {
    setMarkdown(editor, "~~strikethrough~~");
    expect(getMarkdown(editor)).toBe("~~strikethrough~~");
  });

  it("blockquote", () => {
    setMarkdown(editor, "> a quote");
    expect(getMarkdown(editor)).toBe("> a quote");
  });

  it("heading level 1", () => {
    setMarkdown(editor, "# Heading 1");
    expect(getMarkdown(editor)).toBe("# Heading 1");
  });

  it("heading level 2", () => {
    setMarkdown(editor, "## Heading 2");
    expect(getMarkdown(editor)).toBe("## Heading 2");
  });

  it("unordered list", () => {
    setMarkdown(editor, "- item one\n- item two");
    expect(getMarkdown(editor)).toBe("- item one\n- item two");
  });

  it("ordered list", () => {
    setMarkdown(editor, "1. first\n2. second");
    expect(getMarkdown(editor)).toBe("1. first\n2. second");
  });

  it("link", () => {
    setMarkdown(editor, "[example](https://example.com)");
    expect(getMarkdown(editor)).toBe("[example](https://example.com)");
  });

  it("image", () => {
    setMarkdown(editor, "![alt text](https://example.com/img.png)");
    expect(getMarkdown(editor)).toBe(
      "![alt text](https://example.com/img.png)",
    );
  });

  it("inline code", () => {
    setMarkdown(editor, "Here is `inline code` in text");
    expect(getMarkdown(editor)).toBe("Here is `inline code` in text");
  });

  it("fenced code block with language", () => {
    setMarkdown(editor, "```javascript\nconsole.log('hi');\n```");
    expect(getMarkdown(editor)).toBe("```javascript\nconsole.log('hi');\n```");
  });

  it("horizontal rule", () => {
    setMarkdown(editor, "above\n\n---\n\nbelow");
    expect(getMarkdown(editor)).toBe("above\n\n---\n\nbelow");
  });

  it("subscript", () => {
    setMarkdown(editor, "H~2~O");
    expect(getMarkdown(editor)).toBe("H~2~O");
  });

  it("superscript", () => {
    setMarkdown(editor, "x^2^");
    expect(getMarkdown(editor)).toBe("x^2^");
  });

  it("spoiler block", () => {
    setMarkdown(editor, "::: spoiler Spoiler Title\nSecret content\n:::");
    expect(getMarkdown(editor)).toBe(
      "::: spoiler Spoiler Title\nSecret content\n:::",
    );
  });

  it("mixed inline marks: bold, italic, strikethrough", () => {
    setMarkdown(editor, "**bold** *italic* ~~strike~~");
    expect(getMarkdown(editor)).toBe("**bold** *italic* ~~strike~~");
  });
});

// ---------------------------------------------------------------------------
// Command tests: set plain text → apply command → assert markdown output
// ---------------------------------------------------------------------------

describe("editor commands", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("toggleBold wraps selected text in **", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleBold();
    expect(getMarkdown(editor)).toBe("**hello world**");
  });

  it("toggleBold removes ** from already-bold text", () => {
    setMarkdown(editor, "**hello world**");
    editor.commands.selectAll();
    editor.commands.toggleBold();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleItalic wraps selected text in *", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleItalic();
    expect(getMarkdown(editor)).toBe("*hello world*");
  });

  it("toggleStrike wraps selected text in ~~", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleStrike();
    expect(getMarkdown(editor)).toBe("~~hello world~~");
  });

  it("toggleBlockquote converts paragraph to blockquote", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleBlockquote();
    expect(getMarkdown(editor)).toBe("> hello world");
  });

  it("toggleBlockquote removes blockquote from already-quoted text", () => {
    setMarkdown(editor, "> hello world");
    editor.commands.selectAll();
    editor.commands.toggleBlockquote();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleBulletList converts paragraph to unordered list", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleBulletList();
    expect(getMarkdown(editor)).toBe("- hello world");
  });

  it("toggleOrderedList converts paragraph to ordered list", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleOrderedList();
    expect(getMarkdown(editor)).toBe("1. hello world");
  });

  it("toggleCodeBlock converts paragraph to fenced code block", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleCodeBlock();
    expect(getMarkdown(editor)).toBe("```\nhello world\n```");
  });

  it("toggleSubscript wraps selected text in ~", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleSubscript();
    expect(getMarkdown(editor)).toBe("~hello world~");
  });

  it("toggleSuperscript wraps selected text in ^", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleSuperscript();
    expect(getMarkdown(editor)).toBe("^hello world^");
  });

  it("setHorizontalRule inserts --- into the document", () => {
    setMarkdown(editor, "above");
    // Move cursor to end and insert hr
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.setHorizontalRule();
    expect(getMarkdown(editor)).toContain("---");
  });

  it("unsetAllMarks removes bold from selected text", () => {
    setMarkdown(editor, "**hello world**");
    editor.commands.selectAll();
    editor.commands.unsetAllMarks();
    expect(getMarkdown(editor)).toBe("hello world");
  });
});
