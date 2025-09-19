import { Mark, mergeAttributes } from "@tiptap/core";
import MarkdownIt from "markdown-it";
// @ts-expect-error
import markdownitSup from "markdown-it-sup";

const Subscript = Mark.create({
  name: "supscript",

  parseHTML() {
    return [{ tag: "sup" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit: MarkdownIt) {
            markdownit.use(markdownitSup);
          },
        },
      },
    };
  },
});

export default Subscript;
