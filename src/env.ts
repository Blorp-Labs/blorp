import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import _ from "lodash";
import { normalizeInstance } from "./lib/utils";

const FALLBACK_INSTANCE = "https://lemmy.zip";

function getDockerInjectedEnv<K extends string>(key: K) {
  const value = _.get(window, key);
  return _.isString(value) ? value : null;
}

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

function parseBoolean(bool?: string) {
  switch (bool?.toLowerCase()) {
    case "true":
    case "1":
      return true;
  }
  return false;
}

export const env = createEnv({
  //server: {},
  clientPrefix: "REACT_APP_",
  client: {
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
  },
  runtimeEnv: {
    REACT_APP_NAME:
      WINDOW_REACT_APP_NAME || import.meta.env["REACT_APP_NAME"] || "Blorp",
    REACT_APP_DEFAULT_INSTANCE:
      WINDOW_REACT_APP_DEFAULT_INSTANCE ||
      import.meta.env["REACT_APP_DEFAULT_INSTANCE"] ||
      FALLBACK_INSTANCE,
    REACT_APP_LOCK_TO_DEFAULT_INSTANCE: parseBoolean(
      WINDOW_REACT_APP_LOCK_TO_DEFAULT_INSTANCE ||
        import.meta.env["REACT_APP_LOCK_TO_DEFAULT_INSTANCE"],
    ),
    REACT_APP_INSTANCE_SELECTION_MODE: (
      WINDOW_REACT_APP_INSTANCE_SELECTION_MODE ||
      import.meta.env["REACT_APP_INSTANCE_SELECTION_MODE"] ||
      "default_first"
    ).toLowerCase(),
  },
  onValidationError: (issues) => {
    console.error("❌ Invalid environment variables:", issues);
    throw new Error("Invalid environment variables");
  },
});

export const getDefaultInstace = _.memoize(() => {
  const instances =
    env.REACT_APP_DEFAULT_INSTANCE.split(",").map(normalizeInstance);

  switch (env.REACT_APP_INSTANCE_SELECTION_MODE) {
    case "default_first":
      return instances[0] || FALLBACK_INSTANCE;
    case "default_random":
      return _.sample(instances) || FALLBACK_INSTANCE;
  }
});
