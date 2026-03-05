import Subscript from "@tiptap/extension-subscript";
import type {
  JSONContent,
  MarkdownToken,
  MarkdownParseHelpers,
  MarkdownParseResult,
  MarkdownRendererHelpers,
  MarkdownTokenizer,
} from "@tiptap/core";

export default Subscript.extend({
  markdownTokenizer: {
    name: "subscript",
    level: "inline",
    start: "~",
    tokenize(src, _tokens, lexer): MarkdownToken | undefined {
      const match = src.match(/^~([^~\n]+)~/);
      if (!match) return undefined;
      return {
        type: "subscript",
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
      mark: "subscript",
      content: helpers.parseInline(token.tokens || []),
    };
  },

  renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers): string {
    return `~${helpers.renderChildren(node.content || [])}~`;
  },
});
