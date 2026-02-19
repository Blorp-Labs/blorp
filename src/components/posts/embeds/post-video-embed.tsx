import { useMedia } from "@/src/lib/hooks";
import ReactPlayer from "react-player";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";

const VIDEO_STYLE = {
  width: "100%",
  height: "auto",
  aspectRatio: "16/9",
  borderRadius: "var(--radius)",
  overflow: "hidden",
};

const BLUR = {
  "--tw-blur": "blur(var(--blur-3xl))",
  filter: "var(--tw-blur)",
};

const NO_BORDER_RADIUS = {
  borderRadius: 0,
};

const EMPTY_OBJ = {} as const;

export function PostVideoEmbed({
  url,
  blurNsfw,
}: {
  url: string;
  blurNsfw: boolean;
}) {
  const media = useMedia();
  return (
    <div
      className={cn(
        "max-md:-mx-3.5 relative overflow-hidden md:rounded-md",
        ABOVE_LINK_OVERLAY,
      )}
    >
      <ReactPlayer
        style={{
          ...VIDEO_STYLE,
          ...(blurNsfw ? BLUR : EMPTY_OBJ),
          ...(media.maxMd ? NO_BORDER_RADIUS : EMPTY_OBJ),
        }}
        src={url}
        controls
        playsInline
      />
      {blurNsfw && (
        <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
          NSFW
        </div>
      )}
    </div>
  );
}

PostVideoEmbed.embedTypes = ["video", "vimeo"];
