import { ContentGutters } from "../gutters";

export function NoPersonPostsMessage({
  isBlocked,
  blockedName,
}: {
  isBlocked?: boolean;
  blockedName?: string;
}) {
  return (
    <ContentGutters>
      <div className="flex-1 italic text-muted-foreground p-6 text-center">
        <span>
          {isBlocked
            ? `You have ${blockedName} blocked`
            : "Nothing to see here"}
        </span>
      </div>
      <></>
    </ContentGutters>
  );
}
