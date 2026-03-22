import { useEffect, useState } from "react";
import { z } from "zod";
import { assert, cn } from "@/src/lib/utils";
import { ABOVE_LINK_OVERLAY } from "../config";
import { ShowNsfwButton, useBlurNsfwState } from "../nsfw-blur-toggle";
import { privilegedFetch } from "@/src/lib/privileged-fetch";
import _ from "lodash";

type GifData = { src: string; width: number; height: number };

const fetchJson = async (url: string, init?: RequestInit) => {
  const res = await privilegedFetch(url, init);
  return JSON.parse(await (await res.blob()).text());
};

let cachedToken: { value: string; expiresAt: number } | null = null;

const jwtPayloadSchema = z.object({ exp: z.number() });

const getToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const { token } = await fetchJson(
    "https://api.redgifs.com/v2/auth/temporary",
  );
  const parsed = jwtPayloadSchema.safeParse(
    JSON.parse(atob(token.split(".")[1])),
  );
  assert(parsed.success);
  if (parsed.success) {
    cachedToken = { value: token, expiresAt: parsed.data.exp * 1000 };
  }
  return token;
};

const getRedGifData = async (url: string): Promise<GifData | undefined> => {
  try {
    const id = new URL(url).pathname.split("/").pop();
    if (!id) return undefined;

    const gifUrl = `https://api.redgifs.com/v2/gifs/${id}`;
    const token = await getToken();
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
  const [failed, setFailed] = useState(false);
  const { nsfwHidden, blurClassName, onReveal } = useBlurNsfwState(
    nsfw ?? false,
    { apId, detailView },
  );

  useEffect(() => {
    if (!nsfwHidden) {
      getRedGifData(url).then((result) => {
        if (result) {
          setData(result);
        } else {
          setFailed(true);
        }
      });
    }
  }, [url, nsfwHidden]);

  const aspectRatio = data ? data.width / data.height : 9 / 16;
  const isVertical = _.isNumber(aspectRatio) && aspectRatio < 1;

  return (
    <div className={cn("bg-muted relative", ABOVE_LINK_OVERLAY)}>
      <div
        className={cn("w-full relative", isVertical && "md:max-w-sm mx-auto")}
        style={{ aspectRatio: aspectRatio }}
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
        {failed && !data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Failed to load video
            </p>
          </div>
        )}
      </div>

      {nsfwHidden && <ShowNsfwButton onReveal={onReveal} />}
    </div>
  );
}
