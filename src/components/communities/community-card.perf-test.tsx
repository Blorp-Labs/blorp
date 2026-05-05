import { test } from "vitest";
import { measureRenders } from "reassure";
import { CommunityCardView } from "./community-card";
import * as api from "@/test-utils/api";
import { PerfProviders } from "@/test-utils/render-providers";

const community = api.getCommunity();
const nsfwCommunity = api.getCommunity({ nsfw: true });

const RUNS = 20;

test("CommunityCardView md", async () => {
  await measureRenders(<CommunityCardView community={community} size="md" />, {
    runs: RUNS,
    wrapper: PerfProviders,
  });
});

test("CommunityCardView sm", async () => {
  await measureRenders(<CommunityCardView community={community} size="sm" />, {
    runs: RUNS,
    wrapper: PerfProviders,
  });
});

test("CommunityCardView md/disableLink", async () => {
  await measureRenders(
    <CommunityCardView community={community} size="md" disableLink />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("CommunityCardView md/hideText", async () => {
  await measureRenders(
    <CommunityCardView community={community} size="md" hideText />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("CommunityCardView md/nsfw", async () => {
  await measureRenders(
    <CommunityCardView community={nsfwCommunity} size="md" />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});
