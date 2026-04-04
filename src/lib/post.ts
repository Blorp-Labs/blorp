import { isYouTubeVideoUrl } from "./youtube";
import { Schemas } from "../api-blueprint";
import { urlStripAfterPath } from "./utils";
import _ from "lodash";

const VIEMO_REGEX = /https:\/\/vimeo.com\/[0-9]+/i;

const SPOTIFY_REGEX =
  /https:\/\/open\.spotify\.com\/(playlist|track)\/[a-z0-9]+/i;

const PEERTUBE_REGEX =
  /^https?:\/\/[\w.-]+\/videos\/watch\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:[?#].*)?$/i;
const PEERTUBE_REGEX2 = /^https?:\/\/[\w.-]+\/w\/[0-9a-z]+$/i;

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

  let embedType:
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
    | "redgif" = "text";

  const strippedPostUrl = post.url ? urlStripAfterPath(post.url) : null;

  const strippedPostVideoUrl = post.embedVideoUrl
    ? urlStripAfterPath(post.embedVideoUrl)
    : null;

  if (post.url?.startsWith("https://vimeo.com") && VIEMO_REGEX.test(post.url)) {
    embedType = "vimeo";
  } else if (post.url?.startsWith("https://soundcloud.com/")) {
    embedType = "soundcloud";
  } else if (
    post.url?.startsWith("https://open.spotify.com/") &&
    SPOTIFY_REGEX.test(post.url)
  ) {
    embedType = "spotify";
  } else if (
    post.embedVideoUrl?.startsWith("https://bandcamp.com/EmbeddedPlayer")
  ) {
    embedType = "bandcamp";
    embedUrl = post.embedVideoUrl;
  } else if (post.url?.startsWith("https://loops.video")) {
    embedType = "loops";
  } else if (
    post.url?.startsWith("https://www.redgifs.com/watch/") ||
    post.url?.startsWith("https://redgifs.com/watch/")
  ) {
    embedType = "redgif";
  } else if (
    post.embedVideoUrl?.startsWith("https://www.redgifs.com/watch/") ||
    post.embedVideoUrl?.startsWith("https://redgifs.com/watch/")
  ) {
    embedType = "redgif";
    embedUrl = post.embedVideoUrl;
  } else if (
    (urlContentType && urlContentType.indexOf("image/") !== -1) ||
    strippedPostUrl?.endsWith(".jpeg") ||
    strippedPostUrl?.endsWith(".jpg") ||
    strippedPostUrl?.endsWith(".png") ||
    strippedPostUrl?.endsWith(".webp") ||
    strippedPostUrl?.endsWith(".gif")
  ) {
    embedType = "image";
  } else if (
    strippedPostVideoUrl?.endsWith(".mp4") ||
    strippedPostVideoUrl?.endsWith(".m3u8") ||
    strippedPostVideoUrl?.endsWith(".gifv")
  ) {
    embedType = "video";
    embedUrl = post.embedVideoUrl;
  } else if (
    (urlContentType && urlContentType.indexOf("video/") !== -1) ||
    strippedPostUrl?.endsWith(".mp4") ||
    strippedPostUrl?.endsWith(".gifv")
  ) {
    embedType = "video";
  } else if (post.url && isYouTubeVideoUrl(post.url)) {
    embedType = "youtube";
  } else if (
    post.url &&
    (post.url.includes("/videos/watch/") || post.url.includes("/w/")) &&
    (PEERTUBE_REGEX.test(post.url) || PEERTUBE_REGEX2.test(post.url))
  ) {
    embedType = "peertube";
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
