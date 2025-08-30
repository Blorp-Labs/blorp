// MentionMenu.tsx
import React, {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Item = { id: string; label: string; avatar?: string };
type Props = {
  items: Item[];
  command: (item: Item) => void;
  clientRect: (() => DOMRect | null) | null;
};

const EMTPRY_ARR = [] as never[];

const MentionMenu = React.forwardRef<any, Props>(
  ({ items, command, clientRect }, ref) => {
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement | null>(null);

    items ??= EMTPRY_ARR;

    // Keep active index in range
    useEffect(() => {
      if (items.length === 0) setActive(0);
      else if (active > items.length - 1) setActive(items.length - 1);
    }, [items, active]);

    // Expose keyboard handling to Suggestion.onKeyDown
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActive((a) => (a + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive(
            (a) =>
              (a - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1),
          );
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (items[active]) command(items[active]);
          return true;
        }
        return false;
      },
    }));

    // Position near caret
    useLayoutEffect(() => {
      const r = clientRect?.();
      const el = rootRef.current;
      if (!r || !el) return;
      el.style.position = "absolute";
      el.style.left = `${r.left + window.scrollX}px`;
      el.style.top = `${r.bottom + window.scrollY + 4}px`;
      el.style.zIndex = "9999";
    });

    if (!items.length) {
      return null;
    }

    return (
      <div
        ref={rootRef}
        className="min-w-48 max-w-80 rounded-md border border-border bg-popover text-popover-foreground shadow-md"
      >
        <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
          {items.map((it, i) => (
            <li key={it.id}>
              <div
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep editor focused
                  command(it);
                }}
                className={[
                  "flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm",
                  i === active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                <span className="truncate">{it.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

export default MentionMenu;
