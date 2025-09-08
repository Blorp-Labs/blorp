import MarkdownIt from "markdown-it";
import markdownitContainer, { ContainerOpts } from "markdown-it-container";
import { useLinkContext } from "../../routing/link-context";
import parse, {
  DOMNode,
  domToReact,
  HTMLReactParserOptions,
} from "html-react-parser";
import { Link, LinkProps } from "@/src/routing/index";
import { CodeBlock } from "./code-block";
import {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  ImgHTMLAttributes,
  useContext,
} from "react";
import { cn } from "@/src/lib/utils";
import DOMPurify from "dompurify";
import { createContext } from "react";
import { RoutePath } from "@/src/routing/routes";
import footnotePlugin from "markdown-it-footnote";

const COMMUNITY_BANG =
  /^!([A-Za-z0-9_-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})$/;

const Context = createContext({
  insideLink: false,
});

const INSIDE_LINK_CTX = { insideLink: true };
function DisableLinks({ children }: { children: React.ReactNode }) {
  return (
    <Context.Provider value={INSIDE_LINK_CTX}>{children}</Context.Provider>
  );
}

function SafeRouterLink<Path extends RoutePath>(props: LinkProps<Path>) {
  const { insideLink } = useContext(Context);
  return insideLink ? (
    <span {...props} />
  ) : (
    <Link {...props}>
      <DisableLinks>{props.children}</DisableLinks>
    </Link>
  );
}

function SafeAnchor(
  props: DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >,
) {
  const { insideLink } = useContext(Context);
  return insideLink ? (
    <span {...props} className={cn("underline", props.className)} />
  ) : (
    <a {...props}>
      <DisableLinks>{props.children}</DisableLinks>
    </a>
  );
}

function Image(
  props: DetailedHTMLProps<
    ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >,
) {
  const linkCtx = useLinkContext();
  if (props.src) {
    return (
      <SafeRouterLink
        to={`${linkCtx.root}lightbox/:imgUrl`}
        params={{
          imgUrl: encodeURIComponent(props.src),
        }}
      >
        <img {...props} />
      </SafeRouterLink>
    );
  }
  return <img {...props} />;
}

const options: (
  root: "/home/" | "/communities/" | "/inbox/",
) => HTMLReactParserOptions = (root) => ({
  replace: (domNode) => {
    // Check if the node is an anchor element
    if (domNode.type === "tag" && domNode.name === "a" && domNode.attribs) {
      const href = domNode.attribs["href"] ?? "";
      const textContent =
        domNode.children[0] && "data" in domNode.children[0]
          ? domNode.children[0].data
          : null;

      // Replace "!community@server" with "/selected-tab/c/community"
      if (textContent && COMMUNITY_BANG.test(textContent)) {
        const href = `${root}c/${textContent.substring(1)}`;
        return (
          <SafeRouterLink to={href as never} params={{} as never}>
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeRouterLink>
        );
      }

      // Replace "/c/community" with "/selected-tab/c/community"
      if (/^\/c\/[^/]+$/i.test(href)) {
        return (
          <SafeRouterLink
            to={(root + href.substring(1)) as never}
            params={{} as never}
          >
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeRouterLink>
        );
      }

      // Replace "/u/community" with "/selected-tab/u/community"
      if (/^\/u\/[^/]+$/i.test(href)) {
        return (
          <SafeRouterLink
            to={(root + href.substring(1)) as never}
            params={{} as never}
          >
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeRouterLink>
        );
      }

      if (href.startsWith("/")) {
        return (
          <SafeRouterLink to={href as never} params={{} as never}>
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeRouterLink>
        );
      } else if (href.startsWith("#")) {
        return (
          <SafeAnchor href={href}>
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeAnchor>
        );
      } else {
        return (
          <SafeAnchor href={href} target="_blank" rel="noreferrer noopener">
            {domToReact(domNode.children as DOMNode[], options(root))}
          </SafeAnchor>
        );
      }
    }

    if (domNode.type === "tag" && domNode.name === "code") {
      // Extract language from class, e.g., "language-js".
      const classAttr = domNode.attribs?.["class"] || "";
      const match = classAttr.match(/language-(\w+)/);
      const language = match && match[1] ? match[1] : "plaintext";
      // Assume the code is stored as text in the first child.
      const code =
        domNode.children[0] && "data" in domNode.children[0]
          ? domNode.children[0].data || ""
          : "";

      // Replace the node with our CodeBlock component.
      return <CodeBlock language={language} code={code} />;
    }

    if (domNode.type === "tag" && domNode.name === "img") {
      return <Image {...domNode.attribs} />;
    }
  },
});

function createMd(root: ReturnType<typeof useLinkContext>["root"]) {
  const md = MarkdownIt({
    linkify: true,
    html: true,
  });

  md.use(footnotePlugin);

  // Extend linkify for lemmy links starting with "!"
  md.linkify.add("!", {
    // The validate function checks that the text starting at position pos
    // matches our desired lemmy link pattern.
    validate: function (text, pos) {
      // Attempt to match the pattern: !community@host
      const tail = text.slice(pos);
      const match = tail.match(/^([\w-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) {
        // Return the length of the matched text.
        return match[0].length;
      }
      return 0;
    },
    // The normalize function lets us customize how the matched text becomes a URL.
    normalize: function (match) {
      match.url = `${root}c/${match.raw.substring(1)}`;
    },
  });

  md.linkify.add("@", {
    // The validate function checks that the text starting at position pos
    // matches our desired lemmy link pattern.
    validate: function (text, pos) {
      // Attempt to match the pattern: @user@host
      const tail = text.slice(pos);
      const match = tail.match(/^([\w-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) {
        // Return the length of the matched text.
        return match[0].length;
      }
      return 0;
    },
    // The normalize function lets us customize how the matched text becomes a URL.
    normalize: function (match) {
      match.url = `${root}u/${match.raw.substring(1)}`;
    },
  });

  md.use(markdownitContainer, "spoiler", {
    validate: function (params) {
      return /^spoiler\s+(.*)$/.test(params.trim());
    },

    render: function (tokens, idx) {
      const m = tokens[idx]!.info.trim().match(/^spoiler\s+(.*)$/);
      const summary = m?.[1] ? md.utils.escapeHtml(m[1]) : "";

      if (tokens[idx]!.nesting === 1) {
        // opening tag
        return `<details><summary>${summary}</summary>\n`;
      } else {
        // closing tag
        return "</details>\n";
      }
    },
  } satisfies ContainerOpts);

  return md;
}

const RENDERERS: Record<ReturnType<typeof useLinkContext>["root"], MarkdownIt> =
  {
    "/home/": createMd("/home/"),
    "/inbox/": createMd("/inbox/"),
    "/communities/": createMd("/communities/"),
  };

export function MarkdownRenderer({
  markdown,
  className,
  dim,
  disableLinks,
  id,
}: {
  markdown: string;
  className?: string;
  dim?: boolean;
  disableLinks?: boolean;
  id?: string;
}) {
  const root = useLinkContext().root;
  const content = (
    <div
      className={cn("markdown-content", dim && "text-foreground/70", className)}
      id={id}
    >
      {parse(
        DOMPurify.sanitize(RENDERERS[root].render(markdown)),
        options(root),
      )}
    </div>
  );
  return disableLinks ? <DisableLinks>{content}</DisableLinks> : content;
}
