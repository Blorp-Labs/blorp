import { test } from "vitest";
import { measureRenders } from "reassure";
import { PostCardView } from "./post";
import * as api from "@/test-utils/api";
import { PerfProviders } from "@/test-utils/render-providers";

const text = api.getPost({ variant: "text" });
const image = api.getPost({ variant: "image" });
const article = api.getPost({ variant: "article" });

const RUNS = 20;

test("PostCardView large/text", async () => {
  await measureRenders(
    <PostCardView
      post={text.post}
      creator={text.creator}
      community={text.community}
      flairs={[]}
      postCardStyle="large"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("PostCardView large/image", async () => {
  await measureRenders(
    <PostCardView
      post={image.post}
      creator={image.creator}
      community={image.community}
      flairs={[]}
      postCardStyle="large"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("PostCardView large/article", async () => {
  await measureRenders(
    <PostCardView
      post={article.post}
      creator={article.creator}
      community={article.community}
      flairs={[]}
      postCardStyle="large"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("PostCardView small/text", async () => {
  await measureRenders(
    <PostCardView
      post={text.post}
      creator={text.creator}
      community={text.community}
      flairs={[]}
      postCardStyle="small"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("PostCardView small/image", async () => {
  await measureRenders(
    <PostCardView
      post={image.post}
      creator={image.creator}
      community={image.community}
      flairs={[]}
      postCardStyle="small"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});

test("PostCardView extra-small/text", async () => {
  await measureRenders(
    <PostCardView
      post={text.post}
      creator={text.creator}
      community={text.community}
      flairs={[]}
      postCardStyle="extra-small"
    />,
    { runs: RUNS, wrapper: PerfProviders },
  );
});
