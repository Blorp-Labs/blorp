import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import {
  getEditorExtensions,
  getMarkdown,
  setMarkdown,
  insertLink,
  updateLink,
  getActiveLinkInfo,
} from "./editor";

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
    const input = "**bold text**";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("italic text", () => {
    const input = "*italic text*";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("strikethrough", () => {
    const input = "~~strikethrough~~";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("blockquote", () => {
    const input = "> a quote";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it.each([
    [1, "# Heading 1"],
    [2, "## Heading 2"],
    [3, "### Heading 3"],
    [4, "#### Heading 4"],
    [5, "##### Heading 5"],
    [6, "###### Heading 6"],
  ])("heading level %i", (_level, md) => {
    setMarkdown(editor, md);
    expect(getMarkdown(editor)).toBe(md);
  });

  it("unordered list", () => {
    const input = "- item one\n- item two";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("ordered list", () => {
    const input = "1. first\n2. second";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("link", () => {
    const input = "[example](https://example.com)";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("image", () => {
    const input = "![alt text](https://example.com/img.png)";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("inline code", () => {
    const input = "Here is `inline code` in text";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("fenced code block with language", () => {
    const input = "```javascript\nconsole.log('hi');\n```";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("horizontal rule", () => {
    const input = "above\n\n---\n\nbelow";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("subscript", () => {
    const input = "H~2~O";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("superscript", () => {
    const input = "x^2^";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("spoiler block", () => {
    const input = "::: spoiler Spoiler Title\nSecret content\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("unordered list with bold item", () => {
    const input = "- **bold item**\n- normal item";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("ordered list with italic item", () => {
    const input = "1. *italic item*\n2. normal item";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("mixed inline marks: bold, italic, strikethrough", () => {
    const input = "**bold** *italic* ~~strike~~";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("bold and italic combined", () => {
    const input = "***bold italic***";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("fenced code block without language", () => {
    const input = "```\nhello world\n```";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("blockquote with inline formatting", () => {
    const input = "> **quoted bold**";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("multiple paragraphs", () => {
    const input = "First paragraph\n\nSecond paragraph";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("nested unordered list", () => {
    const input = "- item one\n  - nested item\n- item two";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("nested ordered list", () => {
    // tiptap normalizes list indentation to 2 spaces on serialization
    setMarkdown(editor, "1. item one\n   1. nested item\n2. item two");
    expect(getMarkdown(editor)).toBe(
      "1. item one\n  1. nested item\n2. item two",
    );
  });

  it("image without alt text", () => {
    const input = "![](https://example.com/img.png)";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("blockquote with multiple paragraphs", () => {
    const input = "> first paragraph\n>\n> second paragraph";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("basic table", () => {
    // tiptap normalizes column widths and separator style on serialization
    setMarkdown(
      editor,
      "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
    );
    expect(getMarkdown(editor)).toBe(
      "\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n",
    );
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

  it.each([
    ["toggleBold", "**hello world**"] as const,
    ["toggleItalic", "*hello world*"] as const,
    ["toggleStrike", "~~hello world~~"] as const,
    ["toggleSubscript", "~hello world~"] as const,
    ["toggleSuperscript", "^hello world^"] as const,
    ["toggleCode", "`hello world`"] as const,
  ])("%s wraps selected text", (command, expected) => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands[command]();
    expect(getMarkdown(editor)).toBe(expected);
  });

  it.each([
    ["toggleBold", "**hello world**"] as const,
    ["toggleItalic", "*hello world*"] as const,
    ["toggleStrike", "~~hello world~~"] as const,
    ["toggleSubscript", "~hello world~"] as const,
    ["toggleSuperscript", "^hello world^"] as const,
    ["toggleCode", "`hello world`"] as const,
  ])("%s removes marks from already-marked text", (command, input) => {
    setMarkdown(editor, input);
    editor.commands.selectAll();
    editor.commands[command]();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleBlockquote converts paragraph to blockquote", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleBlockquote();
    expect(getMarkdown(editor)).toBe("> hello world");
  });

  it("toggleBlockquote removes blockquote when text is manually selected", () => {
    setMarkdown(editor, "> hello world");
    // Select the text content directly rather than using selectAll —
    // see the note below about selectAll behaving differently.
    editor.commands.setTextSelection({ from: 1, to: 12 });
    editor.commands.toggleBlockquote();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleBlockquote via selectAll is a no-op on existing blockquote", () => {
    // Quirk: selectAll includes the blockquote node itself in the selection,
    // so toggleBlockquote neither unwraps nor double-wraps — it does nothing.
    // In the browser, Ctrl+A can behave differently (may add a second level).
    // Use a manual setTextSelection to reliably toggle a blockquote off.
    setMarkdown(editor, "> hello world");
    editor.commands.selectAll();
    editor.commands.toggleBlockquote();
    expect(getMarkdown(editor)).toBe("> hello world");
  });

  it.each([
    ["toggleBulletList", "- hello world"] as const,
    ["toggleOrderedList", "1. hello world"] as const,
  ])("%s converts paragraph to list", (command, expected) => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands[command]();
    expect(getMarkdown(editor)).toBe(expected);
  });

  it.each([
    ["toggleBulletList", "- hello world"] as const,
    ["toggleOrderedList", "1. hello world"] as const,
  ])("%s removes list markers when toggled off", (command, input) => {
    setMarkdown(editor, input);
    // selectAll includes the list node itself so the toggle can't detect it's
    // already active — use an explicit text selection inside the list item.
    editor.commands.setTextSelection({ from: 3, to: 14 });
    editor.commands[command]();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleCodeBlock converts paragraph to fenced code block", () => {
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleCodeBlock();
    expect(getMarkdown(editor)).toBe("```\nhello world\n```");
  });

  it("insertLink via TextSelection (manual drag) links full text", () => {
    setMarkdown(editor, "this is a test");
    // Simulate a manual drag: TextSelection from 1 to 15
    editor.commands.setTextSelection({ from: 1, to: 15 });
    insertLink(editor, "this is a test", "https://example.com");
    expect(getMarkdown(editor)).toBe("[this is a test](https://example.com)");
  });

  it("insertLink via selectAll (Ctrl+A) links full text", () => {
    setMarkdown(editor, "this is a test");
    editor.commands.selectAll();
    insertLink(editor, "this is a test", "https://example.com");
    expect(getMarkdown(editor)).toBe("[this is a test](https://example.com)");
  });

  it("updateLink changes the href of an existing link", () => {
    setMarkdown(editor, "[example](https://old.com)");
    // Place cursor inside the link
    editor.commands.setTextSelection(2);
    const linkInfo = getActiveLinkInfo(editor);
    expect(linkInfo).not.toBeNull();
    updateLink(editor, "example", "https://new.com", linkInfo!);
    expect(getMarkdown(editor)).toBe("[example](https://new.com)");
  });

  it("updateLink changes both the text and href of an existing link", () => {
    setMarkdown(editor, "[old text](https://old.com)");
    editor.commands.setTextSelection(2);
    const linkInfo = getActiveLinkInfo(editor);
    expect(linkInfo).not.toBeNull();
    updateLink(editor, "new text", "https://new.com", linkInfo!);
    expect(getMarkdown(editor)).toBe("[new text](https://new.com)");
  });

  it("updateLink preserves bold mark on the link text", () => {
    setMarkdown(editor, "[**bold link**](https://example.com)");
    editor.commands.setTextSelection(2);
    const linkInfo = getActiveLinkInfo(editor);
    expect(linkInfo).not.toBeNull();
    updateLink(editor, "bold link", "https://new.com", linkInfo!);
    // Tiptap serializes coincident marks (bold + link on the same span) with
    // bold as the outer wrapper, producing **[text](url)** rather than
    // [**text**](url). The bold is preserved — just wrapped differently.
    expect(getMarkdown(editor)).toBe("**[bold link](https://new.com)**");
  });

  it("setHorizontalRule inserts --- into the document", () => {
    setMarkdown(editor, "above");
    // Move cursor to end and insert hr
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.setHorizontalRule();
    // tiptap appends an empty paragraph after the rule, producing trailing \n\n
    expect(getMarkdown(editor)).toBe("above\n\n---\n\n");
  });

  it("unsetAllMarks removes bold from selected text", () => {
    setMarkdown(editor, "**hello world**");
    editor.commands.selectAll();
    editor.commands.unsetAllMarks();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("unsetAllMarks removes multiple marks from selected text", () => {
    setMarkdown(editor, "***bold italic***");
    editor.commands.selectAll();
    editor.commands.unsetAllMarks();
    expect(getMarkdown(editor)).toBe("bold italic");
  });

  it("toggleCodeBlock removes code block markers when toggled off", () => {
    setMarkdown(editor, "```\nhello world\n```");
    editor.commands.setTextSelection({ from: 2, to: 12 });
    editor.commands.toggleCodeBlock();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("unsetLink removes the link mark while keeping the text", () => {
    setMarkdown(editor, "[example](https://example.com)");
    editor.commands.setTextSelection(2);
    editor.chain().focus().unsetLink().run();
    expect(getMarkdown(editor)).toBe("example");
  });

  it("toggleBulletList with multiple items produces multiple paragraphs when toggled off", () => {
    setMarkdown(editor, "- alpha\n- beta\n- gamma");
    // Select inside the list (not the list node itself) so the toggle detects it as active
    editor.commands.setTextSelection({ from: 3, to: 20 });
    editor.commands.toggleBulletList();
    expect(getMarkdown(editor)).toBe("alpha\n\nbeta\n\ngamma");
  });

  it("toggleOrderedList with multiple items produces multiple paragraphs when toggled off", () => {
    setMarkdown(editor, "1. alpha\n2. beta\n3. gamma");
    editor.commands.setTextSelection({ from: 3, to: 22 });
    editor.commands.toggleOrderedList();
    expect(getMarkdown(editor)).toBe("alpha\n\nbeta\n\ngamma");
  });

  it("insertLink with cursor only (no selection) inserts description as linked text", () => {
    setMarkdown(editor, "");
    // Place cursor at start with no selection
    editor.commands.setTextSelection(1);
    insertLink(editor, "click here", "https://example.com");
    expect(getMarkdown(editor)).toBe("[click here](https://example.com)");
  });
});

// ---------------------------------------------------------------------------
// getActiveLinkInfo tests
// ---------------------------------------------------------------------------

describe("getActiveLinkInfo", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("returns link info when cursor is inside a link", () => {
    setMarkdown(editor, "[example](https://example.com)");
    editor.commands.setTextSelection(2);
    const linkInfo = getActiveLinkInfo(editor);
    expect(linkInfo).not.toBeNull();
    expect(linkInfo!.href).toBe("https://example.com");
    expect(linkInfo!.text).toBe("example");
  });

  it("returns correct from/to range for the link", () => {
    setMarkdown(editor, "[example](https://example.com)");
    editor.commands.setTextSelection(2);
    const linkInfo = getActiveLinkInfo(editor);
    expect(linkInfo).not.toBeNull();
    // The link text "example" occupies positions 1–8 inside the paragraph node
    expect(linkInfo!.range.from).toBe(1);
    expect(linkInfo!.range.to).toBe(8);
  });

  it("returns null when cursor is not inside a link", () => {
    setMarkdown(editor, "hello world");
    editor.commands.setTextSelection(2);
    expect(getActiveLinkInfo(editor)).toBeNull();
  });

  it("returns null on an empty editor", () => {
    expect(getActiveLinkInfo(editor)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Autolink tests (CustomLink configured with autolink: true)
// ---------------------------------------------------------------------------

describe("autolink", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("bare URL in markdown is parsed as a link", () => {
    setMarkdown(editor, "https://example.com");
    const linkInfo = (() => {
      editor.commands.setTextSelection(2);
      return getActiveLinkInfo(editor);
    })();
    expect(linkInfo).not.toBeNull();
    expect(linkInfo!.href).toBe("https://example.com");
  });

  it("bare URL round-trips with link mark preserved", () => {
    setMarkdown(editor, "https://example.com");
    const md = getMarkdown(editor);
    // The URL should survive the round-trip (exact form may vary by serializer)
    expect(md).toContain("https://example.com");
  });
});

// ---------------------------------------------------------------------------
// Spoiler extension tests
// ---------------------------------------------------------------------------

describe("spoiler extension", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("round-trips a basic spoiler", () => {
    const input = "::: spoiler Title\nSecret content\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("preserves a multi-word title", () => {
    const input = "::: spoiler My Long Spoiler Title\nBody text\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("serializes a spoiler with an empty body with a blank body line", () => {
    setMarkdown(editor, "::: spoiler Empty\n:::");
    expect(getMarkdown(editor)).toBe("::: spoiler Empty\n\n:::");
  });

  it("round-trips a spoiler with a multi-paragraph body", () => {
    const input = "::: spoiler Title\nFirst paragraph\n\nSecond paragraph\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("round-trips a spoiler with bold text in the body", () => {
    const input = "::: spoiler Title\n**bold** text\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("round-trips a spoiler with a bullet list in the body", () => {
    const input = "::: spoiler Title\n- item one\n- item two\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("round-trips two consecutive spoilers without one consuming the other", () => {
    const input =
      "::: spoiler First\nContent A\n:::\n\n::: spoiler Second\nContent B\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  // Lemmy supports omitting the closing :::. The spoiler should still parse
  // correctly and serialize with an explicit closing ::: on output.
  it("parses a spoiler with no closing :::", () => {
    setMarkdown(editor, "::: spoiler Title\nSecret content");
    expect(getMarkdown(editor)).toBe("::: spoiler Title\nSecret content\n:::");
  });

  it("round-trips nested spoilers", () => {
    const input = "::: spoiler Outer\n::: spoiler Inner\nDeep secret\n:::\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("round-trips nested spoilers with surrounding content", () => {
    const input =
      "::: spoiler Outer\nBefore\n\n::: spoiler Inner\nDeep secret\n:::\n\nAfter\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("round-trips triple-nested spoilers", () => {
    const input =
      "::: spoiler Outer\n::: spoiler Middle\n::: spoiler Inner\nDeep secret\n:::\n:::\n:::";
    setMarkdown(editor, input);
    expect(getMarkdown(editor)).toBe(input);
  });

  it("adds closing ::: when a single-nested spoiler omits both closings", () => {
    setMarkdown(editor, "::: spoiler Outer\n::: spoiler Inner\nDeep secret");
    expect(getMarkdown(editor)).toBe(
      "::: spoiler Outer\n::: spoiler Inner\nDeep secret\n:::\n:::",
    );
  });

  it("adds closing ::: when a double-nested spoiler omits all closings", () => {
    setMarkdown(
      editor,
      "::: spoiler Outer\n::: spoiler Middle\n::: spoiler Inner\nDeep secret",
    );
    expect(getMarkdown(editor)).toBe(
      "::: spoiler Outer\n::: spoiler Middle\n::: spoiler Inner\nDeep secret\n:::\n:::\n:::",
    );
  });
});

// ---------------------------------------------------------------------------
// Upstream bugs that have been fixed — regression tests to ensure they stay
// fixed. If one of these starts failing, a tiptap update broke something.
// ---------------------------------------------------------------------------

describe("upstream regressions", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  // https://github.com/ueberdosis/tiptap/issues/7495
  // getMarkdown returns `&nbsp;` when editor is empty. Our getMarkdown()
  // wraps stripTrailingNbsp() specifically to work around this.
  it("#7495: empty editor returns empty string, not &nbsp;", () => {
    expect(getMarkdown(editor)).toBe("");
  });

  // https://github.com/ueberdosis/tiptap/issues/7256
  // setContent with XML-like text (e.g. `<abc></abc>`) used to throw
  // "Invalid content for node paragraph" instead of treating it as plain text.
  it("#7256: setMarkdown with XML-like content does not throw", () => {
    expect(() => setMarkdown(editor, "Test content <abc></abc>")).not.toThrow();
  });

  // https://github.com/ueberdosis/tiptap/issues/7376
  // Overlapping marks with different start/end positions used to serialize in
  // the wrong nesting order. Bold + italic is the most common real-world case.
  it("#7376: overlapping bold and italic marks serialize with correct nesting", () => {
    // "hello world" — all bold, then "world" also italic
    setMarkdown(editor, "hello world");
    editor.commands.selectAll();
    editor.commands.toggleBold();
    editor.commands.setTextSelection({ from: 7, to: 12 });
    editor.commands.toggleItalic();
    expect(getMarkdown(editor)).toBe("**hello *world***");
  });

  // https://github.com/ueberdosis/tiptap/issues/7590
  // Fixed by https://github.com/ueberdosis/tiptap/pull/7601
  // Truly overlapping bold+italic (bold "123456", italic "456789") produced
  // invalid interleaved markdown: `**123*456**789*`
  it("#7590: truly overlapping bold and italic produces valid markdown", () => {
    setMarkdown(editor, "123456789");
    editor.commands.setTextSelection({ from: 1, to: 7 }); // "123456"
    editor.commands.toggleBold();
    editor.commands.setTextSelection({ from: 4, to: 10 }); // "456789"
    editor.commands.toggleItalic();
    const md = getMarkdown(editor);
    // The bug produced invalid interleaved delimiters — ensure it's gone
    expect(md).not.toBe("**123*456**789*");
    // Valid markdown must round-trip cleanly
    setMarkdown(editor, md);
    expect(getMarkdown(editor)).toBe(md);
  });
});

// ---------------------------------------------------------------------------
// Still-open upstream bugs — use `it.fails` so CI stays green.
// When tiptap fixes the bug the test will start unexpectedly passing;
// at that point move it to the "upstream regressions" block above.
// ---------------------------------------------------------------------------

describe("known upstream bugs", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  // https://github.com/ueberdosis/tiptap/issues/7553
  // Italic (and other marks) on partial link text serializes the mark
  // delimiters *outside* the square brackets, producing invalid markdown.
  // e.g. `*[hello* world](url)` instead of `[*hello* world](url)`
  it.fails(
    "#7553: italic on partial link text keeps markers inside brackets",
    () => {
      setMarkdown(editor, "[hello world](https://google.com)");
      editor.commands.setTextSelection({ from: 1, to: 6 });
      editor.commands.toggleItalic();
      expect(getMarkdown(editor)).toBe("[*hello* world](https://google.com)");
    },
  );

  // https://github.com/ueberdosis/tiptap/issues/7539
  // HTML entities in markdown source (&lt; &gt;) are displayed as literal
  // text instead of being decoded to their character equivalents.
  it.fails("#7539: &lt; and &gt; entities in markdown are decoded", () => {
    setMarkdown(editor, "foo &lt;bar&gt; baz");
    expect(editor.state.doc.textContent).toBe("foo <bar> baz");
  });

  // https://github.com/ueberdosis/tiptap/issues/7258
  // Escaped markdown characters (\*) are silently dropped instead of
  // rendering as the literal character. Per the markdown spec, \* should
  // produce a literal asterisk, not start italic formatting.
  it.fails(
    "#7258: escaped markdown characters render as literal characters",
    () => {
      setMarkdown(editor, "\\*not italic\\*");
      expect(editor.state.doc.textContent).toBe("*not italic*");
    },
  );

  // https://github.com/ueberdosis/tiptap/issues/7502
  // When parsing a markdown table with column alignment markers (:--- / :---: / ---:),
  // tiptap v3 discards the alignment info. The markers are not preserved on
  // serialization, so a round-trip loses all column alignment.
  it.fails(
    "#7502: markdown table column alignment markers are preserved in round-trip",
    () => {
      const input = [
        "| Left | Center | Right |",
        "| :--- | :----: | ----: |",
        "| a    | b      | c     |",
      ].join("\n");
      setMarkdown(editor, input);
      const output = getMarkdown(editor);
      // At minimum the alignment colons must survive the round-trip
      expect(output).toContain(":---");
      expect(output).toContain(":----:");
      expect(output).toContain("----:");
    },
  );
});
