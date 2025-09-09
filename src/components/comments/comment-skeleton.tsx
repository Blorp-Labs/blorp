import { Skeleton } from "../ui/skeleton";

export function CommentSkeleton() {
  return (
    <div className="max-md:mt-2 border-t max-md:px-3.5 py-3 flex flex-col gap-2 bg-background">
      <div className="flex flex-row gap-2 items-center">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-32 self-end" />
    </div>
  );
}
