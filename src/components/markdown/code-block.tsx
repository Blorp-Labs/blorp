// CodeBlock.tsx
import React, { useState } from "react";
import { common, createLowlight } from "lowlight";
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Combobox } from "../ui/combox";
import { Button } from "../ui/button";
import { cn } from "@/src/lib/utils";
import { ChevronsUpDown } from "lucide-react";

export const lowlight = createLowlight(common);

// Define a type for lowlight AST nodes.
interface LowlightNode {
  type: string;
  value?: string;
  children?: LowlightNode[];
  properties?: {
    className?: string[];
  };
}

// Recursively render lowlight nodes as React elements.
function renderLowlightNodes(nodes: LowlightNode[]): React.ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "text") {
      return node.value;
    }

    const className =
      node.properties && node.properties.className
        ? node.properties.className.join(" ")
        : "";

    return (
      <span key={index} className={className}>
        {node.children && renderLowlightNodes(node.children)}
      </span>
    );
  });
}

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  try {
    // lowlight.highlight returns an object with children as AST nodes.
    const highlighted = lowlight.highlight(language, code);
    return (
      <code className="font-mono text-[.75rem]">
        {renderLowlightNodes(highlighted.children as LowlightNode[])}
      </code>
    );
  } catch {
    return <code className="font-mono text-[.75rem]">{code}</code>;
  }
};

export function CodeBlockEditor({
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  extension,
}: NodeViewProps) {
  const [lang, setLang] = useState(defaultLanguage);

  return (
    <NodeViewWrapper>
      <pre className="relative font-mono text-[.75rem]">
        {/* Types seem to be broken here */}
        <NodeViewContent as={"code" as "div"} />

        <Combobox
          trigger={({ isOpen }) => (
            <Button
              size="sm"
              variant="link"
              className={cn(
                "w-[200px] justify-between text-white",
                "absolute top-0 right-0 w-auto text-xs",
              )}
              role="combobox"
              aria-expanded={isOpen}
            >
              {lang
                ? lowlight
                    .listLanguages()
                    .map((lang: string) => ({
                      label: lang,
                      value: lang,
                    }))
                    .find((framework) => framework.value === lang)?.label
                : "Select language..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          )}
          value={lang}
          options={extension.options.lowlight
            .listLanguages()
            .map((lang: string) => ({
              label: lang,
              value: lang,
            }))}
          onChange={(opt) => {
            setLang(opt.value);
            updateAttributes({ language: opt.value });
          }}
          align="end"
        />
      </pre>
    </NodeViewWrapper>
  );
}
