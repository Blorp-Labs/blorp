import dayjs from "dayjs";
import utcPlugin from "dayjs/plugin/utc";
import _ from "lodash";
import { PostView, PersonView, CommunityView, CommentView } from "lemmy-v3";
import { PartialDeep } from "type-fest";
import { faker } from "@faker-js/faker";
import {
  TV_POST_VIEW,
  TV_COMMENT_VIEW,
  ASKLEMMY_COMMUNITY_VIEW,
  PICARD_PERSON_VIEW,
} from "./lemmy-api-fixtures";

dayjs.extend(utcPlugin);

const uuid = () => _.random(2000, 200000);

const relativeTime = () =>
  dayjs().utc().subtract(1, "hour").format("YYYY-MM-DDTHH:mm:ss.SSS[000]Z");

const API_ROOT = "https://blorpblorp.xyz";

const BODY_TEXT_PARAGRAPH =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const BODY_TEXT = _.repeat(BODY_TEXT_PARAGRAPH + "\n\n", 3);

const POST_ID = uuid();
const PERSON_ID = uuid();
const COMMUNITY_ID = uuid();
const COMMENT_ID = uuid();

export function getPerson(config?: {
  personView?: PartialDeep<PersonView>;
}): PersonView {
  const id = config?.personView?.person?.id ?? PERSON_ID;
  return {
    ...PICARD_PERSON_VIEW,
    ...config?.personView,
    person: {
      ...PICARD_PERSON_VIEW.person,
      ...config?.personView?.person,
      id,
      actor_id: config?.personView?.person?.actor_id ?? `${API_ROOT}/u/${id}`,
    },
    counts: {
      ...PICARD_PERSON_VIEW.counts,
      ...config?.personView?.counts,
      person_id: id,
    },
  };
}

export function getCommunity(config?: {
  communityView?: PartialDeep<CommunityView>;
}): CommunityView {
  const id = config?.communityView?.community?.id ?? COMMUNITY_ID;
  return {
    ...ASKLEMMY_COMMUNITY_VIEW,
    ...config?.communityView,
    community: {
      ...ASKLEMMY_COMMUNITY_VIEW.community,
      ...config?.communityView?.community,
      id,
      actor_id:
        config?.communityView?.community?.actor_id ?? `${API_ROOT}/c/${id}`,
    },
    counts: {
      ...ASKLEMMY_COMMUNITY_VIEW.counts,
      ...config?.communityView?.counts,
      community_id: id,
    },
  };
}

export function getRandomCommunity() {
  const title = faker.lorem.words(3);
  const name = title.replaceAll(" ", "-");
  return getCommunity({
    communityView: {
      community: {
        id: uuid(),
        title,
        name,
        actor_id: `${API_ROOT}/c/${name}`,
        published: relativeTime(),
        updated: undefined,
      },
    },
  });
}

export function getPost(config?: {
  variant?: "youtube" | "image" | "article" | "text";
  postView?: PartialDeep<Omit<PostView, "image_details">>;
  personView?: PartialDeep<PersonView>;
}): PostView {
  const creator = getPerson({ personView: config?.personView });
  const community = getCommunity({
    communityView: { community: config?.postView?.community },
  });
  const id = config?.postView?.post?.id ?? POST_ID;

  const view: PostView = {
    ...TV_POST_VIEW,
    ...config?.postView,
    community: community.community,
    creator: creator.person,
    post: {
      ...TV_POST_VIEW.post,
      ...config?.postView?.post,
      id,
      ap_id: config?.postView?.post?.ap_id ?? `${API_ROOT}/post/${id}`,
      creator_id: creator.person.id,
      community_id: community.community.id,
    },
    counts: {
      ...TV_POST_VIEW.counts,
      ...config?.postView?.counts,
      post_id: id,
    },
  };

  switch (config?.variant) {
    case "text": {
      view.post.body = config?.postView?.post?.body ?? BODY_TEXT;
      break;
    }
    case "image": {
      const imgUrl = `https://picsum.photos/id/10/300/200`;
      view.image_details = {
        height: 200,
        width: 300,
        link: imgUrl,
        content_type: "image/jpeg",
      };
      view.post.thumbnail_url = imgUrl;
      view.post.url_content_type = "image/jpeg";
      break;
    }
    case "article": {
      const imgUrl = `https://picsum.photos/id/10/300/200`;
      view.image_details = {
        height: 200,
        width: 300,
        link: imgUrl,
        content_type: "image/jpeg",
      };
      view.post.thumbnail_url = imgUrl;
      view.post.url_content_type = "text/html";
      view.post.url = "https://react.dev/blog/2024/12/05/react-19";
      break;
    }
    case "youtube": {
      view.post.url = "https://www.youtube.com/watch?v=LDU_Txk06tM";
      break;
    }
  }

  view.counts.score = view.counts.upvotes - view.counts.downvotes;
  return view;
}

export function getRandomPost() {
  return getPost({
    variant: _.sample(["youtube", "image", "article"]),
    postView: {
      post: {
        id: uuid(),
        name: faker.lorem.words(8),
        ap_id: `${API_ROOT}/post/${uuid()}`,
      },
    },
  });
}

export function getComment(config?: {
  commentView?: PartialDeep<CommentView>;
  postView?: PartialDeep<Omit<PostView, "image_details">>;
  personView?: PartialDeep<PersonView>;
}): CommentView {
  const post = getPost({ variant: "text", postView: config?.postView });
  const creator = getPerson({ personView: config?.personView });
  const community = getCommunity({
    communityView: { community: config?.postView?.community },
  });
  const id = config?.commentView?.comment?.id ?? COMMENT_ID;

  return {
    ...TV_COMMENT_VIEW,
    ...config?.commentView,
    post: {
      ...post.post,
      ...config?.commentView?.post,
    },
    creator: {
      ...creator.person,
      ...config?.commentView?.creator,
    },
    community: {
      ...community.community,
      ...config?.commentView?.community,
    },
    comment: {
      ...TV_COMMENT_VIEW.comment,
      ...config?.commentView?.comment,
      id,
      ap_id: config?.commentView?.comment?.ap_id ?? `${API_ROOT}/comment/${id}`,
      path: config?.commentView?.comment?.path ?? `0.${id}`,
      creator_id: creator.person.id,
      post_id: post.post.id,
    },
    counts: {
      ...TV_COMMENT_VIEW.counts,
      ...config?.commentView?.counts,
      comment_id: id,
    },
  };
}
