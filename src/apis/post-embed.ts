import { isYouTubeVideoUrl } from "../lib/youtube";
import { Schemas } from "./api-blueprint";
import { urlStripAfterPath } from "../lib/utils";
import _ from "lodash";

const VIMEO_REGEX =
  /https:\/\/vimeo\.com\/(?:channels\/[^/]+\/)?[0-9]+(?:\/[a-zA-Z0-9]+)?/i;

const SPOTIFY_REGEX =
  /https:\/\/open\.spotify\.com\/(playlist|track|album|episode)\/[a-z0-9]+/i;

const PEERTUBE_REGEX =
  /^https?:\/\/[\w.-]+\/videos\/watch\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:[?#].*)?$/i;
const PEERTUBE_REGEX2 = /^https?:\/\/[\w.-]+\/w\/[0-9a-z]+(?:[?#].*)?$/i;

export type EmbedType =
  | "image"
  | "video"
  | "article"
  | "youtube"
  | "loops"
  | "text"
  | "spotify"
  | "bandcamp"
  | "soundcloud"
  | "vimeo"
  | "generic-video"
  | "peertube"
  | "redgif";

export function getEmbedFromUrl(
  url: string,
  options?: { ignore?: EmbedType[] },
): { type: EmbedType; embedUrl: string } | null {
  const stripped = urlStripAfterPath(url);
  const ignored = options?.ignore ?? [];

  function match(
    type: EmbedType,
  ): { type: EmbedType; embedUrl: string } | null {
    if (ignored.includes(type)) {
      return null;
    }
    return { type, embedUrl: url };
  }

  if (url.startsWith("https://vimeo.com") && VIMEO_REGEX.test(url)) {
    return match("vimeo");
  }

  if (
    url.startsWith("https://soundcloud.com/") ||
    url.startsWith("https://on.soundcloud.com/")
  ) {
    return match("soundcloud");
  }

  if (url.startsWith("https://open.spotify.com/") && SPOTIFY_REGEX.test(url)) {
    return match("spotify");
  }

  if (url.startsWith("https://bandcamp.com/EmbeddedPlayer")) {
    return match("bandcamp");
  }

  if (url.startsWith("https://loops.video")) {
    return match("loops");
  }

  if (
    url.startsWith("https://www.redgifs.com/watch/") ||
    url.startsWith("https://redgifs.com/watch/")
  ) {
    return match("redgif");
  }

  if (isYouTubeVideoUrl(url)) {
    return match("youtube");
  }

  if (
    (url.includes("/videos/watch/") || url.includes("/w/")) &&
    (PEERTUBE_REGEX.test(url) || PEERTUBE_REGEX2.test(url))
  ) {
    return match("peertube");
  }

  if (
    stripped.endsWith(".jpeg") ||
    stripped.endsWith(".jpg") ||
    stripped.endsWith(".png") ||
    stripped.endsWith(".webp") ||
    stripped.endsWith(".gif")
  ) {
    return match("image");
  }

  if (
    stripped.endsWith(".mp4") ||
    stripped.endsWith(".m3u8") ||
    stripped.endsWith(".gifv")
  ) {
    return match("video");
  }

  return null;
}

function normalizeImgur(url: string) {
  if (url.endsWith(".gifv")) {
    return url.replace(/gifv$/, "mp4");
  }
  return url;
}

function normalizeVideoUrl<T>(url: string | T) {
  if (!_.isString(url)) {
    return url;
  }
  if (url.includes("://i.imgur.com/")) {
    return normalizeImgur(url);
  }
  return url;
}

export function getPostEmbed(post: Schemas.Post) {
  const urlContentType = post.urlContentType;
  let embedUrl = post.url;
  let embedType: EmbedType = "text";

  const fromEmbedVideo = post.embedVideoUrl
    ? getEmbedFromUrl(post.embedVideoUrl)
    : null;

  const fromUrl = post.url
    ? getEmbedFromUrl(post.url, { ignore: ["peertube"] })
    : null;

  if (fromEmbedVideo) {
    embedType = fromEmbedVideo.type;
    embedUrl = fromEmbedVideo.embedUrl;
  } else if (fromUrl) {
    embedType = fromUrl.type;
    embedUrl = fromUrl.embedUrl;
  } else if (urlContentType && urlContentType.indexOf("image/") !== -1) {
    embedType = "image";
  } else if (urlContentType && urlContentType.indexOf("video/") !== -1) {
    embedType = "video";
  } else if (post.embedVideoUrl) {
    embedType = "generic-video";
    embedUrl = post.embedVideoUrl;
  } else if (post.url) {
    embedType = "article";
  }

  const thumbnail = post.thumbnailUrl;
  let fullResThumbnail: string | null = null;

  if (post.url && embedType === "image" && post.url !== thumbnail) {
    fullResThumbnail = post.url;
  }

  embedUrl = normalizeVideoUrl(embedUrl);

  return {
    type: embedType,
    thumbnail,
    fullResThumbnail,
    embedUrl,
  };
}
