import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useHistory, useLocation } from "react-router-dom";
import type z from "zod";
import { useGetIsActiveRoute, useIsActiveRoute } from "./navigation-hooks";

// ── Types ────────────────────────────────────────────────────────────────────

type AndSet<V> = (fn: SetUrlSearchParam<V>, val: V) => { and: AndSet<V> };

export type SetUrlSearchParam<V> = (
  next: V | ((prev: V) => V),
  config?: { replace?: boolean; search?: string },
) => {
  and: AndSet<V>;
};

type AndRemove = (fn: RemoveUrlSearchParam) => { and: AndRemove };

export type RemoveUrlSearchParam = (opts?: {
  replace?: boolean;
  search?: string;
}) => {
  and: AndRemove;
};

// ── Route search param context ──────────────────────────────────────────────

export const RouteSearchParamContext = createContext<Map<string, unknown>>(
  new Map(),
);

/**
 * Provides an isolated search-param defaults map for each route instance.
 * Wrap each Route's children with this so hooks within the same route
 * share one map while different route instances are isolated.
 */
export function RouteSearchParamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaults = useRef(new Map<string, unknown>()).current;
  return (
    <RouteSearchParamContext value={defaults}>
      {children}
    </RouteSearchParamContext>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UrlSearchState<V> {
  value: V;
  set: SetUrlSearchParam<V>;
  remove: RemoveUrlSearchParam;
}

/**
 * Similar to useState but stores its state in the url.
 * Only works with strings for now.
 *
 * @example
 *   const search = useUrlSearchState("q", "default_search", z.string());
 *   search.value // current value
 *   search.set("new_value") // update
 *   search.remove() // remove from URL
 */
export function useUrlSearchState<S extends z.ZodSchema>(
  key: string,
  defaultValue: z.infer<S>,
  schema: S,
): UrlSearchState<z.infer<S>> {
  const history = useHistory();
  const location = useLocation();
  const search = location.search;
  const frozenLocation = useRef(location);

  const defaults = useContext(RouteSearchParamContext);

  const locked = useRef(false);

  useEffect(() => {
    locked.current = false;
    return () => {
      locked.current = true;
    };
  }, [defaultValue]);

  const isActive = useIsActiveRoute();
  const getIsActiveRoute = useGetIsActiveRoute();

  const pendingTimeouts = useRef(new Set<number>());

  useEffect(() => {
    if (!isActive) {
      for (const id of pendingTimeouts.current) {
        window.clearTimeout(id);
      }
      pendingTimeouts.current.clear();
    }
  }, [isActive]);

  // parse & validate the raw URL param, fallback to default
  const value = useMemo<z.infer<S>>(() => {
    if (!isActive) {
      return undefined;
    }

    const params = new URLSearchParams(location.search);
    const raw = params.get(key);

    if (!schema) {
      return raw;
    }

    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }

    return undefined;
  }, [location.search, key, schema, isActive]);

  // Update stored default when we get a valid value from the URL
  useEffect(() => {
    if (value !== undefined) {
      defaults.set(key, value);
    }
  }, [value, key, defaults]);

  // setter that validates and pushes/replaces the URL
  const setValue = useCallback<SetUrlSearchParam<z.infer<S>>>(
    (next, config) => {
      const replace = config?.replace ?? true;

      const newVal =
        typeof next === "function"
          ? (next as (p: z.infer<S>) => z.infer<S>)(value)
          : next;

      // ensure it's valid
      if (schema) {
        schema.parse(newVal);
      }

      const params = new URLSearchParams(config?.search ?? search);
      params.set(key, newVal);
      const newSearch = params.toString();
      const to = {
        ...frozenLocation.current,
        search: newSearch ? `?${newSearch}` : "",
      };
      const id = window.setTimeout(() => {
        pendingTimeouts.current.delete(id);
        if (!locked.current && getIsActiveRoute()) {
          if (replace) {
            history.replace(to);
          } else {
            history.push(to);
          }
        }
      }, 5);
      pendingTimeouts.current.add(id);
      return {
        and: <V,>(setValue: SetUrlSearchParam<V>, val: V) => {
          window.clearTimeout(id);
          pendingTimeouts.current.delete(id);
          return setValue(val, { ...config, search: newSearch });
        },
      };
    },
    [history, key, schema, value, search, locked, getIsActiveRoute],
  );

  const removeParam = useCallback(
    (config?: {
      replace?: boolean;
      search?: string;
    }): {
      and: AndRemove;
    } => {
      const replace = config?.replace ?? true;
      const params = new URLSearchParams(config?.search ?? search);
      params.delete(key);
      defaults.set(key, defaultValue);
      const newSearch = params.toString();
      const to = {
        ...frozenLocation.current,
        search: newSearch ? `?${newSearch}` : "",
      };
      const id = window.setTimeout(() => {
        pendingTimeouts.current.delete(id);
        if (!locked.current && getIsActiveRoute()) {
          if (replace) {
            history.replace(to);
          } else {
            history.push(to);
          }
        }
      }, 5);
      pendingTimeouts.current.add(id);
      return {
        and: (removeParam) => {
          window.clearTimeout(id);
          pendingTimeouts.current.delete(id);
          return removeParam({ ...config, search: newSearch });
        },
      };
    },
    [history, key, search, defaultValue, defaults, getIsActiveRoute],
  );

  const storedDefault = defaults.get(key) as z.infer<S> | undefined;
  const resolvedDefault = storedDefault ?? defaultValue;
  return {
    value: value ?? resolvedDefault,
    set: setValue,
    remove: removeParam,
  };
}
