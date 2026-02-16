import _ from "lodash";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function isNotNull<T extends Record<any, any>>(obj: T | null): obj is T {
  return !_.isNull(obj);
}

export function isNotNil<T extends Record<any, any> | string | number>(
  obj: T | null | undefined,
): obj is T {
  return !_.isNil(obj);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function formatOrdinal(n: number) {
  const abs = Math.abs(n); // handle negatives if you want
  const rem100 = abs % 100;
  const rem10 = abs % 10;
  let suffix = "th";

  if (rem100 < 11 || rem100 > 13) {
    if (rem10 === 1) suffix = "st";
    else if (rem10 === 2) suffix = "nd";
    else if (rem10 === 3) suffix = "rd";
  }

  return `${n}${suffix}`;
}

export interface ErrorLike {
  name: string;
  message: string;
}

export function isErrorLike(value: unknown): value is ErrorLike {
  // real Error (and subclasses) get caught here:
  if (_.isError(value)) {
    return true;
  }

  // then check for object‑shape { name: string; message: string }
  return (
    _.isObjectLike(value) &&
    _.has(value, "name") &&
    _.has(value, "message") &&
    _.isString(_.get(value, "name")) &&
    _.isString(_.get(value, "message"))
  );
}

/**
 * A fast function for removing the query string and
 * hash from a url. This ensures the pathname is the
 * last thing in the url.
 */
export function urlStripAfterPath(url: string) {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const cut =
    q === -1 ? (h === -1 ? url.length : h) : h === -1 ? q : Math.min(q, h);
  return url.slice(0, cut);
}

export function ensureValue<T>(
  options: T[] | readonly T[] | null | undefined,
  value: T,
) {
  if (options?.includes(value)) {
    return value;
  }
  if (options && options[0]) {
    return options[0];
  }
  return value;
}
