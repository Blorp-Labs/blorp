import { useMemo } from "react";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";

export function PeerTubeEmbed({ url }: { url: string }) {
  const embedUrl = useMemo(() => {
    return url
      .replace("/videos/watch/", "/videos/embed/")
      .replace("/w/", "/videos/embed/");
  }, [url]);
  return (
    <iframe
      className={cn("aspect-video rounded-lg", ABOVE_LINK_OVERLAY)}
      src={embedUrl}
      allowFullScreen
    />
  );
}
