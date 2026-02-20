// DetailsMarkdown.ts
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import type {
  JSONContent,
  MarkdownToken,
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  MarkdownTokenizer,
  MarkdownLexerConfiguration,
  RenderContext,
} from "@tiptap/core";

/**
 * Parent node: serialize the whole <details> tree as a single
 * `::: spoiler Title\n…\n:::` block.
 */
export const DetailsWithMarkdown = Details.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      open: {
        default: true,
        parseHTML: (el) => el.hasAttribute("open"),
        renderHTML: (attrs) => (attrs["open"] ? { open: "" } : {}),
      },
    };
  },

  markdownTokenizer: {
    name: "details",
    level: "block",

    start(src: string) {
      const idx = src.indexOf("::: spoiler ");
      return idx !== -1 ? idx : -1;
    },

    tokenize(
      src: string,
      _tokens: MarkdownToken[],
      lexer: MarkdownLexerConfiguration,
    ): MarkdownToken | undefined {
      // Match opening line: `::: spoiler <title>\n`
      const openingMatch = src.match(/^::: spoiler ([^\n]+)\n/);
      if (!openingMatch) return undefined;

      const [openingTag, summaryText] = openingMatch;

      // Find matching closing `:::` by tracking nesting level
      let level = 1;
      const position = openingTag.length;
      const remaining = src.slice(position);
      const blockPattern = /^:::([\w-]*)(\s.*)?/gm;

      blockPattern.lastIndex = 0;

      for (;;) {
        const match = blockPattern.exec(remaining);
        if (match === null) break;

        const matchPos = match.index;
        const blockType = match[1]; // empty for closing :::

        // Skip atom nodes (e.g. :::something attrs:::)
        if (match[2]?.endsWith(":::")) continue;

        if (blockType) {
          level += 1;
        } else {
          level -= 1;
          if (level === 0) {
            const rawContent = remaining.slice(0, matchPos);
            const fullMatch = src.slice(
              0,
              position + matchPos + match[0].length,
            );

            // Tokenize body as block tokens
            let contentTokens: MarkdownToken[] = [];
            const trimmedContent = rawContent.trim();
            if (trimmedContent) {
              contentTokens = lexer.blockTokens(rawContent);
              contentTokens.forEach((token) => {
                if (
                  token.text &&
                  (!token.tokens || token.tokens.length === 0)
                ) {
                  token.tokens = lexer.inlineTokens(token.text);
                }
              });
              // Clean up empty trailing paragraphs
              while (contentTokens.length > 0) {
                const lastToken = contentTokens[contentTokens.length - 1]!;
                if (
                  lastToken.type === "paragraph" &&
                  (!lastToken.text || lastToken.text.trim() === "")
                ) {
                  contentTokens.pop();
                } else {
                  break;
                }
              }
            }

            // Tokenize summary as inline tokens
            const summaryTokens = lexer.inlineTokens(summaryText!);

            return {
              type: "details",
              raw: fullMatch,
              summaryText,
              summaryTokens,
              tokens: contentTokens,
            };
          }
        }
      }

      return undefined;
    },
  } satisfies MarkdownTokenizer,

  parseMarkdown(
    token: MarkdownToken,
    helpers: MarkdownParseHelpers,
  ): MarkdownParseResult {
    const summaryContent = helpers.parseInline(token["summaryTokens"] || []);
    const bodyContent = helpers.parseChildren(token.tokens || []);

    const detailsSummary = helpers.createNode(
      "detailsSummary",
      {},
      summaryContent,
    );

    const detailsContent = helpers.createNode(
      "detailsContent",
      {},
      bodyContent.length > 0
        ? bodyContent
        : [helpers.createNode("paragraph", {}, [])],
    );

    return helpers.createNode("details", { open: true }, [
      detailsSummary,
      detailsContent,
    ]);
  },

  renderMarkdown(
    node: JSONContent,
    helpers: MarkdownRendererHelpers,
    _ctx: RenderContext,
  ): string {
    let summary = "";
    let body = "";

    for (const child of node.content || []) {
      if (child.type === "detailsSummary") {
        summary = helpers.renderChildren(child.content || []);
      } else if (child.type === "detailsContent") {
        body = helpers.renderChildren(child.content || [], "\n\n");
      }
    }

    return `::: spoiler ${summary}\n${body}\n:::`;
  },
});

/**
 * Child nodes: let the parent handle serialization so we don't emit
 * duplicate text around <summary>…</summary>.
 */
export const DetailsSummaryWithMarkdown = DetailsSummary.extend({
  renderMarkdown(): string {
    return "";
  },
});

export const DetailsContentWithMarkdown = DetailsContent.extend({
  renderMarkdown(): string {
    return "";
  },
});
