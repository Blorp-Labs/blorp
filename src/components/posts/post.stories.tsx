import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCardView } from "./post";
import * as api from "@/test-utils/api";

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

const meta: Meta<typeof PostCardView> = {
  component: PostCardView,
};

export default meta;
type Story = StoryObj<typeof PostCardView>;

export const TextLarge: Story = {
  args: {
    post: textPost.post,
    creator: textPost.creator,
    postCardStyle: "large",
  },
};

export const TextSmall: Story = {
  args: {
    post: textPost.post,
    creator: textPost.creator,
    postCardStyle: "small",
  },
};

export const TextExtraSmall: Story = {
  args: {
    post: textPost.post,
    creator: textPost.creator,
    postCardStyle: "extra-small",
  },
};

export const ImageLarge: Story = {
  args: {
    post: imgPost.post,
    creator: imgPost.creator,
    postCardStyle: "large",
  },
};

export const ImageSmall: Story = {
  args: {
    post: imgPost.post,
    creator: imgPost.creator,
    postCardStyle: "small",
  },
};

export const ArticleLarge: Story = {
  args: {
    post: articlePost.post,
    creator: articlePost.creator,
    postCardStyle: "large",
  },
};

export const ArticleSmall: Story = {
  args: {
    post: articlePost.post,
    creator: articlePost.creator,
    postCardStyle: "small",
  },
};

export const YouTube: Story = {
  args: {
    post: youtubePost.post,
    creator: youtubePost.creator,
    postCardStyle: "large",
  },
};

export const SoundCloud: Story = {
  args: {
    post: soundcloudPost.post,
    creator: soundcloudPost.creator,
    postCardStyle: "large",
  },
};

export const VideoPost: Story = {
  args: {
    post: videoPost.post,
    creator: videoPost.creator,
    postCardStyle: "large",
  },
};

export const LoopsPost: Story = {
  args: {
    post: loopsPost.post,
    creator: loopsPost.creator,
    postCardStyle: "large",
  },
};

export const VimeoPost: Story = {
  args: {
    post: vimeoPost.post,
    creator: vimeoPost.creator,
    postCardStyle: "large",
  },
};

export const PeerTube: Story = {
  args: {
    post: peertubePost.post,
    creator: peertubePost.creator,
    postCardStyle: "large",
  },
};

export const Spotify: Story = {
  args: {
    post: spotifyPost.post,
    creator: spotifyPost.creator,
    postCardStyle: "large",
  },
};

export const Bandcamp: Story = {
  args: {
    post: bandcampPost.post,
    creator: bandcampPost.creator,
    postCardStyle: "large",
  },
};

export const Poll: Story = {
  args: {
    post: pollPost.post,
    creator: pollPost.creator,
    postCardStyle: "large",
  },
};

export const WithFlairsLarge: Story = {
  args: {
    post: postWithFlairs.post,
    creator: postWithFlairs.creator,
    flairs: postFlairs,
    postCardStyle: "large",
  },
};

export const WithFlairsSmall: Story = {
  args: {
    post: postWithFlairs.post,
    creator: postWithFlairs.creator,
    flairs: postFlairs,
    postCardStyle: "small",
  },
};

export const WithCrossPostsLarge: Story = {
  args: {
    post: postWithCrossPosts.post,
    creator: postWithCrossPosts.creator,
    detailView: true,
    postCardStyle: "large",
  },
};

export const WithSingleReaction: Story = {
  args: {
    post: postWithSingleReaction.post,
    creator: postWithSingleReaction.creator,
    postCardStyle: "large",
  },
};

export const WithManyReactionsTruncated: Story = {
  args: {
    post: postWithManyReactions.post,
    creator: postWithManyReactions.creator,
    postCardStyle: "large",
  },
};

export const NsfwImage: Story = {
  args: {
    post: nsfwImagePost.post,
    creator: nsfwImagePost.creator,
    postCardStyle: "large",
  },
};

export const NsfwArticle: Story = {
  args: {
    post: nsfwArticlePost.post,
    creator: nsfwArticlePost.creator,
    postCardStyle: "large",
  },
};

export const NsfwVideo: Story = {
  args: {
    post: nsfwVideoPost.post,
    creator: nsfwVideoPost.creator,
    postCardStyle: "large",
  },
};

export const NsfwLoops: Story = {
  args: {
    post: nsfwLoopsPost.post,
    creator: nsfwLoopsPost.creator,
    postCardStyle: "large",
  },
};

export const NsfwRedGif: Story = {
  args: {
    post: nsfwRedGifPost.post,
    creator: nsfwRedGifPost.creator,
    postCardStyle: "large",
  },
};

export const NsfwPeerTube: Story = {
  args: {
    post: nsfwPeerTubePost.post,
    creator: nsfwPeerTubePost.creator,
    postCardStyle: "large",
  },
};
