import { useCommentsQuery } from "@/src/queries/index";
import { CommentSkeleton } from "../../components/comments/comment-skeleton";
import { LoadingButton } from "../../components/ui/button";

export function MissingComment({
  postApId,
  path,
}: {
  postApId: string;
  path: string | undefined;
}) {
  const commentId = path ? parseInt(path.split(".").at(-1)!) : undefined;
  const query = useCommentsQuery(
    { postApId, parentId: commentId },
    { enabled: false },
  );
  return (
    <div className="relative" aria-label="missing comment">
      <CommentSkeleton lines={3} className="border-t-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingButton
          size="sm"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
          loading={query.isFetching}
        >
          Retry
        </LoadingButton>
      </div>
    </div>
  );
}
