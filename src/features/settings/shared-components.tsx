import { cn } from "@/src/lib/utils";
import { Link } from "react-router-dom";

export function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className="text-xs font-medium text-muted-foreground mb-1.5">
        {title}
      </h2>
      <div className="border px-3 rounded-md">
        <div className="divide-y-[.5px] flex flex-col">{children}</div>
      </div>
    </section>
  );
}

export function SectionItem({
  children,
  to,
  unstyled,
  ...rest
}: {
  id?: string;
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  rel?: string;
  target?: string;
  unstyled?: boolean;
}) {
  let Comp: "div" | "a" | "button" | typeof Link = "div";

  if (to) {
    Comp = Link;
  }
  if (rest.href) {
    Comp = "a";
  }
  if (rest.onClick) {
    Comp = "button";
  }

  return (
    <Comp
      to={to as any}
      {...rest}
      className={cn(
        "py-2 text-start first:rounded-t-md last:rounded-b-md",
        (to || rest.href || rest.onClick) && "hover:bg-secondary -mx-3 px-3",
        !unstyled && "flex items-center justify-between",
      )}
    >
      <>{children}</>
    </Comp>
  );
}
