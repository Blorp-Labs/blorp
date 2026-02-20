import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";

export function BandcampEmbed({ embedVideoUrl }: { embedVideoUrl: string }) {
  return (
    <iframe
      className={cn(
        "aspect-video rounded-lg h-30 bg-white",
        ABOVE_LINK_OVERLAY,
      )}
      src={embedVideoUrl}
      allowFullScreen
    />
  );
}
