import { useTheme } from "@/src/lib/hooks";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";

export function SoundCloudEmbed({ url }: { url: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  return (
    <iframe
      className={cn(
        "rounded-lg bg-muted border aspect-video",
        ABOVE_LINK_OVERLAY,
      )}
      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&show_teaser=true&visual=true&color=%23${isDark ? "876cff" : "4123d0"}`}
    />
  );
}
