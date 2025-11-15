import { cn } from "@/src/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative overflow-hidden bg-muted rounded-md", className)}
      {...props}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-muted via-neutral-300/60 dark:via-neutral-700/50 to-muted" />
    </div>
  );
}

export { Skeleton };
