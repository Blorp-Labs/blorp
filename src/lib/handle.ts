export type Handle = `${string}@${string}`;

export function createHandle({
  apId,
  name,
}: {
  apId: string;
  name: string;
}): Handle {
  const url = new URL(apId);
  if (!name) {
    throw new Error("invalid url for handle, apId=" + apId);
  }
  return `${name}@${url.host}`;
}

export function parseHandle(handle?: string) {
  const parsed = handle?.split("@");
  return {
    name: parsed?.[0],
    host: parsed?.[1],
  };
}

export function apIdFromCommunityHandle(handle: string): string | undefined {
  const parts = handle.split("@");
  if (parts.length !== 2) {
    return undefined;
  }
  const [name, host] = parts;
  if (!name || !host) {
    return undefined;
  }
  return `https://${host}/c/${name}`;
}
