import Superscript from "@tiptap/extension-superscript";
import type {
  JSONContent,
  MarkdownToken,
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  MarkdownTokenizer,
} from "@tiptap/core";

export default Superscript.extend({
  markdownTokenizer: {
    name: "superscript",
    level: "inline",
    start: "^",
    tokenize(src, _tokens, lexer): MarkdownToken | undefined {
      const match = src.match(/^\^([^\^\n]+)\^/);
      if (!match) return undefined;
      return {
        type: "superscript",
        raw: match[0],
        text: match[1],
        tokens: lexer.inlineTokens(match[1]!),
      };
    },
  } satisfies MarkdownTokenizer,

  parseMarkdown(
    token: MarkdownToken,
    helpers: MarkdownParseHelpers,
  ): MarkdownParseResult {
    return {
      mark: "superscript",
      content: helpers.parseInline(token.tokens || []),
    };
  },

  renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
    return `^${helpers.renderChildren(node.content || [])}^`;
  },
});
