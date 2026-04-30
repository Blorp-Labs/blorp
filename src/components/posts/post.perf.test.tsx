import { describe, it } from "vitest";
import { PostCardView } from "./post";
import * as api from "@/test-utils/api";
import { PerfProviders } from "@/test-utils/render-providers";
import { expectRenderUnder, type PerfThresholds } from "@/test-utils/perf";

// Calibrated to ~2x observed local medians (jsdom on a typical dev machine).
// Tight enough to catch subtle regressions. CI is noisier than dev hardware —
// the workflow sets `BLORP_PERF_MULT=3` to scale these up for the CI runner.
// Run `BLORP_PERF_LOG=1 pnpm test:perf` locally to recalibrate.
const THRESHOLDS = {
  largeText: { medianMs: 11 },
  largeImage: { medianMs: 9 },
  largeArticle: { medianMs: 9 },
  smallText: { medianMs: 8 },
  smallImage: { medianMs: 8 },
  extraSmallText: { medianMs: 6 },
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
