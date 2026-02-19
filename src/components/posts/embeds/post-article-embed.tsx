import { Browser } from "@capacitor/browser";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  InAppBrowser,
  DefaultSystemBrowserOptions,
} from "@capacitor/inappbrowser";
import { isAndroid, isCapacitor, isIos, isTauri } from "@/src/lib/device";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "@/src/components/ui/skeleton";
import { MouseEventHandler, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { ABOVE_LINK_OVERLAY } from "../config";

function getDisplayUrl(url: string) {
  try {
    let displayUrl = url;
    let host = url;
    if (displayUrl) {
      const parsedUrl = new URL(displayUrl);
      host = parsedUrl.host.replace(/^www\./, "");
      displayUrl = `${host}${parsedUrl.pathname.replace(/\/$/, "")}`;
    }
    return {
      host,
      displayUrl,
    };
  } catch {
    return {
      displayUrl: url,
    };
  }
}

function deferUntilFocused(fn: () => void) {
  if (typeof document !== "undefined" && !document.hasFocus()) {
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      // Tiny deferral lets Android settle window focus
      setTimeout(fn, 50);
    };
    window.addEventListener("focus", onFocus);
  } else {
    // Next tick prevents running inside an onClick bubble
    setTimeout(fn, 0);
  }
}

export function getLinkHandler(
  url?: string | null,
): MouseEventHandler<HTMLAnchorElement> {
  return (e) => {
    if (!url) return;

    // Desktop (Tauri): open with OS
    if (isTauri()) {
      e.preventDefault();
      openUrl(url);
      return;
    }

    // Mobile (Capacitor)
    if (isCapacitor() && isAndroid()) {
      // Use Capacitor Browser (Custom Tabs) – safer on Android
      e.preventDefault();
      deferUntilFocused(() => {
        Browser.open({ url });
      });
      return;
    }

    if (isCapacitor() && isIos()) {
      // Keep InAppBrowser on iOS with Reader Mode
      e.preventDefault();
      deferUntilFocused(() => {
        InAppBrowser.openInSystemBrowser({
          url,
          options: {
            ...DefaultSystemBrowserOptions,
            iOS: {
              ...DefaultSystemBrowserOptions.iOS,
              enableReadersMode: true,
            },
          },
        });
      });
      return;
    }

    // Web fallback: let the anchor behave normally (no preventDefault)
    // so Cmd/Ctrl+click etc works.
  };
}

export function PostArticleMiniEmbed({
  url,
  thumbnail,
  blurNsfw,
  className,
}: {
  url?: string | null;
  thumbnail?: string | null;
  blurNsfw: boolean;
  className?: string;
}) {
  const [imageStatus, setImageStatus] = useState<
    "loading" | "error" | "success"
  >("loading");

  const showImage = thumbnail && imageStatus !== "error";

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={getLinkHandler(url)}
      style={{
        display: !url ? "none" : undefined,
      }}
      className={cn(
        "flex flex-col relative overflow-hidden",
        !showImage && "bg-secondary",
        className,
      )}
    >
      {thumbnail && showImage ? (
        <>
          {imageStatus === "loading" && (
            <Skeleton className="absolute inset-0 rounded-b-none" />
          )}
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 object-cover w-full h-full",
              blurNsfw && "blur-3xl",
            )}
            onLoad={() => setImageStatus("success")}
            onError={() => {
              console.log("err");
              setImageStatus("error");
            }}
          />
          {blurNsfw && (
            <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
              NSFW
            </div>
          )}
        </>
      ) : (
        <FaExternalLinkAlt className="text-2xl text-muted-foreground m-auto -translate-y-2" />
      )}
      {url && (
        <div className="absolute inset-x-1 bottom-1 bg-black/30 text-white rounded-sm px-1 backdrop-blur-sm backdrop-invert-25 flex items-center gap-1">
          <span className="text-xs truncate text-ellipsis flex-1">
            {getDisplayUrl(url).host}
          </span>
          {showImage && <FaExternalLinkAlt className="text-xs scale-80" />}
        </div>
      )}
    </a>
  );
}

export function PostArticleEmbed({
  url,
  thumbnail,
  blurNsfw,
}: {
  url?: string | null;
  thumbnail?: string | null;
  blurNsfw: boolean;
}) {
  const [imageStatus, setImageStatus] = useState<
    "loading" | "error" | "success"
  >("loading");

  const showImage = thumbnail && imageStatus !== "error";

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={getLinkHandler(url)}
      style={{
        display: !url ? "none" : undefined,
      }}
      className={cn("flex flex-col", ABOVE_LINK_OVERLAY)}
    >
      {thumbnail && showImage && (
        <div className="relative aspect-video overflow-hidden">
          {imageStatus === "loading" && (
            <Skeleton className="absolute inset-0 rounded-b-none rounded-xl" />
          )}
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 object-cover w-full h-full aspect-video rounded-xl",
              blurNsfw && "blur-3xl",
            )}
            onLoad={() => setImageStatus("success")}
            onError={() => setImageStatus("error")}
          />
          {blurNsfw && (
            <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
              NSFW
            </div>
          )}

          {url && (
            <div className="absolute inset-x-2 bottom-2 bg-black/30 text-white rounded-lg px-3 py-1 backdrop-blur-sm backdrop-invert-25 flex items-center gap-1">
              <span className="truncate text-ellipsis flex-1">
                {getDisplayUrl(url).displayUrl}
              </span>
              <FaExternalLinkAlt className="text-sm" />
            </div>
          )}
        </div>
      )}
      {url && !showImage && (
        <div
          className={cn(
            "p-3 bg-zinc-200 dark:bg-zinc-800 truncate text-ellipsis rounded-xl text-sm text-zinc-500 flex items-center gap-1",
          )}
        >
          <span className="truncate text-ellipsis">
            {getDisplayUrl(url).displayUrl}
          </span>
          <FaExternalLinkAlt className="text-sm" />
        </div>
      )}
    </a>
  );
}
