import { LemmyV3Api } from "./lemmy-v3";
import { LemmyV4Api } from "./lemmy-v4";
import { ApiBlueprint } from "./api-blueprint";
import z from "zod";
import _ from "lodash";
import { PieFedApi } from "./piefed";

const nodeInfoSchema = z.object({
  software: z.object({
    name: z.enum(["lemmy", "piefed"]),
    version: z.string(),
  }),
});

let baseKey = 0;

export const resetApiClients = () => {
  baseKey++;
};

export const apiClient = _.memoize(
  async ({
    instance,
    jwt,
    myApId,
    myId,
  }: {
    instance: string;
    jwt?: string;
    myApId?: string;
    myId?: number;
  }): Promise<ApiBlueprint<any>> => {
    instance = instance.replace(/\/$/, "").trim();

    if (!instance.startsWith("https://") && !instance.startsWith("http://")) {
      instance = "https://" + instance;
    }

    const res = await fetch(`${instance}/nodeinfo/2.1`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();

    const nodeInfo = nodeInfoSchema.parse(json);
    const softwareVersion = nodeInfo.software.version;

    switch (nodeInfo.software.name) {
      case "lemmy": {
        if (
          nodeInfo.software.version.startsWith("1.") ||
          nodeInfo.software.version.startsWith("nightly")
        ) {
          return new LemmyV4Api({ instance, jwt, softwareVersion, myApId, myId });
        } else {
          return new LemmyV3Api({ instance, jwt, softwareVersion, myApId, myId });
        }
      }
      case "piefed": {
        return new PieFedApi({ instance, jwt, softwareVersion, myApId, myId });
      }
    }

    // throw new Error("no compatable api for instance");
  },
  (params) => {
    return params.instance + params.jwt + baseKey;
  },
);
