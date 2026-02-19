import { useState } from "react";
import { Button } from "../../ui/button";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";

export function IFramePostEmbed({ embedVideoUrl }: { embedVideoUrl: string }) {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <div
        className={cn(
          "aspect-video rounded-lg bg-secondary flex flex-col items-center justify-center gap-2",
          ABOVE_LINK_OVERLAY,
        )}
      >
        <span className="text-center max-w-md text-muted-foreground">
          We are unable to verify the content embedded in this post. Proceeding
          may lead to unexpected behavior.
        </span>
        <Button
          variant="ghost"
          onClick={() => setShow(true)}
          className="text-amber-600 hover:text-amber-600"
        >
          Show content anyway?
        </Button>
      </div>
    );
  }

  return (
    <iframe
      className={cn("aspect-video rounded-lg", ABOVE_LINK_OVERLAY)}
      src={embedVideoUrl}
      allowFullScreen
    />
  );
}
