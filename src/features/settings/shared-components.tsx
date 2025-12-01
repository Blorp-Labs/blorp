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
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="divide-y-[.5px] flex flex-col">{children}</div>
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
        "py-2 text-start",
        !unstyled && "flex items-center justify-between",
      )}
    >
      <>{children}</>
    </Comp>
  );
}
