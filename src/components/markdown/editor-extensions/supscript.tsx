import { Mark, mergeAttributes } from "@tiptap/core";
import MarkdownIt from "markdown-it";
// @ts-expect-error
import markdownitSup from "markdown-it-sup";

const Superscript = Mark.create({
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
        // parse ^ … ^ into <sup>
        parse: {
          setup(markdownit: MarkdownIt) {
            markdownit.use(markdownitSup);
          },
        },
        // serialize <sup> back to ^ … ^
        serialize: {
          open: "^",
          close: "^",
          mixable: true,
          expelEnclosingWhitespace: true,
        },
      },
    };
  },
});

export default Superscript;
