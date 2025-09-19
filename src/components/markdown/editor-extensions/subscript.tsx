import { Mark, mergeAttributes } from "@tiptap/core";
import MarkdownIt from "markdown-it";
// @ts-expect-error
import markdownitSub from "markdown-it-sub";

const Subscript = Mark.create({
  name: "subscript",

  parseHTML() {
    return [{ tag: "sub" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit: MarkdownIt) {
            markdownit.use(markdownitSub);
          },
        },
      },
    };
  },
});

export default Subscript;
