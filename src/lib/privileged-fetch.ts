import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isCapacitor, isTauri } from "./device";
import { CapacitorHttp, HttpHeaders } from "@capacitor/core";

/**
 * Convert a Fetch-style HeadersInit into HttpHeaders.
 */
export function toHttpHeaders(init?: HeadersInit): HttpHeaders {
  const headers: HttpHeaders = {};
  if (!init) {
    return headers;
  }
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(init)) {
    for (const [key, value] of init) {
      headers[key] = value;
    }
  } else {
    Object.assign(headers, init);
  }
  return headers;
}

type CustomFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{
  blob: () => Promise<Blob>;
  json: () => Promise<unknown>;
  ok: boolean;
}>;

/**
 * A bare-minimum privileged fetch for images (iOS & Android only).
 * Signature matches `typeof fetch`.
 */
export const capacitorFetch: CustomFetch = async (...args) => {
  // Normalize inputs into a Request
  const [input, init] = args as [RequestInfo, RequestInit?];
  const request = new Request(input, init);
  const headers = init?.headers;

  // Native HTTP plugin call (blob as Base64)
  const pluginRes = await CapacitorHttp.request({
    url: request.url,
    method: request.method,
    responseType: "blob",
    headers: headers ? toHttpHeaders(headers) : undefined,
  });

  // Decode Base64 to binary
  const base64 = pluginRes.data as string;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Create Blob
  const contentType = pluginRes.headers["content-type"] || "";
  const blob = new Blob([bytes], { type: contentType });

  // Wrap in a Fetch-like Response (cast as any to satisfy signature)
  const res = new Response(blob, {
    status: pluginRes.status,
    headers: pluginRes.headers as Record<string, string>,
  });

  return res;
};

export const privilegedFetch: CustomFetch = async (...args) => {
  if (isCapacitor()) {
    return capacitorFetch(...args);
  }
  if (isTauri()) {
    return tauriFetch(...args);
  }
  return fetch(...args);
};
