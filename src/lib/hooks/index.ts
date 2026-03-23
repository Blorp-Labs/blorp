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
import type z from "zod";
import { AlertInput, useIonAlert } from "@ionic/react";
import { Deferred } from "../deferred";
import { useMedia } from "./use-media";
import _ from "lodash";
import { useIsActiveRoute } from "./navigation-hooks";

export { useMedia } from "./use-media";
export { useTheme } from "./use-theme";
export { useUrlSearchState } from "./use-url-search-state";
export type {
  UrlSearchState,
  SetUrlSearchParam,
  RemoveUrlSearchParam,
} from "./use-url-search-state";

export * from "./navigation-hooks";

export function useElementHasFocus<T extends HTMLElement | null>(
  ref: RefObject<T>,
): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setIsVisible(entry.isIntersecting);
      }
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

function attachAlertEnterHandler(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const alert = document.querySelector("ion-alert");
    if (!alert?.shadowRoot) return;
    const confirmButton =
      alert.shadowRoot.querySelector<HTMLElement>(
        ".alert-button-role-confirm",
      ) ??
      Array.from(
        alert.shadowRoot.querySelectorAll<HTMLElement>(".alert-button"),
      )
        .reverse()
        .find((btn) => !btn.classList.contains("alert-button-role-cancel"));
    if (confirmButton) {
      e.preventDefault();
      confirmButton.click();
    }
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
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
    const removeEnterHandler = attachAlertEnterHandler();
    alrt({
      header,
      message,
      buttons: [
        ...options.map((opt) => ({
          text: opt.text,
          handler: () => deferred.resolve(opt.value),
        })),
        { text: cancelText, role: "cancel" },
      ],
      onDidDismiss: (e) => {
        removeEnterHandler();
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
    const removeEnterHandler = attachAlertEnterHandler();
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
        removeEnterHandler();
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

export function useInputAlert() {
  const [alrt] = useIonAlert();

  return async ({
    header,
    message,
    placeholder,
  }: {
    header?: string;
    message?: string;
    placeholder?: string;
  }) => {
    const deferred = new Deferred<string>();
    const removeEnterHandler = attachAlertEnterHandler();
    alrt({
      header,
      message,
      inputs: [{ placeholder, name: "value" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "OK", role: "confirm" },
      ],
      onDidDismiss: (e) => {
        removeEnterHandler();
        if (e.detail.role === "cancel" || e.detail.role === "backdrop") {
          deferred.reject();
        } else {
          const val = e.detail.data?.values?.value ?? "";
          if (val) {
            deferred.resolve(val);
          } else {
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
