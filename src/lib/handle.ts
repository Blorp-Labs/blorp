import z from "zod";

export type Handle = `${string}@${string}`;

export const handleSchema = z
  .string()
  .refine((val) => /^([\w-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/.test(val), {
    message: "Must be a valid federated handle (name@instance.com)",
  }) as z.ZodType<Handle>;

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

export function parseHandle(handle: Handle): { name: string; host: string };
export function parseHandle(handle: undefined | null): {
  name: undefined;
  host: undefined;
};
export function parseHandle(handle: Handle | undefined | null): {
  name: string | undefined;
  host: string | undefined;
};
export function parseHandle(handle: Handle | undefined | null): {
  name: string | undefined;
  host: string | undefined;
} {
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

export function decodeCommunityHandle(
  encodedHandle: string,
): Handle | undefined {
  return handleSchema.safeParse(decodeURIComponent(encodedHandle)).data;
}
