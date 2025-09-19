import type { Meta, StoryObj } from "@storybook/react-vite";

import { MarkdownRenderer } from "./renderer";

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof MarkdownRenderer> = {
  component: MarkdownRenderer,
};

export default meta;
type Story = StoryObj<typeof MarkdownRenderer>;

export const AllHeadings: Story = {
  args: {
    markdown: `
# Heading Level 1

## Heading Level 2

### Heading Level 3

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6
`,
  },
};

export const Paragraph: Story = {
  args: {
    markdown: `This is a simple paragraph to test regular text rendering. It should wrap and preserve line breaks properly when needed.`,
  },
};

export const Emphasis: Story = {
  args: {
    markdown: `This text shows *italic*, **bold**, ***bold italic***, and ~~strikethrough~~ styles in one place.`,
  },
};

export const LinksAndImages: Story = {
  args: {
    markdown: `
Here’s a [link to Storybook](https://storybook.js.org).

And here’s an image:

![test image](https://picsum.photos/id/10/200/100)
`,
  },
};

export const Lists: Story = {
  args: {
    markdown: `
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
  },
};

export const BlockquoteAndHr: Story = {
  args: {
    markdown: `
> This is a blockquote. It should be indented and styled distinctly.

---

Above is a horizontal rule.
`,
  },
};

export const InlineCode: Story = {
  args: {
    markdown: `Here’s some inline \`code\` in a sentence.`,
  },
};

export const CodeBlock: Story = {
  args: {
    markdown: `
\`\`\`javascript
// JavaScript code block
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet("World"));
\`\`\`
`,
  },
};

export const Table: Story = {
  args: {
    markdown: `
| Feature     | Supported | Notes                |
|-------------|-----------|----------------------|
| Tables      | ✅         | Renders with borders |
| Alignment   | ✅         | Left, center, right  |
| Multi-line  | ✅         | Wraps text           |
`,
  },
};

export const MixedContent: Story = {
  args: {
    markdown: `
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
  },
};

export const HTMLInsideMarkdown: Story = {
  args: {
    markdown: `
You can even embed raw HTML:

<div style="padding: 10px; border: 1px solid #ddd;">
  <strong>HTML Block</strong> inside Markdown!
</div>
`,
  },
};

export const SpoilerContainer: Story = {
  args: {
    markdown: `
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
  },
};

export const SubScript: Story = {
  args: {
    markdown: `
Here is some~subscript~isn't that cool
`,
  },
};

export const SupScript: Story = {
  args: {
    markdown: `
Here is some^supscript^isn't that cool
`,
  },
};
