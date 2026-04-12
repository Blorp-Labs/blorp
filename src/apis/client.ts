import { LemmyV3Api } from "./lemmy-v3";
import { LemmyV4Api } from "./lemmy-v4";
import { ApiBlueprint } from "./api-blueprint";
import z from "zod";
import _ from "lodash";
import { PieFedApi } from "./piefed";
import { MastodonApi } from "./mastodon";

const wellKnownSchema = z.object({
  links: z.array(
    z.object({
      rel: z.string(),
      href: z.string(),
    }),
  ),
});

const nodeInfoSchema = z.object({
  software: z.object({
    name: z.enum(["lemmy", "piefed", "mastodon"]),
    version: z.string(),
  }),
});

async function fetchNodeInfo(instance: string) {
  // Discover the nodeinfo URL via /.well-known/nodeinfo, falling back to
  // /nodeinfo/2.1 directly for servers that don't advertise it.
  try {
    const wellKnownRes = await fetch(`${instance}/.well-known/nodeinfo`, {
      headers: { "Content-Type": "application/json" },
    });
    if (wellKnownRes.ok) {
      const wellKnown = wellKnownSchema.parse(await wellKnownRes.json());
      // Prefer 2.1, fall back to 2.0
      const link =
        wellKnown.links.find((l) => l.rel.endsWith("/schema/2.1")) ??
        wellKnown.links.find((l) => l.rel.endsWith("/schema/2.0")) ??
        wellKnown.links[0];
      if (link) {
        const res = await fetch(link.href, {
          headers: { "Content-Type": "application/json" },
        });
        return nodeInfoSchema.parse(await res.json());
      }
    }
  } catch {
    // fall through to direct attempt
  }
  const res = await fetch(`${instance}/nodeinfo/2.1`, {
    headers: { "Content-Type": "application/json" },
  });
  return nodeInfoSchema.parse(await res.json());
}

let baseKey = 0;

export const resetApiClients = () => {
  baseKey++;
};

export const apiClient = _.memoize(
  async ({
    instance,
    jwt,
  }: {
    instance: string;
    jwt?: string;
  }): Promise<ApiBlueprint<any>> => {
    instance = instance.replace(/\/$/, "").trim();

    if (!instance.startsWith("https://") && !instance.startsWith("http://")) {
      instance = "https://" + instance;
    }

    const nodeInfo = await fetchNodeInfo(instance);
    const softwareVersion = nodeInfo.software.version;

    switch (nodeInfo.software.name) {
      case "lemmy": {
        if (
          nodeInfo.software.version.startsWith("1.") ||
          nodeInfo.software.version.startsWith("nightly")
        ) {
          return new LemmyV4Api({ instance, jwt, softwareVersion });
        } else {
          return new LemmyV3Api({ instance, jwt, softwareVersion });
        }
      }
      case "piefed": {
        return new PieFedApi({ instance, jwt, softwareVersion });
      }
      case "mastodon": {
        return new MastodonApi({ instance, jwt, softwareVersion });
      }
    }

    // throw new Error("no compatable api for instance");
  },
  (params) => {
    return params.instance + params.jwt + baseKey;
  },
);
