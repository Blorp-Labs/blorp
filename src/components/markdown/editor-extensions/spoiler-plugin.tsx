// DetailsMarkdown.ts
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "@tiptap/extension-details";
import MarkdownIt from "markdown-it";
import markdownitContainer, { ContainerOpts } from "markdown-it-container";
import { MarkdownSerializerState } from "prosemirror-markdown";
import { Node } from "prosemirror-model";

/**
 * Parent node: serialize the whole <details> tree as a single HTML block,
 * which is valid inside Markdown.
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

  addStorage() {
    return {
      markdown: {
        serialize: (state: MarkdownSerializerState, node: Node) => {
          state.ensureNewLine();
          state.write(`::: spoiler `);

          // summary is usually the first child node:
          const first = node.firstChild;
          if (first && first.type.name === "detailsSummary") {
            state.renderInline(first); // render only its inline content
          }
          state.write(`\n`);

          // everything else is the “content” part
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child.type.name === "detailsSummary") continue;
            // If you use DetailsContent, render the content of that wrapper:
            if (child.type.name === "detailsContent") {
              state.renderContent(child);
              // @ts-expect-error
              state.closed = null;
            } else {
              state.render(child, node, i);
            }
            state.ensureNewLine();
          }

          state.write(`:::\n\n`);
        },

        // Import: no custom tokens needed — rely on Markdown HTML passthrough
        // (enabled by default), and keep the HTML as-is when reading Markdown.
        // If you also want HTML -> Details node mapping, keep Details.parseHTML()
        // from the original tiptap extension (it already parses <details> tags).
        parse: {
          setup(md: MarkdownIt) {
            md.use(markdownitContainer, "spoiler", {
              validate: function (params) {
                return /^spoiler\s+(.*)$/.test(params.trim());
              },

              render: function (tokens, idx) {
                const m = tokens[idx]!.info.trim().match(
                  /^spoiler(?:\s+(.*))?$/,
                );
                const raw = m?.[1] ?? "";
                // ⬇️ Parse inline markdown (**bold**, _em_, `code`, links…) to HTML
                const summaryHTML = raw ? md.renderInline(raw) : "";

                if (tokens[idx]!.nesting === 1) {
                  // opening tag
                  return `<details open><summary>${summaryHTML}</summary>\n`;
                } else {
                  // closing tag
                  return "</details>\n";
                }
              },
            } satisfies ContainerOpts);
          },
        },
      },
    };
  },
});

/**
 * Child nodes: let the parent handle serialization so we don’t emit
 * duplicate text around <summary>…</summary>.
 */
export const DetailsSummaryWithMarkdown = DetailsSummary.extend({
  addStorage() {
    return {
      markdown: {
        // parent serializes the summary, so do nothing here
        serialize: () => {},
      },
    };
  },
});

export const DetailsContentWithMarkdown = DetailsContent.extend({
  addStorage() {
    return {
      markdown: {
        // parent serializes the content, so do nothing here
        serialize: () => {},
      },
    };
  },
});
