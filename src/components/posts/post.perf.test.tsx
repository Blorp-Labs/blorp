import { describe, it } from "vitest";
import { PostCardView } from "./post";
import * as api from "@/test-utils/api";
import { PerfProviders } from "@/test-utils/render-providers";
import { expectRenderUnder, type PerfThresholds } from "@/test-utils/perf";

// Calibrated to ~2x observed CI medians on GitHub-hosted ubuntu-latest runners.
// Catches ~2x regressions without false positives from CI noise. Run
// `BLORP_PERF_LOG=1 pnpm test:perf` locally and inspect CI logs to recalibrate.
const THRESHOLDS = {
  largeText: { medianMs: 30 },
  largeImage: { medianMs: 23 },
  largeArticle: { medianMs: 20 },
  smallText: { medianMs: 15 },
  smallImage: { medianMs: 16 },
  extraSmallText: { medianMs: 11 },
} satisfies Record<string, PerfThresholds>;

const text = api.getPost({ variant: "text" });
const image = api.getPost({ variant: "image" });
const article = api.getPost({ variant: "article" });

describe("PostCardView perf", () => {
  it("large / text", () =>
    expectRenderUnder(
      "large/text",
      () => (
        <PerfProviders>
          <PostCardView
            post={text.post}
            creator={text.creator}
            community={text.community}
            flairs={[]}
            postCardStyle="large"
          />
        </PerfProviders>
      ),
      THRESHOLDS.largeText,
    ));

  it("large / image", () =>
    expectRenderUnder(
      "large/image",
      () => (
        <PerfProviders>
          <PostCardView
            post={image.post}
            creator={image.creator}
            community={image.community}
            flairs={[]}
            postCardStyle="large"
          />
        </PerfProviders>
      ),
      THRESHOLDS.largeImage,
    ));

  it("large / article", () =>
    expectRenderUnder(
      "large/article",
      () => (
        <PerfProviders>
          <PostCardView
            post={article.post}
            creator={article.creator}
            community={article.community}
            flairs={[]}
            postCardStyle="large"
          />
        </PerfProviders>
      ),
      THRESHOLDS.largeArticle,
    ));

  it("small / text", () =>
    expectRenderUnder(
      "small/text",
      () => (
        <PerfProviders>
          <PostCardView
            post={text.post}
            creator={text.creator}
            community={text.community}
            flairs={[]}
            postCardStyle="small"
          />
        </PerfProviders>
      ),
      THRESHOLDS.smallText,
    ));

  it("small / image", () =>
    expectRenderUnder(
      "small/image",
      () => (
        <PerfProviders>
          <PostCardView
            post={image.post}
            creator={image.creator}
            community={image.community}
            flairs={[]}
            postCardStyle="small"
          />
        </PerfProviders>
      ),
      THRESHOLDS.smallImage,
    ));

  it("extra-small / text", () =>
    expectRenderUnder(
      "extra-small/text",
      () => (
        <PerfProviders>
          <PostCardView
            post={text.post}
            creator={text.creator}
            community={text.community}
            flairs={[]}
            postCardStyle="extra-small"
          />
        </PerfProviders>
      ),
      THRESHOLDS.extraSmallText,
    ));
});
