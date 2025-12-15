export function getSelectedHtml(): string | undefined {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return undefined;

  const container = document.createElement("div");

  for (let i = 0; i < selection.rangeCount; i++) {
    container.appendChild(selection.getRangeAt(i).cloneContents());
  }

  return container.innerHTML || undefined;
}

function htmlToPlainText(html: string): string {
  try {
    const container = document.createElement("div");
    container.innerHTML = html;

    // Replace <br> with newline
    container.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));

    const blockTags = ["p", "div", "section", "article", "li", "blockquote"];

    const traverse = (node: Node): string => {
      let text = "";

      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const inner = traverse(el);
          if (blockTags.includes(el.tagName.toLowerCase())) {
            text += inner.trim() + "\n\n";
          } else {
            text += inner;
          }
        }
      });

      return text;
    };

    return traverse(container)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return "";
  }
}

function toMarkdownQuote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function getSelectedAsMarkdownQuote() {
  const html = getSelectedHtml();
  if (html) {
    return toMarkdownQuote(htmlToPlainText(html));
  }
  return "";
}
