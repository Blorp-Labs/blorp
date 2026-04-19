import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import _ from "lodash";
import { normalizeInstance } from "./normalize-instance";

const FALLBACK_INSTANCE = "https://lemmy.zip";

function getDockerInjectedEnv<K extends string>(key: K) {
  const value = _.get(window, key);
  return _.isString(value) ? value : null;
}

/**
 * deploy.blorpblorp.xyz is a special tool that
 * let's you generate deployment configs. This
 * let's you preview the injected config, but
 * we want to be careful that this can't get abused.
 */
const runtimeInjectedEnv = (() => {
  const search = new URLSearchParams(location.search);
  const REACT_APP_NAME = search.get("REACT_APP_NAME");
  const REACT_APP_DEFAULT_INSTANCE = search.get("REACT_APP_DEFAULT_INSTANCE");
  const REACT_APP_LOCK_TO_DEFAULT_INSTANCE = search.get(
    "REACT_APP_LOCK_TO_DEFAULT_INSTANCE",
  );
  const REACT_APP_INSTANCE_SELECTION_MODE = search.get(
    "REACT_APP_INSTANCE_SELECTION_MODE",
  );
  if (
    location.origin.includes("https://blorpblorp.xyz") &&
    (REACT_APP_NAME ||
      REACT_APP_DEFAULT_INSTANCE ||
      REACT_APP_LOCK_TO_DEFAULT_INSTANCE ||
      REACT_APP_INSTANCE_SELECTION_MODE)
  ) {
    const confirmed = confirm(
      [
        "Preview the following:",
        `REACT_APP_NAME=${REACT_APP_NAME}`,
        `REACT_APP_DEFAULT_INSTANCE=${REACT_APP_DEFAULT_INSTANCE}`,
        `REACT_APP_LOCK_TO_DEFAULT_INSTANCE=${REACT_APP_LOCK_TO_DEFAULT_INSTANCE}`,
        `REACT_APP_INSTANCE_SELECTION_MODE=${REACT_APP_INSTANCE_SELECTION_MODE}`,
        "",
        "IF YOU DON'T RECOGNIZE THIS, YOU SHOULD CLICK CANCEL",
      ].join("\n"),
    );
    if (confirmed) {
      return {
        REACT_APP_NAME,
        REACT_APP_DEFAULT_INSTANCE,
        REACT_APP_LOCK_TO_DEFAULT_INSTANCE,
        REACT_APP_INSTANCE_SELECTION_MODE,
      };
    }
  }
  return {};
})();

const WINDOW_REACT_APP_DEFAULT_INSTANCE = getDockerInjectedEnv(
  "REACT_APP_DEFAULT_INSTANCE",
);

const WINDOW_REACT_APP_LOCK_TO_DEFAULT_INSTANCE = getDockerInjectedEnv(
  "REACT_APP_LOCK_TO_DEFAULT_INSTANCE",
);

const WINDOW_REACT_APP_NAME = getDockerInjectedEnv("REACT_APP_NAME");

const WINDOW_REACT_APP_INSTANCE_SELECTION_MODE = getDockerInjectedEnv(
  "REACT_APP_INSTANCE_SELECTION_MODE",
);

const WINDOW_REACT_APP_CONTENT_WARNING = getDockerInjectedEnv(
  "REACT_APP_CONTENT_WARNING",
);

const WINDOW_REACT_APP_DEFAULT_LIGHT_THEME = getDockerInjectedEnv(
  "REACT_APP_DEFAULT_LIGHT_THEME",
);

const WINDOW_REACT_APP_DEFAULT_DARK_THEME = getDockerInjectedEnv(
  "REACT_APP_DEFAULT_DARK_THEME",
);

export const lightThemeSchema = z.enum([
  "default-light",
  "dracula-light",
  "unix-light",
]);

export const darkThemeSchema = z.enum([
  "default-dark",
  "dracula-dark",
  "unix-dark",
]);

function parseBoolean(bool?: string) {
  switch (bool?.toLowerCase()) {
    case "true":
    case "1":
      return true;
  }
  return false;
}

const { REACT_APP_DEFAULT_INSTANCE, ...config } = createEnv({
  //server: {},
  clientPrefix: "REACT_APP_",
  client: {
    REACT_APP_COMMIT_SHA: z.string().default(""),
    REACT_APP_NAME: z.string().min(1),
    REACT_APP_DEFAULT_INSTANCE: z
      .string()
      .url()
      .refine((input) => {
        return (
          (input.startsWith("http://") || input.startsWith("https://")) &&
          !input.endsWith("/")
        );
      }),
    REACT_APP_LOCK_TO_DEFAULT_INSTANCE: z.boolean(),
    REACT_APP_INSTANCE_SELECTION_MODE: z.enum([
      "default_first",
      "default_random",
    ]),
    REACT_APP_CONTENT_WARNING: z.string().default(""),
    REACT_APP_DEFAULT_LIGHT_THEME: lightThemeSchema.default("default-light"),
    REACT_APP_DEFAULT_DARK_THEME: darkThemeSchema.default("default-dark"),
  },
  runtimeEnv: {
    REACT_APP_COMMIT_SHA: import.meta.env["REACT_APP_COMMIT_SHA"],
    REACT_APP_NAME:
      runtimeInjectedEnv.REACT_APP_NAME ||
      WINDOW_REACT_APP_NAME ||
      import.meta.env["REACT_APP_NAME"] ||
      "Blorp",
    REACT_APP_DEFAULT_INSTANCE:
      runtimeInjectedEnv.REACT_APP_DEFAULT_INSTANCE ||
      WINDOW_REACT_APP_DEFAULT_INSTANCE ||
      import.meta.env["REACT_APP_DEFAULT_INSTANCE"] ||
      FALLBACK_INSTANCE,
    REACT_APP_LOCK_TO_DEFAULT_INSTANCE: parseBoolean(
      runtimeInjectedEnv.REACT_APP_LOCK_TO_DEFAULT_INSTANCE ||
        WINDOW_REACT_APP_LOCK_TO_DEFAULT_INSTANCE ||
        import.meta.env["REACT_APP_LOCK_TO_DEFAULT_INSTANCE"],
    ),
    REACT_APP_INSTANCE_SELECTION_MODE: (
      runtimeInjectedEnv.REACT_APP_INSTANCE_SELECTION_MODE ||
      WINDOW_REACT_APP_INSTANCE_SELECTION_MODE ||
      import.meta.env["REACT_APP_INSTANCE_SELECTION_MODE"] ||
      "default_first"
    ).toLowerCase(),
    REACT_APP_CONTENT_WARNING:
      WINDOW_REACT_APP_CONTENT_WARNING ||
      import.meta.env["REACT_APP_CONTENT_WARNING"] ||
      "",
    REACT_APP_DEFAULT_LIGHT_THEME:
      WINDOW_REACT_APP_DEFAULT_LIGHT_THEME ||
      import.meta.env["REACT_APP_DEFAULT_LIGHT_THEME"] ||
      "default-light",
    REACT_APP_DEFAULT_DARK_THEME:
      WINDOW_REACT_APP_DEFAULT_DARK_THEME ||
      import.meta.env["REACT_APP_DEFAULT_DARK_THEME"] ||
      "default-dark",
  },
  onValidationError: (issues) => {
    console.error("❌ Invalid environment variables:", issues);
    throw new Error("Invalid environment variables");
  },
});

export const defaultInstances = (() => {
  const instances =
    REACT_APP_DEFAULT_INSTANCE.split(",").map(normalizeInstance);

  switch (config.REACT_APP_INSTANCE_SELECTION_MODE) {
    case "default_random":
      return _.shuffle(instances);
    default:
      return instances;
  }
})();

const defaultInstance =
  defaultInstances[0] || normalizeInstance(FALLBACK_INSTANCE);

export const env = {
  ...config,
  defaultInstances,
  defaultInstance,
  contentWarning: config.REACT_APP_CONTENT_WARNING,
};
