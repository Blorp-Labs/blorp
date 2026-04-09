const REGEX =
  /(?:https?:\/\/)?(?:www\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/live\/|\/shorts\/|\/)([A-Za-z0-9_-]+)/;
export function parseYouTubeVideoId(url: string) {
  const match = url.match(REGEX);
  return match && match[1]?.length === 11 ? match[1] : false;
}

export function isYouTubeVideoUrl(url: string) {
  return url.indexOf("youtu") > -1 && Boolean(parseYouTubeVideoId(url));
}
