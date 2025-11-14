import { cn } from "@/src/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative overflow-hidden bg-muted rounded-md", className)}
      {...props}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent" />
    </div>
  );
}

export { Skeleton };
