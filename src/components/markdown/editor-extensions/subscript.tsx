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
        // tell markdown-it how to parse `H~2~0` into a <sub> mark
        parse: {
          setup(md: MarkdownIt) {
            md.use(markdownitSub);
          },
        },
        // tell tiptap-markdown how to *serialize* this mark back to markdown
        serialize: {
          open: "~",
          close: "~",
          // these two flags match how other inline marks behave
          mixable: true,
          expelEnclosingWhitespace: true,
        },
      },
    };
  },
});

export default Subscript;
