import _ from "lodash";

export type Slug = {
  name: string;
  host: string;
  slug: string;
};

export function createSlug({
  apId,
  name,
}: {
  apId: string;
  name: string;
}): Slug {
  const url = new URL(apId);
  if (!name) {
    throw new Error("invalid url for slug, apId=" + apId);
  }
  const host = url.host;
  return {
    name,
    host,
    slug: `${name}@${host}`,
  } satisfies Slug;
}

export function encodeApId(id: string) {
  return encodeURIComponent(id);
}

export function decodeApId(encodedUrl: string) {
  return decodeURIComponent(encodedUrl);
}

export const lemmyTimestamp = () => new Date().toISOString();

export function extractErrorContent(err: Error) {
  const content = err.message || err.name;
  return content ? _.capitalize(content.replaceAll("_", " ")) : "Unknown error";
}
