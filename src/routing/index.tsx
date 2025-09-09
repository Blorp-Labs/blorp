import { compile } from "path-to-regexp";
import {
  Link as RRLink,
  Route as RRRoute,
  useParams as useParamsDefault,
  useHistory as useHistoryDefault,
  Redirect as RRRedirect,
  RedirectProps as RRRedirectProps,
} from "react-router-dom";
import { RouteDefs, routeDefs, RoutePath } from "./routes";
import z from "zod";
import { isDev } from "../lib/device";
export { resolveRoute } from "./resolve-route";

// lookup schema by path
type DefByPath = {
  [K in keyof RouteDefs as (typeof routeDefs)[K]["path"]]: (typeof routeDefs)[K]["schema"];
};

// infer the params for each path
export type ParamsFor<Path extends RoutePath> = z.infer<DefByPath[Path]>;

type HasParams<P extends RoutePath> = ParamsFor<P> extends never ? false : true;

export function useHistory() {
  const history = useHistoryDefault();
  return {
    ...history,
    push: <P extends RoutePath>(
      to: P,
      ...args: HasParams<P> extends true
        ? // if the route has params, args = [params, search?]
          [params: ParamsFor<P>, searchParams?: `?${string}`]
        : // otherwise args = [search?]
          [searchParams?: `?${string}`]
    ) => {
      let url: string;
      if (args.length === 0 || typeof args[0] === "string") {
        // no params route
        const [search] = args as [string?];
        url = to + (search ?? "");
      } else {
        // route with params
        const [params, search] = args as [Record<string, any>, string?];
        url = compile(to, { encode: false })(params) + (search ?? "");
      }
      history.push(url);
    },
  };
}

interface RedirectProps extends Omit<RRRedirectProps, "to"> {
  to: RoutePath;
}

export function Redirect(props: RedirectProps) {
  return <RRRedirect {...props} />;
}

interface LinkWithoutParams<P extends RoutePath>
  extends Omit<React.ComponentProps<typeof RRLink>, "to"> {
  to: P;
  searchParams?: `?${string}`;
  params?: never;
}

interface LinkWithParams<P extends RoutePath>
  extends Omit<React.ComponentProps<typeof RRLink>, "to"> {
  to: P;
  searchParams?: `?${string}`;
  params: ParamsFor<P>;
}

export type LinkProps<P extends RoutePath> =
  HasParams<P> extends true ? LinkWithParams<P> : LinkWithoutParams<P>;

export function Link<Path extends RoutePath>({
  searchParams,
  to,
  params,
  ...rest
}: LinkProps<Path>) {
  try {
    const toString = compile(to, { encode: false })(params);
    return <RRLink to={toString + (searchParams ?? "")} {...rest} />;
  } catch (err) {
    if (isDev()) {
      throw err;
    } else {
      console.error(err);
    }
  }
  return null;
}

interface TypedRouteProps<Path extends RoutePath>
  extends Omit<React.ComponentProps<typeof RRRoute>, "path"> {
  path: Path;
}

export function Route<Path extends RoutePath>({
  path,
  ...rest
}: TypedRouteProps<Path>) {
  return <RRRoute path={path} {...rest} />;
}

export function useParams<P extends RoutePath>(path: P): z.infer<DefByPath[P]> {
  const def = routeDefs[path];
  if ("schema" in def) {
    const schema = def.schema;
    const raw = useParamsDefault();
    return schema.parse(raw);
  }
  return {} as any;
}
