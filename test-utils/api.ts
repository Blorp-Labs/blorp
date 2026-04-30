import dayjs from "dayjs";
import utcPlugin from "dayjs/plugin/utc";
import { Schemas, Software } from "@/src/apis/api-blueprint";
import { createHandle } from "@/src/apis/utils";
import _ from "lodash";

dayjs.extend(utcPlugin);

const API_ROOT = "https://blorpblorp.xyz";
const HOST = new URL(API_ROOT).host;
const POST_ID = 0;
const PERSON_ID = 0;
const COMMUNITY_ID = 0;

const BODY_TEXT_PARAGRAPH =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const BODY_TEXT = _.repeat(BODY_TEXT_PARAGRAPH + "\n\n", 3);
const COMMUNITY_DESCRIPTION = _.repeat(BODY_TEXT_PARAGRAPH + "\n\n", 2);

export const randomDbId = () => _.random(2000, 200000);

const absoluteTime = () =>
  dayjs(1738238400000).utc().format("YYYY-MM-DDTHH:mm:ss.SSS[000]Z"); // 2025-01-30T12:00:00Z — noon UTC, safe across all timezones

const relativeTime = () =>
  dayjs().utc().subtract(1, "hour").format("YYYY-MM-DDTHH:mm:ss.SSS[000]Z");

export function getFlair(overrides?: Partial<Schemas.Flair>): Schemas.Flair {
  const id = overrides?.id ?? randomDbId();
  return {
    id,
    apId: `${API_ROOT}/flair/${id}`,
    title: "Test Flair",
    backgroundColor: null,
    color: null,
    ...overrides,
  };
}

export function getPerson(overrides?: Partial<Schemas.Person>): Schemas.Person {
  const id = overrides?.id ?? PERSON_ID;
  const apId = `${API_ROOT}/u/${id}`;
  return {
    createdAt: relativeTime(),
    id,
    avatar: null,
    handle: createHandle({ apId, name: String(id) }),
    matrixUserId: null,
    bio: "This is me",
    deleted: false,
    isBot: false,
    isBanned: false,
    postCount: 100,
    commentCount: 2000,
    ...overrides,
    apId,
  };
}

export function getPost(config?: {
  variant?:
    | "image"
    | "video"
    | "article"
    | "youtube"
    | "loops"
    | "text"
    | "spotify"
    | "bandcamp"
    | "soundcloud"
    | "vimeo"
    | "generic-video"
    | "peertube"
    | "poll"
    | "redgif";
  post?: Partial<Schemas.Post>;
  /* postView?: PartialDeep<Omit<PostView, "image_details">>; */
  /* personView?: PartialDeep<PersonView>; */
}): {
  post: Schemas.Post;
  creator: Schemas.Person;
  community: Schemas.Community;
} {
  const creator = getPerson();
  const creatorHandle = creator.handle;

  const postId = config?.post?.id ?? POST_ID;

  const community = getCommunity();

  const post: Schemas.Post = {
    locked: false,
    createdAt: relativeTime(),
    id: postId,
    apId: `${API_ROOT}/post/${postId}`,
    nsfw: false,
    title: "This is a test post",
    body: BODY_TEXT,
    upvotes: 10,
    downvotes: 2,
    commentsCount: 4,
    deleted: false,
    saved: false,
    creatorHandle,
    creatorId: creator.id,
    creatorApId: creator.apId,
    isBannedFromCommunity: false,
    communityHandle: community.handle,
    communityApId: community.apId,
    thumbnailUrl: null,
    thumbnailAspectRatio: null,
    embedVideoUrl: null,
    url: null,
    urlContentType: null,
    removed: false,
    crossPosts: [],
    featuredCommunity: false,
    featuredLocal: false,
    read: false,
    altText: null,
    flairs: [],
    emojiReactions: [],
    ...config?.post,
  };

  switch (config?.variant) {
    case "text": {
      post.body = config?.post?.body ?? BODY_TEXT;
      break;
    }
    case "image": {
      const height = 200;
      const width = 300;
      post.thumbnailAspectRatio = width / height;
      const imgUrl = `https://picsum.photos/id/10/${width}/${height}`;
      post.thumbnailUrl = imgUrl;
      post.urlContentType = "image/jpeg";
      break;
    }
    case "article": {
      const height = 200;
      const width = 300;
      post.thumbnailAspectRatio = width / height;
      const imgUrl = `https://picsum.photos/id/10/${width}/${height}`;
      post.thumbnailUrl = imgUrl;
      post.urlContentType = "text/html";
      post.url = "https://react.dev/blog/2024/12/05/react-19";
      break;
    }
    case "youtube": {
      post.url = "https://www.youtube.com/watch?v=LDU_Txk06tM";
      break;
    }
    case "soundcloud": {
      post.url =
        "https://soundcloud.com/tomvalbyrotary/youre-making-my-teeth-grow";
      break;
    }
    case "video": {
      post.url = "https://www.w3schools.com/html/mov_bbb.mp4";
      post.thumbnailUrl =
        "https://lemmy.world/pictrs/image/53222559-aac6-4936-a1ad-4ca28fd94713.jpeg";
      break;
    }
    case "loops": {
      post.url = "https://loops.video/v/60Sa-5oVYT";
      post.thumbnailUrl =
        "https://lemmy.world/pictrs/image/53222559-aac6-4936-a1ad-4ca28fd94713.jpeg";
      break;
    }
    case "vimeo": {
      post.url = "https://vimeo.com/279580150";
      post.thumbnailUrl =
        "https://lemmy.world/pictrs/image/56252b3c-61b4-4fb9-910c-ca273f6d0593.webp";
      break;
    }
    case "peertube": {
      post.url =
        "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd";
      break;
    }
    case "spotify": {
      post.url = "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh";
      break;
    }
    case "bandcamp": {
      post.embedVideoUrl =
        "https://bandcamp.com/EmbeddedPlayer/v=2/track=2978997260/size=large/tracklist=false/artwork=small/";
      break;
    }
    case "redgif": {
      post.url = "https://www.redgifs.com/watch/testredgifid";
      post.thumbnailUrl =
        "https://lemmy.world/pictrs/image/53222559-aac6-4936-a1ad-4ca28fd94713.jpeg";
      break;
    }
    case "poll": {
      post.poll = {
        choices: [
          { id: 1, text: "Option A", numVotes: 12 },
          { id: 2, text: "Option B", numVotes: 7 },
          { id: 3, text: "Option C", numVotes: 4 },
          { id: 4, text: "Option D", numVotes: 1 },
        ],
        endDate: "2046-02-22T00:00:00.000000Z",
        localOnly: false,
        mode: "single",
      };
      break;
    }
  }

  return {
    creator,
    post,
    community,
  };
}

export function getComment(
  overrides?: Partial<Schemas.Comment>,
): Schemas.Comment {
  const commentId = overrides?.id ?? 0;
  const postId = overrides?.postId ?? POST_ID;
  const creator = getPerson();
  const community = getCommunity();
  return {
    locked: false,
    createdAt: relativeTime(),
    id: commentId,
    apId: `${API_ROOT}/comment/${commentId}`,
    path: `0.${commentId}`,
    body: "This is a test comment.",
    creatorId: creator.id,
    creatorApId: creator.apId,
    creatorHandle: creator.handle,
    isBannedFromCommunity: false,
    postId,
    postApId: `${API_ROOT}/post/${postId}`,
    downvotes: 0,
    upvotes: 3,
    myVote: null,
    communityHandle: community.handle,
    communityApId: community.apId,
    removed: false,
    deleted: false,
    postTitle: "This is a test post",
    childCount: 0,
    saved: false,
    answer: false,
    emojiReactions: [],
    ...overrides,
  };
}

export function getSite(overrides?: Partial<Schemas.Site>): Schemas.Site {
  return {
    privateInstance: false,
    instance: API_ROOT,
    description: null,
    me: null,
    myEmail: null,
    admins: null,
    moderates: null,
    follows: null,
    personBlocks: null,
    communityBlocks: null,
    version: "0.19.0",
    sidebar: null,
    userCount: null,
    usersActiveDayCount: null,
    usersActiveWeekCount: null,
    usersActiveMonthCount: null,
    usersActiveHalfYearCount: null,
    postCount: null,
    commentCount: null,
    icon: null,
    title: null,
    applicationQuestion: null,
    registrationMode: "Open",
    showNsfw: false,
    blurNsfw: true,
    enablePostDownvotes: true,
    enableCommentDownvotes: true,
    software: Software.LEMMY,
    ...overrides,
  };
}

export function getFeed(
  overrides?: Partial<Schemas.MultiCommunityFeed>,
): Schemas.MultiCommunityFeed {
  const id = overrides?.id ?? 1;
  return {
    id,
    apId: `${API_ROOT}/feed/${id}`,
    handle: `feed-${id}@${HOST}`,
    name: `Feed ${id}`,
    createdAt: absoluteTime(),
    icon: null,
    banner: null,
    nsfw: false,
    communityCount: 3,
    subscriberCount: 10,
    description: null,
    subscribed: false,
    ...overrides,
  };
}

export function getCommunity(
  overrides?: Partial<Schemas.Community>,
): Schemas.Community {
  const communityId = overrides?.id ?? COMMUNITY_ID;
  return {
    createdAt: absoluteTime(),
    id: communityId,
    apId: `${API_ROOT}/c/${communityId}`,
    handle: `${communityId}@${HOST}`,
    subscriberCount: 562,
    subscribersLocalCount: 432,
    postCount: 753,
    commentCount: 1324,
    usersActiveDayCount: 34,
    usersActiveWeekCount: 73,
    usersActiveMonthCount: 235,
    usersActiveHalfYearCount: 426,
    banner: `https://picsum.photos/id/11/800/200`,
    icon: `https://picsum.photos/id/12/200/200`,
    subscribed: "NotSubscribed",
    description: COMMUNITY_DESCRIPTION,
    nsfw: false,
  };
}
