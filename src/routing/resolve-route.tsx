import { compile } from "path-to-regexp";
import { RoutePath } from "./routes";
import { ParamsFor } from ".";

//
// 1️⃣ Overloads
//
/**
 * resolveRoute a route with params:
 *   resolveRoute("/c/:community/posts/:post", { community: "foo", post: "123" }, "?q=1")
 */
export function resolveRoute<P extends RoutePath>(
  to: P,
  params: ParamsFor<P>,
  searchParams?: `?${string}`,
): string;

/**
 * resolveRoute a route with no params:
 *   resolveRoute("/home", "?foo=bar")
 */
export function resolveRoute<P extends RoutePath>(
  to: P,
  searchParams?: `?${string}`,
): string;

//
// 2️⃣ Implementation (non-generic)
//
export function resolveRoute(to: RoutePath, a?: any, b?: any): string {
  let pathStr: string;
  let searchStr: string = "";

  if (a != null && typeof a === "object") {
    // `a` is params
    pathStr = compile(to, { encode: false })(a);
    searchStr = b ?? "";
  } else {
    // no params
    pathStr = to;
    searchStr = a ?? "";
  }

  return pathStr + searchStr;
}
