import { isYouTubeVideoUrl } from "./youtube";
import { Schemas } from "./api/adapters/api-blueprint";

const VIEMO_REGEX = /https:\/\/vimeo.com\/[0-9]+/i;

const SPOTIFY_REGEX =
  /https:\/\/open\.spotify\.com\/(playlist|track)\/[a-z0-9]+/i;

const PEERTUBE_REGEX =
  /^https?:\/\/[\w.-]+\/videos\/watch\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:[?#].*)?$/i;
const PEERTUBE_REGEX2 = /^https?:\/\/[\w.-]+\/w\/[0-9a-z]+$/i;

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
    | "soundcloud"
    | "vimeo"
    | "generic-video"
    | "peertube" = "text";

  const postUrlPathname = post.url ? new URL(post.url).pathname : null;

  const embedVideoPathname = post.embedVideoUrl
    ? new URL(post.embedVideoUrl).pathname
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
  } else if (post.url?.startsWith("https://loops.video")) {
    embedType = "loops";
  } else if (
    (urlContentType && urlContentType.indexOf("image/") !== -1) ||
    postUrlPathname?.endsWith(".jpeg") ||
    postUrlPathname?.endsWith(".jpg") ||
    postUrlPathname?.endsWith(".png") ||
    postUrlPathname?.endsWith(".webp") ||
    postUrlPathname?.endsWith(".gif")
  ) {
    embedType = "image";
  } else if (
    embedVideoPathname?.endsWith(".mp4") ||
    embedVideoPathname?.endsWith(".m3u8") ||
    embedVideoPathname?.endsWith(".gifv")
  ) {
    embedType = "video";
    embedUrl = post.embedVideoUrl;
  } else if (
    (urlContentType && urlContentType.indexOf("video/") !== -1) ||
    post.url?.endsWith(".mp4") ||
    post.url?.endsWith(".gifv")
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

  return {
    type: embedType,
    thumbnail,
    fullResThumbnail,
    embedUrl,
  };
}
