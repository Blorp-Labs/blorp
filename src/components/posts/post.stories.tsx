import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCard } from "./post";
import * as api from "@/test-utils/api";
import { usePostsStore } from "@/src/stores/posts";
import { useEffect } from "react";
import { useAuth } from "@/src/stores/auth";
import { useProfilesStore } from "@/src/stores/profiles";
import { useFlairsStore } from "@/src/stores/flairs";

const textPost = api.getPost({
  variant: "text",
  post: { id: api.randomDbId() },
});
const imgPost = api.getPost({
  variant: "image",
  post: { id: api.randomDbId() },
});
const articlePost = api.getPost({
  variant: "article",
  post: { id: api.randomDbId() },
});
const youtubePost = api.getPost({
  variant: "youtube",
  post: { id: api.randomDbId() },
});
const soundcloudPost = api.getPost({
  variant: "soundcloud",
  post: { id: api.randomDbId() },
});
const videoPost = api.getPost({
  variant: "video",
  post: { id: api.randomDbId() },
});
const loopsPost = api.getPost({
  variant: "loops",
  post: { id: api.randomDbId() },
});
const vimeoPost = api.getPost({
  variant: "vimeo",
  post: { id: api.randomDbId() },
});
const peertubePost = api.getPost({
  variant: "peertube",
  post: { id: api.randomDbId() },
});
const spotifyPost = api.getPost({
  variant: "spotify",
  post: { id: api.randomDbId() },
});
const bandcampPost = api.getPost({
  variant: "bandcamp",
  post: { id: api.randomDbId() },
});
const pollPost = api.getPost({
  variant: "poll",
  post: { id: api.randomDbId() },
});

const nsfwImagePost = api.getPost({
  variant: "image",
  post: { id: api.randomDbId(), nsfw: true },
});
const nsfwArticlePost = api.getPost({
  variant: "article",
  post: { id: api.randomDbId(), nsfw: true },
});
const nsfwVideoPost = api.getPost({
  variant: "video",
  post: { id: api.randomDbId(), nsfw: true },
});
const nsfwLoopsPost = api.getPost({
  variant: "loops",
  post: { id: api.randomDbId(), nsfw: true },
});
const nsfwRedGifPost = api.getPost({
  variant: "redgif",
  post: { id: api.randomDbId(), nsfw: true },
});
const nsfwPeerTubePost = api.getPost({
  variant: "peertube",
  post: { id: api.randomDbId(), nsfw: true },
});

const postWithSingleReaction = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    emojiReactions: [{ token: "👍", count: 12 }],
  },
});

const postWithManyReactions = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    emojiReactions: [
      { token: "👍", count: 12 },
      { token: "❤️", count: 8 },
      { token: "😂", count: 5 },
      { token: "😮", count: 3 },
      { token: "😢", count: 2 },
    ],
  },
});

const postFlairs = [
  api.getFlair({ title: "Bug", backgroundColor: "#ef4444", color: "#ffffff" }),
  api.getFlair({
    title: "Feature Request",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
  }),
];
const postWithFlairs = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    flairs: postFlairs.map((f) => ({ id: f.id })),
  },
});

const postWithCrossPosts = api.getPost({
  variant: "text",
  post: {
    id: api.randomDbId(),
    crossPosts: [
      {
        apId: "https://blorpblorp.xyz/post/1001",
        communityHandle: "news@lemmy.world",
      },
      {
        apId: "https://blorpblorp.xyz/post/1002",
        communityHandle: "technology@beehaw.org",
      },
      {
        apId: "https://blorpblorp.xyz/post/1003",
        communityHandle: "worldnews@feddit.de",
      },
    ],
  },
});

const POSTS = [
  textPost,
  imgPost,
  articlePost,
  youtubePost,
  soundcloudPost,
  videoPost,
  loopsPost,
  vimeoPost,
  peertubePost,
  spotifyPost,
  bandcampPost,
  pollPost,
  postWithFlairs,
  postWithCrossPosts,
  postWithSingleReaction,
  postWithManyReactions,
  nsfwImagePost,
  nsfwArticlePost,
  nsfwVideoPost,
  nsfwLoopsPost,
  nsfwRedGifPost,
  nsfwPeerTubePost,
];

function LoadData() {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const cachePosts = usePostsStore((s) => s.cachePosts);
  const cacheProfiles = useProfilesStore((s) => s.cacheProfiles);
  const cacheFlairs = useFlairsStore((s) => s.cacheFlairs);

  useEffect(() => {
    cacheProfiles(
      getCachePrefixer(),
      POSTS.map((p) => p.creator),
    );
    cachePosts(
      getCachePrefixer(),
      POSTS.map((p) => p.post),
    );
    cacheFlairs(getCachePrefixer(), postFlairs);
  }, [cachePosts, cacheProfiles, getCachePrefixer, cacheFlairs]);

  return null;
}

// showNsfw: true makes the post visible; blurNsfw: true keeps the blur overlay.
function LoadNsfwSettings() {
  const updateSelectedAccount = useAuth((s) => s.updateSelectedAccount);

  useEffect(() => {
    updateSelectedAccount({
      site: api.getSite({ showNsfw: true, blurNsfw: true }),
    });
  }, [updateSelectedAccount]);

  return null;
}

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof PostCard> = {
  component: PostCard,
  decorators: (Story) => {
    return (
      <>
        <LoadData />
        <Story />
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof PostCard>;

export const TextLarge: Story = {
  args: {
    apId: textPost.post.apId,
    postCardStyle: "large",
  },
};

export const TextSmall: Story = {
  args: {
    apId: textPost.post.apId,
    postCardStyle: "small",
  },
};

export const TextExtraSmall: Story = {
  args: {
    apId: textPost.post.apId,
    postCardStyle: "extra-small",
  },
};

export const ImageLarge: Story = {
  args: {
    apId: imgPost.post.apId,
    postCardStyle: "large",
  },
};

export const ImageSmall: Story = {
  args: {
    apId: imgPost.post.apId,
    postCardStyle: "small",
  },
};

export const ArticleLarge: Story = {
  args: {
    apId: articlePost.post.apId,
    postCardStyle: "large",
  },
};

export const ArticleSmall: Story = {
  args: {
    apId: articlePost.post.apId,
    postCardStyle: "small",
  },
};

export const YouTube: Story = {
  args: {
    apId: youtubePost.post.apId,
    postCardStyle: "large",
  },
};

export const SoundCloud: Story = {
  args: {
    apId: soundcloudPost.post.apId,
    postCardStyle: "large",
  },
};

export const VideoPost: Story = {
  args: {
    apId: videoPost.post.apId,
    postCardStyle: "large",
  },
};

export const LoopsPost: Story = {
  args: {
    apId: loopsPost.post.apId,
    postCardStyle: "large",
  },
};

export const VimeoPost: Story = {
  args: {
    apId: vimeoPost.post.apId,
    postCardStyle: "large",
  },
};

export const PeerTube: Story = {
  args: {
    apId: peertubePost.post.apId,
    postCardStyle: "large",
  },
};

export const Spotify: Story = {
  args: {
    apId: spotifyPost.post.apId,
    postCardStyle: "large",
  },
};

export const Bandcamp: Story = {
  args: {
    apId: bandcampPost.post.apId,
    postCardStyle: "large",
  },
};

export const Poll: Story = {
  args: {
    apId: pollPost.post.apId,
    postCardStyle: "large",
  },
};

export const WithFlairsLarge: Story = {
  args: {
    apId: postWithFlairs.post.apId,
    postCardStyle: "large",
  },
};

export const WithFlairsSmall: Story = {
  args: {
    apId: postWithFlairs.post.apId,
    postCardStyle: "small",
  },
};

export const WithCrossPostsLarge: Story = {
  args: {
    apId: postWithCrossPosts.post.apId,
    detailView: true,
    postCardStyle: "large",
  },
};

export const WithSingleReaction: Story = {
  args: {
    apId: postWithSingleReaction.post.apId,
    postCardStyle: "large",
  },
};

export const WithManyReactionsTruncated: Story = {
  args: {
    apId: postWithManyReactions.post.apId,
    postCardStyle: "large",
  },
};

const nsfwDecorator: Story["decorators"] = (Story) => (
  <>
    <LoadNsfwSettings />
    <Story />
  </>
);

export const NsfwImage: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwImagePost.post.apId,
    postCardStyle: "large",
  },
};

export const NsfwArticle: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwArticlePost.post.apId,
    postCardStyle: "large",
  },
};

export const NsfwVideo: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwVideoPost.post.apId,
    postCardStyle: "large",
  },
};

export const NsfwLoops: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwLoopsPost.post.apId,
    postCardStyle: "large",
  },
};

export const NsfwRedGif: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwRedGifPost.post.apId,
    postCardStyle: "large",
  },
};

export const NsfwPeerTube: Story = {
  decorators: nsfwDecorator,
  args: {
    apId: nsfwPeerTubePost.post.apId,
    postCardStyle: "large",
  },
};
