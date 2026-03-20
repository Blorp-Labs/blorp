import { ContentGutters } from "./gutters";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";

export function StickyFilterBar({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <ContentGutters className={cn("max-md:border-b-[.5px]", className)}>
      <div>
        <div
          className={cn(
            "flex flex-row md:bg-background flex-1 items-center md:-mx-2 md:px-2 h-12 gap-2",
            innerClassName,
          )}
        >
          {children}
        </div>
        <Separator className="max-md:hidden" />
      </div>
      <></>
    </ContentGutters>
  );
}
