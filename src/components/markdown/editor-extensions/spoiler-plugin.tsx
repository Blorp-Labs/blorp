import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import markdownitContainer from "markdown-it-container";
import MarkdownIt from "markdown-it";
const md = MarkdownIt();

const SPOILER_TAG_NAME = "lemmy-spoiler";

import * as Prosemirror from "prosemirror-model";

function Component() {
  return (
    <NodeViewWrapper className="border border-foreground border-dashed p-2 inline-block">
      <NodeViewContent className="spoiler" />
    </NodeViewWrapper>
  );
}

export default Node.create({
  name: SPOILER_TAG_NAME,

  group: "block",
  content: "block+",

  parseHTML() {
    return [
      {
        tag: SPOILER_TAG_NAME,
      },
    ];
  },

  addCommands() {
    return {
      insertSpoiler: () => {
        return this.editor
          .chain()
          .insertContentAt(
            this.editor.state.selection.head,
            `<${SPOILER_TAG_NAME}>Spoiler\nDetails</${SPOILER_TAG_NAME}>`,
          )
          .focus()
          .run();
      },
    } as any;
  },

  renderHTML({ HTMLAttributes }) {
    return [SPOILER_TAG_NAME, mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Component);
  },

  addStorage() {
    return {
      markdown: {
        serialize: function (state: any, node: Prosemirror.Node) {
          // @ts-expect-error
          const serializer = this.editor.storage.markdown.serializer;

          const textContent = serializer.serialize(node);

          const [title, ...rest] = textContent.split("\n");
          const body = rest.join("\n");

          // Write markdown using markdown-it-container syntax.
          state.write(`::: spoiler ${title}\n`);
          state.write(body);
          state.flushClose(1);
          state.write("\n:::");
          state.closeBlock(node);
        },
        parse: {
          setup(markdownIt: MarkdownIt) {
            markdownIt.use(markdownitContainer, "spoiler", {
              validate(params: string) {
                return params.trim().match(/^spoiler\s+(.*)$/);
              },
              render(tokens: any, idx: number) {
                const m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);
                if (tokens[idx].nesting === 1) {
                  // opening tag
                  const content = md.utils.escapeHtml(m[1]);
                  return `<${SPOILER_TAG_NAME}>${content}`;
                } else {
                  // closing tag
                  return `</${SPOILER_TAG_NAME}>\n`;
                }
              },
            });
          },
        },
      },
    };
  },
});
