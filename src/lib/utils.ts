import _ from "lodash";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function exhaustiveList<TUnion>() {
  return <const T extends readonly TUnion[]>(
    list: [Exclude<TUnion, T[number]>] extends [never]
      ? T
      : `Missing values: ${Exclude<TUnion, T[number]> & string}`,
  ): T => list as T;
}

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

export function formatOrdinal(n: number) {
  const abs = Math.abs(n); // handle negatives if you want
  const rem100 = abs % 100;
  const rem10 = abs % 10;
  let suffix = "th";

  if (rem100 < 11 || rem100 > 13) {
    if (rem10 === 1) {
      suffix = "st";
    } else if (rem10 === 2) {
      suffix = "nd";
    } else if (rem10 === 3) {
      suffix = "rd";
    }
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

const jwtPayloadSchema = z.object({ exp: z.number() });

export function unsafeParseJwt(token: string): { exp?: number } {
  try {
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!base64) {
      return {};
    }
    const parsed = jwtPayloadSchema.safeParse(JSON.parse(atob(base64)));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export const assert = import.meta.env.DEV
  ? (condition: boolean, msg?: string) => {
      if (!condition) {
        throw new Error(msg ?? "Assertion failed");
      }
    }
  : () => {};

export function getFirstZodIssue(error: Error | null | undefined) {
  return error instanceof z.ZodError ? error.issues[0] : undefined;
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
