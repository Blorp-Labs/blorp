import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";
import { privilegedFetch } from "@/src/lib/privileged-fetch";
import _ from "lodash";

type GifData = { src: string; width: number; height: number };

const fetchJson = async (url: string, init?: RequestInit) => {
  const res = await privilegedFetch(url, init);
  return JSON.parse(await (await res.blob()).text());
};

const getRedGifData = async (url: string): Promise<GifData | undefined> => {
  const id = url.split("/").pop();
  if (!id) return undefined;

  const tokenUrl = "https://api.redgifs.com/v2/auth/temporary";
  const gifUrl = `https://api.redgifs.com/v2/gifs/${id}`;

  try {
    const { token } = await fetchJson(tokenUrl);
    const { gif } = await fetchJson(gifUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
  apId,
  detailView,
}: {
  url: string;
  thumbnail?: string | null;
  autoPlay?: boolean;
  nsfw?: boolean;
  apId?: string;
  detailView?: boolean;
}) {
  const [data, setData] = useState<GifData>();
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
    { apId, detailView },
  );

  useEffect(() => {
    getRedGifData(url).then(setData);
  }, [url]);

  const aspectRatio = data ? data.width / data.height : undefined;
  const isVertical = _.isNumber(aspectRatio) && aspectRatio < 1;

  return (
    <div className={cn("bg-muted relative", ABOVE_LINK_OVERLAY)}>
      <div
        className={cn("w-full relative", isVertical && "md:max-w-sm mx-auto")}
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
