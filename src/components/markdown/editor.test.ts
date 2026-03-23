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

  it("unordered list with bold item", () => {
    setMarkdown(editor, "- **bold item**\n- normal item");
    expect(getMarkdown(editor)).toBe("- **bold item**\n- normal item");
  });

  it("ordered list with italic item", () => {
    setMarkdown(editor, "1. *italic item*\n2. normal item");
    expect(getMarkdown(editor)).toBe("1. *italic item*\n2. normal item");
  });

  it("mixed inline marks: bold, italic, strikethrough", () => {
    setMarkdown(editor, "**bold** *italic* ~~strike~~");
    expect(getMarkdown(editor)).toBe("**bold** *italic* ~~strike~~");
  });

  it("bold and italic combined", () => {
    setMarkdown(editor, "***bold italic***");
    expect(getMarkdown(editor)).toBe("***bold italic***");
  });

  it("fenced code block without language", () => {
    setMarkdown(editor, "```\nhello world\n```");
    expect(getMarkdown(editor)).toBe("```\nhello world\n```");
  });

  it("blockquote with inline formatting", () => {
    setMarkdown(editor, "> **quoted bold**");
    expect(getMarkdown(editor)).toBe("> **quoted bold**");
  });

  it("multiple paragraphs", () => {
    setMarkdown(editor, "First paragraph\n\nSecond paragraph");
    expect(getMarkdown(editor)).toBe("First paragraph\n\nSecond paragraph");
  });

  it("nested unordered list", () => {
    setMarkdown(editor, "- item one\n  - nested item\n- item two");
    const md = getMarkdown(editor);
    expect(md).toContain("item one");
    expect(md).toContain("nested item");
    expect(md).toContain("item two");
  });

  it("nested ordered list", () => {
    setMarkdown(editor, "1. item one\n   1. nested item\n2. item two");
    const md = getMarkdown(editor);
    expect(md).toContain("item one");
    expect(md).toContain("nested item");
    expect(md).toContain("item two");
  });

  it("image without alt text", () => {
    setMarkdown(editor, "![](https://example.com/img.png)");
    expect(getMarkdown(editor)).toBe("![](https://example.com/img.png)");
  });

  it("blockquote with multiple paragraphs", () => {
    setMarkdown(editor, "> first paragraph\n>\n> second paragraph");
    const md = getMarkdown(editor);
    expect(md).toContain("first paragraph");
    expect(md).toContain("second paragraph");
    expect(md).toMatch(/^>/m);
  });

  it("basic table", () => {
    setMarkdown(
      editor,
      "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |",
    );
    const md = getMarkdown(editor);
    expect(md).toContain("Header 1");
    expect(md).toContain("Header 2");
    expect(md).toContain("Cell 1");
    expect(md).toContain("Cell 2");
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

  it("toggleBulletList removes list markers when toggled off", () => {
    setMarkdown(editor, "- hello world");
    // selectAll includes the list node itself so the toggle can't detect it's
    // already active — use an explicit text selection inside the list item.
    editor.commands.setTextSelection({ from: 3, to: 14 });
    editor.commands.toggleBulletList();
    expect(getMarkdown(editor)).toBe("hello world");
  });

  it("toggleOrderedList removes list markers when toggled off", () => {
    setMarkdown(editor, "1. hello world");
    editor.commands.setTextSelection({ from: 3, to: 14 });
    editor.commands.toggleOrderedList();
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
    expect(getMarkdown(editor)).toContain("---");
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
    const md = getMarkdown(editor);
    expect(md).not.toContain("- ");
    expect(md).toContain("alpha");
    expect(md).toContain("beta");
    expect(md).toContain("gamma");
  });

  it("toggleOrderedList with multiple items produces multiple paragraphs when toggled off", () => {
    setMarkdown(editor, "1. alpha\n2. beta\n3. gamma");
    editor.commands.setTextSelection({ from: 3, to: 22 });
    editor.commands.toggleOrderedList();
    const md = getMarkdown(editor);
    expect(md).not.toMatch(/^\d+\./m);
    expect(md).toContain("alpha");
    expect(md).toContain("beta");
    expect(md).toContain("gamma");
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
    setMarkdown(editor, "::: spoiler Title\nSecret content\n:::");
    expect(getMarkdown(editor)).toBe("::: spoiler Title\nSecret content\n:::");
  });

  it("preserves a multi-word title", () => {
    setMarkdown(editor, "::: spoiler My Long Spoiler Title\nBody text\n:::");
    expect(getMarkdown(editor)).toBe(
      "::: spoiler My Long Spoiler Title\nBody text\n:::",
    );
  });

  it("round-trips a spoiler with an empty body", () => {
    setMarkdown(editor, "::: spoiler Empty\n:::");
    const md = getMarkdown(editor);
    // Must still open and close as a spoiler block
    expect(md).toMatch(/^::: spoiler Empty\n/);
    expect(md).toMatch(/\n:::$/);
  });

  it("round-trips a spoiler with a multi-paragraph body", () => {
    setMarkdown(
      editor,
      "::: spoiler Title\nFirst paragraph\n\nSecond paragraph\n:::",
    );
    const md = getMarkdown(editor);
    expect(md).toContain("First paragraph");
    expect(md).toContain("Second paragraph");
    expect(md).toMatch(/^::: spoiler Title\n/);
    expect(md).toMatch(/\n:::$/);
  });

  it("round-trips a spoiler with bold text in the body", () => {
    setMarkdown(editor, "::: spoiler Title\n**bold** text\n:::");
    const md = getMarkdown(editor);
    expect(md).toContain("**bold**");
    expect(md).toMatch(/^::: spoiler Title\n/);
  });

  it("round-trips a spoiler with a bullet list in the body", () => {
    setMarkdown(editor, "::: spoiler Title\n- item one\n- item two\n:::");
    const md = getMarkdown(editor);
    expect(md).toContain("item one");
    expect(md).toContain("item two");
    expect(md).toMatch(/^::: spoiler Title\n/);
    expect(md).toMatch(/\n:::$/);
  });

  it("round-trips two consecutive spoilers without one consuming the other", () => {
    setMarkdown(
      editor,
      "::: spoiler First\nContent A\n:::\n\n::: spoiler Second\nContent B\n:::",
    );
    const md = getMarkdown(editor);
    expect(md).toContain("::: spoiler First");
    expect(md).toContain("Content A");
    expect(md).toContain("::: spoiler Second");
    expect(md).toContain("Content B");
  });

  // Lemmy appears to use a single trailing ::: to close all nesting levels, not
  // one per level. TODO: confirm whether this is intentional Lemmy behavior or
  // an accidental side-effect of their parser before implementing.
  // If intentional: change the tokenizer to stop at the first ::: it finds
  // (instead of tracking nesting depth) so one ::: closes everything.
  it.todo(
    "round-trips nested spoilers (Lemmy format: one ::: closes all levels)",
    () => {
      setMarkdown(
        editor,
        "::: spoiler Outer\n::: spoiler Inner\nDeep secret\n:::",
      );
      const md = getMarkdown(editor);
      expect(md).toContain("::: spoiler Outer");
      expect(md).toContain("::: spoiler Inner");
      expect(md).toContain("Deep secret");
    },
  );
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
