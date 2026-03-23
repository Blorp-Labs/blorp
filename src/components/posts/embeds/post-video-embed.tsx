import { useMedia } from "@/src/lib/hooks";
import ReactPlayer from "react-player";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";

const VIDEO_STYLE = {
  width: "100%",
  height: "auto",
  aspectRatio: "16/9",
  borderRadius: "var(--radius)",
  overflow: "hidden",
};

const NO_BORDER_RADIUS = {
  borderRadius: 0,
};

export function PostVideoEmbed({
  url,
  thumbnail,
  nsfw,
  apId,
  detailView,
}: {
  url: string;
  thumbnail?: string | null;
  nsfw?: boolean;
  apId?: string;
  detailView?: boolean;
}) {
  const media = useMedia();
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
    { apId, detailView },
  );
  return (
    <div
      className={cn(
        "max-md:-mx-3.5 relative overflow-hidden md:rounded-md",
        ABOVE_LINK_OVERLAY,
      )}
    >
      {nsfwHidden ? (
        <div className={cn("aspect-video bg-muted relative overflow-hidden")}>
          {thumbnail && (
            <img
              src={thumbnail}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                blurClassName,
              )}
            />
          )}
        </div>
      ) : (
        <ReactPlayer
          style={{
            ...VIDEO_STYLE,
            ...(media.maxMd ? NO_BORDER_RADIUS : {}),
          }}
          src={url}
          controls
          playsInline
        />
      )}
      {nsfwHidden && <ShowNsfwButton onReveal={onReveal} />}
    </div>
  );
}

PostVideoEmbed.embedTypes = ["video", "vimeo"];
