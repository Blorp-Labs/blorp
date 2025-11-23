import MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token.mjs";

/**
 * Extract first N sentences from whitelisted markdown content.
 * Only headings and paragraphs are included.
 *
 * @param markdown - The markdown input.
 * @param numSentences - Number of sentences to extract.
 * @returns - Plain text with first N sentences.
 */
export function removeMd(markdown: string) {
  const md = new MarkdownIt();
  const tokens = md.parse(markdown, []);

  const allowedOpenTypes = ["paragraph_open", "heading_open"];
  const textChunks = [];
  let capture = false;
  let skipped = false;

  // Helper to extract only text from inline tokens (ignoring strong/em/code, etc.)
  function extractInlineText(inlineToken: Token) {
    if (!inlineToken.children) return "";
    return inlineToken.children
      .filter((t) => t.type === "text")
      .map((t) => t.content)
      .join("");
  }

  for (const token of tokens) {
    // Start capturing only on allowed opening token
    if (allowedOpenTypes.includes(token.type)) {
      capture = true;
      continue;
    }

    // Stop capturing at closing token
    if (token.type.endsWith("_close") && capture) {
      capture = false;
      continue;
    }

    // If we hit a non-whitelisted token outside a capture block, terminate
    if (!capture && !allowedOpenTypes.includes(token.type)) {
      skipped = true;
      break; // terminate immediately
    }

    // Capture text inside inline tokens
    if (capture && token.type === "inline") {
      textChunks.push(extractInlineText(token));
    }
  }

  const text = textChunks.join(" ").replace(/\s+/g, " ").trim();
  return skipped ? `${text.replace(/\.$/, "")}…` : text;
}
