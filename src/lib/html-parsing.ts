export const extractLoopsVideoSrc = (html: string) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const videoPlayer = doc.querySelector("video-player");
    return videoPlayer?.getAttribute("video-src") || undefined;
  } catch {
    return undefined;
  }
};

export const parseOgData = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent || "";

  // Try to find the og:image meta tag
  const ogImage = doc
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");

  // Fallback to twitter:image if og:image is not found
  const twitterImage = doc
    .querySelector('meta[name="twitter:image"]')
    ?.getAttribute("content");

  const imageUrl = ogImage ?? twitterImage;

  return {
    title,
    imageUrl,
  };
};
