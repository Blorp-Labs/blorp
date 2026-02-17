import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InAppBrowser } from "@capacitor/inappbrowser";
import { useHistory, useLocation } from "react-router-dom";
import type z from "zod";
import { AlertInput, useIonAlert } from "@ionic/react";
import { Deferred } from "../deferred";
import { usePathname } from "@/src/routing/hooks";
import { useMedia } from "./use-media";
import _ from "lodash";
import { RoutePath } from "@/src/routing/routes";

export { useMedia } from "./use-media";
export { useTheme } from "./use-theme";

export function useElementHasFocus<T extends HTMLElement | null>(
  ref: RefObject<T>,
): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      entry && setIsVisible(entry.isIntersecting);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
}

export function useIsInAppBrowserOpen() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const p1 = InAppBrowser.addListener("browserPageLoaded", () => {
      setIsOpen(true);
    });
    const p2 = InAppBrowser.addListener("browserClosed", () => {
      setIsOpen(false);
    });
    return () => {
      p1.then(({ remove }) => remove());
      p2.then(({ remove }) => remove());
    };
  }, []);
  return isOpen;
}

type AndSet<V> = (fn: SetUrlSearchParam<V>, val: V) => { and: AndSet<V> };

type SetUrlSearchParam<V> = (
  next: V | ((prev: V) => V),
  config?: { replace?: boolean; search?: string },
) => {
  and: AndSet<V>;
};

type AndRemove = (fn: RemoveUrlSearchParam) => { and: AndRemove };

type RemoveUrlSearchParam = (opts?: { replace?: boolean; search?: string }) => {
  and: AndRemove;
};

/**
 * Similar to useState but stores it's state in the url.
 * Only works with strings for now.
 *
 * @example
 *   const [search, setSearch] = useUrlSearchState("q", "default_search", z.string());
 */
export function useUrlSearchState<S extends z.ZodSchema>(
  key: string,
  defaultValue: z.infer<S>,
  schema: S,
): [z.infer<S>, SetUrlSearchParam<z.infer<S>>, RemoveUrlSearchParam] {
  const history = useHistory();
  const location = useLocation();
  const search = location.search;
  const frozenLocation = useRef(location);

  const locked = useRef(false);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    locked.current = false;
    return () => {
      locked.current = true;
    };
  }, [defaultValue]);

  const isActive = useIsActiveRoute();

  // parse & validate the raw URL param, fallback to default
  const value = useMemo<z.infer<S>>(() => {
    if (!isActive) {
      return undefined;
    }

    const params = new URLSearchParams(location.search);
    const raw = params.get(key);
    if (raw === null) {
      defaultValueRef.current = defaultValue;
      return undefined;
    }

    if (!schema) {
      defaultValueRef.current = raw;
      return raw;
    }

    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      defaultValueRef.current = parsed.data;
      return parsed.data;
    }

    return undefined;
  }, [location.search, key, schema, isActive, defaultValue]);

  // setter that validates and pushes/replaces the URL
  const setValue = useCallback<SetUrlSearchParam<z.infer<S>>>(
    (next, config) => {
      const replace = config?.replace ?? true;

      const newVal =
        typeof next === "function"
          ? (next as (p: z.infer<S>) => z.infer<S>)(value)
          : next;

      // ensure it’s valid
      if (schema) {
        schema.parse(newVal);
      }

      const params = new URLSearchParams(config?.search ?? search);
      params.set(key, newVal);
      const newSearch = params.toString();
      const to = {
        // Idk why but location is getting out of sync with
        // browser location. So we just freeze the intial value
        // and that seems to work.
        ...frozenLocation.current,
        search: newSearch ? `?${newSearch}` : "",
      };
      const id = window.setTimeout(() => {
        if (!locked.current) {
          replace ? history.replace(to) : history.push(to);
        }
      }, 5);
      return {
        and: <V>(setValue: SetUrlSearchParam<V>, val: V) => {
          window.clearTimeout(id);
          return setValue(val, { ...config, search: newSearch });
        },
      };
    },
    [history, key, schema, value, search, locked],
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
      const newSearch = params.toString();
      const to = {
        // Idk why but location is getting out of sync with
        // browser location. So we just freeze the intial value
        // and that seems to work.
        ...frozenLocation.current,
        search: newSearch ? `?${newSearch}` : "",
      };
      const id = setTimeout(() => {
        replace ? history.replace(to) : history.push(to);
      }, 5);
      return {
        and: (removeParam) => {
          clearTimeout(id);
          return removeParam({ ...config, search: newSearch });
        },
      };
    },
    [history, key, search],
  );

  return [value ?? defaultValueRef.current, setValue, removeParam];
}

export function useSelectAlert() {
  const [alrt] = useIonAlert();
  return async <T extends string>({
    header,
    message,
    options,
    cancelText = "Cancel",
  }: {
    header?: string;
    message?: string;
    options: { text: string; value: T }[];
    cancelText?: string;
  }): Promise<T> => {
    const deferred = new Deferred<T>();
    alrt({
      header,
      message,
      buttons: [
        { text: cancelText, role: "cancel" },
        ...options.map((opt) => ({
          text: opt.text,
          handler: () => deferred.resolve(opt.value),
        })),
      ],
      onDidDismiss: (e) => {
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        }
      },
    });
    return deferred.promise;
  };
}

export function useConfirmationAlert() {
  const [alrt] = useIonAlert();

  return async <Z extends z.AnyZodObject>({
    header,
    message,
    cancelText = "Cancel",
    confirmText = "OK",
    danger,
    // Ionic with crash if you pass undefined
    // instead of an empty array
    inputs = [],
    schema,
  }: {
    header?: string;
    message: string;
    cancelText?: string;
    confirmText?: string;
    danger?: boolean;
    inputs?: AlertInput[];
    schema?: Z;
  }) => {
    const deferred = new Deferred<z.infer<Z>>();
    alrt({
      header,
      message,
      inputs,
      buttons: [
        {
          text: cancelText,
          role: "cancel",
        },
        {
          text: confirmText,
          role: danger ? "destructive" : "confirm",
        },
      ],
      onDidDismiss: (e) => {
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        } else {
          try {
            const data = schema?.parse(e.detail.data.values);
            deferred.resolve(data);
          } catch (err) {
            console.error(err);
            deferred.reject();
          }
        }
      },
    });
    return await deferred.promise;
  };
}

/**
 * To be used to extract the page element from an
 * IonPage and passed to an IonModal.
 *
 * See https://ionicframework.com/docs/api/modal#setting-a-boolean-value
 */
export function useIonPageElement() {
  const ref = useRef<HTMLElement>(undefined);
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      setElement(ref.current);
    }
  }, []);
  return {
    ref,
    element: element ?? undefined,
  };
}

function normalizePath(p: string) {
  return p.replace(/\/$/, "");
}

export function useIsActiveRoute(route?: RoutePath) {
  const pathname = usePathname();
  const snapshot = useRef(pathname);
  if (route) {
    return normalizePath(route) === normalizePath(pathname);
  }
  return normalizePath(snapshot.current) === normalizePath(pathname);
}

export function useHideTabBarOnMount() {
  const isActive = useIsActiveRoute();
  useEffect(() => {
    if (isActive) {
      const tabBar = () => document.querySelector("ion-tab-bar");
      // add a CSS class to the root element
      tabBar()?.classList.add("hidden");
      return () => {
        // clean up when this component unmounts
        tabBar()?.classList.remove("hidden");
      };
    }
  }, [isActive]);
}

export function useSafeAreaInsets() {
  const computeInsets = () => {
    const style = getComputedStyle(document.documentElement);

    const top = parseInt(
      style.getPropertyValue("--ion-safe-area-top").trim(),
      10,
    );
    const bottom = parseInt(
      style.getPropertyValue("--ion-safe-area-bottom").trim(),
      10,
    );

    return { top, bottom };
  };

  const [insets, setInsets] = useState(() => computeInsets());

  useEffect(() => {
    const update = () => setInsets(computeInsets());

    // Listen for orientation + resize events
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return insets;
}

export function useNavbarHeight() {
  const media = useMedia();
  const height = media.md ? 60 : 55;
  const { top } = useSafeAreaInsets();
  return {
    height,
    inset: top,
  };
}

export function useTabbarHeight() {
  const { bottom } = useSafeAreaInsets();
  return {
    height: 50.5,
    inset: bottom,
  };
}

export function useKeyboardShortcut(handler: (e: KeyboardEvent) => void) {
  const media = useMedia();
  const isActive = useIsActiveRoute();
  useEffect(() => {
    if (isActive && media.md) {
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [handler, isActive, media.md]);
}

export function useDebouncedState<T>(initValue: T, debounceTime: number) {
  const [value, _setValue] = useState(initValue);

  const setValue = useMemo(
    () =>
      _.debounce((newValue: T) => {
        _setValue(newValue);
      }, debounceTime),
    [debounceTime],
  );

  const setValueImediate = useCallback(
    (value: T) => {
      setValue.cancel();
      _setValue(value);
    },
    [setValue],
  );

  return { value, setValue, setValueImediate, cancelSet: setValue.cancel };
}

type Rect = {
  width: number;
  height: number;
  top: number;
  left: number;
};

export function useElementRect<T extends HTMLElement | null>(
  ref: React.RefObject<T>,
) {
  const [rect, setRect] = useState<Rect>({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  });

  useLayoutEffect(() => {
    if (!ref.current) return;

    const updateRect = () => {
      if (ref.current) {
        const { width, height, top, left } =
          ref.current.getBoundingClientRect();
        setRect({ width, height, top, left });
      }
    };

    // Observe resize
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(ref.current);

    // Update on scroll
    window.addEventListener("scroll", updateRect, true);

    // Initial measurement
    updateRect();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [ref]);

  return rect;
}
