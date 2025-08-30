// suggestionConfig.tsx
import { SuggestionOptions } from "@tiptap/suggestion";
import { MentionNodeAttrs } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import MentionMenu from "./mention-menu"; // the Radix Popover component below
import { useApiClients } from "@/src/lib/api";
import { useMemo, useRef } from "react";
import _ from "lodash";

const makeRenderer = () => {
  let renderer: ReactRenderer | null = null;

  return {
    onStart: (props: any) => {
      renderer = new ReactRenderer(MentionMenu, {
        editor: props.editor,
        props,
      });
      // just like the example: mount the host element into <body>
      document.body.appendChild(renderer.element);
    },
    onUpdate: (props: any) => {
      renderer?.updateProps(props);
    },
    onKeyDown: (props: any) => {
      if (props.event.key === "Escape") {
        renderer?.destroy();
        renderer = null;
        return true;
      }
      // forward arrows/enter to the component
      // @ts-ignore
      return renderer?.ref?.onKeyDown?.(props) ?? false;
    },
    onExit: () => {
      renderer?.destroy();
      renderer = null;
    },
  };
};

// Two triggers like your example:
const createMentionSuggestions = (
  char: string,
  queryItems: (ctx: {
    query: string;
  }) => Promise<MentionNodeAttrs[]> | undefined,
) =>
  ({
    char,
    allowSpaces: false,
    items: queryItems,
    render: makeRenderer,
    command: ({ editor, range, props }) => {
      const label = char + props.label;
      const href = props.id;
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "text",
            text: label,
            marks: [{ type: "link", attrs: { href } }],
          },
          { type: "text", text: " " }, // finish the link
        ])
        .run();
    },
  }) as Omit<SuggestionOptions<any, MentionNodeAttrs>, "editor">;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export function useMentionSuggestions() {
  const { api } = useApiClients();

  const signalRef = useRef<AbortController>(null);

  return useMemo(() => {
    const communityMentions = createMentionSuggestions(
      "!",
      async ({ query }: { query: string }) => {
        try {
          signalRef.current?.abort("outdated");
          signalRef.current = new AbortController();
          await sleep(500, signalRef.current.signal);
          const client = await api;
          const results = await client.search(
            {
              type: "Communities",
              q: query,
              limit: 10,
            },
            {
              signal: signalRef.current.signal,
            },
          );
          return results.communities.map((c) => ({
            label: c.slug,
            id: c.apId,
          }));
        } catch {
          return [];
        }
      },
    );

    const personMentions = createMentionSuggestions(
      "@",
      async ({ query }: { query: string }) => {
        try {
          signalRef.current?.abort("outdated");
          signalRef.current = new AbortController();
          await sleep(500, signalRef.current.signal);
          const client = await api;
          const results = await client.search(
            {
              type: "Users",
              q: query,
              limit: 10,
            },
            {
              signal: signalRef.current.signal,
            },
          );
          return results.users.map((c) => ({ label: c.slug, id: c.apId }));
        } catch {
          return [];
        }
      },
    );

    return [personMentions, communityMentions];
  }, [api]);
}
