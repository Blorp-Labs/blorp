import type { Meta, StoryObj } from "@storybook/react-vite";

import { MarkdownEditor } from "./editor";

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof MarkdownEditor> = {
  component: MarkdownEditor,
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

export const AllHeadings: Story = {
  args: {
    content: `
# Heading Level 1

## Heading Level 2

### Heading Level 3

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6
`,
    onChange: () => {},
  },
};

export const Paragraph: Story = {
  args: {
    content: `This is a simple paragraph to test regular text rendering. It should wrap and preserve line breaks properly when needed.`,
    onChange: () => {},
  },
};

export const Emphasis: Story = {
  args: {
    content: `This text shows *italic*, **bold**, ***bold italic***, and ~~strikethrough~~ styles in one place.`,
    onChange: () => {},
  },
};

export const LinksAndImages: Story = {
  args: {
    content: `
Here’s a [link to Storybook](https://storybook.js.org).

And here’s an image:

![test image](https://picsum.photos/id/10/200/100)
`,
    onChange: () => {},
  },
};

export const Lists: Story = {
  args: {
    content: `
Unordered list:
- Item one
- Item two
  - Nested item
  - Another nested

Ordered list:
1. First
2. Second
   1. Sub-first
   2. Sub-second
`,
    onChange: () => {},
  },
};

export const BlockquoteAndHr: Story = {
  args: {
    content: `
> This is a blockquote. It should be indented and styled distinctly.

---

Above is a horizontal rule.
`,
    onChange: () => {},
  },
};

export const InlineCode: Story = {
  args: {
    content: `Here’s some inline \`code\` in a sentence.`,
    onChange: () => {},
  },
};

export const CodeBlock: Story = {
  args: {
    content: `
\`\`\`javascript
// JavaScript code block
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet("World"));
\`\`\`
`,
    onChange: () => {},
  },
};

export const Table: Story = {
  args: {
    content: `
| Feature     | Supported | Notes                |
|-------------|-----------|----------------------|
| Tables      | ✅         | Renders with borders |
| Alignment   | ✅         | Left, center, right  |
| Multi-line  | ✅         | Wraps text           |
`,
    onChange: () => {},
  },
};

export const MixedContent: Story = {
  args: {
    content: `
# Mixed Content Example

A paragraph with **mixed** elements, including:

- A list
- A [link](https://example.com)
- Inline \`code\`

> And a concluding blockquote to wrap things up.

\`\`\`python
# A Python code block
def add(a, b):
    return a + b
\`\`\`
`,
    onChange: () => {},
  },
};

export const SpoilerContainer: Story = {
  args: {
    content: `
Here’s some text before the spoiler.

::: spoiler Spoiler Title
This content is hidden until the user clicks to reveal it.

You can include **formatted** text, [links](https://example.com), lists, and more inside a spoiler:

- Hidden item 1
- Hidden item 2
  - Nested hidden subitem
:::

And here’s normal text after the spoiler.
`,
    onChange: () => {},
  },
};

export const Placeholder: Story = {
  args: {
    placeholder: "I am a placeholder",
  },
};

export const SubScript: Story = {
  args: {
    content: `
Here is some~subscript~isn't that cool
`,
    onChange: () => {},
  },
};

export const SupScript: Story = {
  args: {
    content: `
Here is some^supscript^isn't that cool
`,
    onChange: () => {},
  },
};
