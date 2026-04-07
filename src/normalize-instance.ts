export function normalizeInstance(instance: string) {
  const parts = instance.split(".");

  if (parts.length < 2 || !parts[1]?.length) {
    throw new Error(`Invalid URL: "${instance}"`);
  }

  // Trim whitespace
  let url = instance.trim();

  // Prepend http:// if no protocol is found
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  // Use the URL API for parsing and formatting
  try {
    const urlObj = new URL(url);
    // toString() will include protocol, host, pathname, search, and hash
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    throw new Error(`Invalid URL: "${instance}"`);
  }
}
