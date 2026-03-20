import { useEffect, useState } from "react";
import { isTauri } from "@/src/lib/device";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";

type GifData = { src: string; width: number; height: number };

const getRedGifData = async (url: string): Promise<GifData | undefined> => {
  const id = url.split("/").pop();
  if (!id) return undefined;

  const tokenUrl = "https://api.redgifs.com/v2/auth/temporary";
  const gifUrl = `https://api.redgifs.com/v2/gifs/${id}`;

  try {
    let token: string;

    let gif: any;

    if (isTauri()) {
      const tokenRes = await tauriFetch(tokenUrl);
      const tokenData = await tokenRes.json();
      token = tokenData.token;
      const gifRes = await tauriFetch(gifUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      gif = (await gifRes.json()).gif;
    } else if (Capacitor.isNativePlatform()) {
      const tokenRes = await CapacitorHttp.get({ url: tokenUrl });
      token = tokenRes.data.token;
      const gifRes = await CapacitorHttp.get({
        url: gifUrl,
        headers: { Authorization: `Bearer ${token}` },
      });
      gif = gifRes.data.gif;
    } else {
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();
      token = tokenData.token;
      const gifRes = await fetch(gifUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      gif = (await gifRes.json()).gif;
    }

    if (!gif?.urls?.hd) return undefined;
    return { src: gif.urls.hd, width: gif.width, height: gif.height };
  } catch {
    return undefined;
  }
};

export function RedGifEmbed({
  url,
  thumbnail,
  autoPlay = false,
  nsfw,
}: {
  url: string;
  thumbnail?: string | null;
  autoPlay?: boolean;
  nsfw?: boolean;
}) {
  const [data, setData] = useState<GifData>();
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
  );

  useEffect(() => {
    getRedGifData(url).then(setData);
  }, [url]);

  const aspectRatio = data ? `${data.width} / ${data.height}` : undefined;

  return (
    <div className={cn("bg-muted relative", ABOVE_LINK_OVERLAY)}>
      <div
        className="w-full relative md:max-w-sm mx-auto"
        style={{ aspectRatio: aspectRatio ?? "9 / 16" }}
      >
        {(nsfwHidden || !data) && thumbnail && (
          <img
            src={thumbnail}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              blurClassName,
            )}
          />
        )}
        {!nsfwHidden && data && (
          <video
            src={data.src}
            controls
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay={autoPlay}
            playsInline
            poster={thumbnail ?? undefined}
          />
        )}
      </div>

      {nsfwHidden && <ShowNsfwButton onReveal={onReveal} />}
    </div>
  );
}
