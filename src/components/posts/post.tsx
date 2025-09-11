import { usePostsStore } from "@/src/stores/posts";
import { useLinkContext } from "../../routing/link-context";
import { useSettingsStore } from "@/src/stores/settings";
import { getPostEmbed } from "@/src/lib/post";
import { encodeApId } from "@/src/lib/api/utils";
import { Link } from "@/src/routing/index";
import { PostArticleEmbed } from "./post-article-embed";
import { PostByline } from "./post-byline";
import {
  PostCommentsButton,
  PostShareButton,
  PostVoting,
  useDoubleTapPostLike,
} from "./post-buttons";
import { MarkdownRenderer } from "../markdown/renderer";
import { twMerge } from "tailwind-merge";
import { PostLoopsEmbed } from "./post-loops-embed";
import { YouTubeVideoEmbed } from "../youtube";
import { PostVideoEmbed } from "./embeds/post-video-embed";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { useId, useRef, useState } from "react";
import _ from "lodash";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import removeMd from "remove-markdown";
import { LuRepeat2 } from "react-icons/lu";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { Separator } from "../ui/separator";
import { SpotifyEmbed } from "./embeds/post-spotify-embed";
import { SoundCloudEmbed } from "./embeds/soundcloud-embed";
import { PeerTubeEmbed } from "./embeds/peertube-embed";
import { IFramePostEmbed } from "./embeds/generic-video-embed";
import { ProgressiveImage } from "../progressive-image";
import { useFlairs } from "@/src/stores/flairs";
import { Badge } from "../ui/badge";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <i className="text-muted-foreground text-sm py-3 md:pt-6 max-md:px-3.5">
      {children}
    </i>
  );
}

export interface PostProps {
  apId: string;
  detailView?: boolean;
  featuredContext?: "community" | "home" | "user" | "search";
  modApIds?: string[];
}

export function PostCardSkeleton(props: {
  hideImage?: boolean;
  detailView?: boolean;
}) {
  const hideImage = useRef(Math.random()).current < 0.4;
  return (
    <div
      className={cn(
        "flex-1 pt-4 gap-2 flex flex-col max-md:px-3.5 pb-4",
        props.detailView && "bg-background",
      )}
    >
      {props.detailView ? (
        <div className="flex flex-row items-center gap-2 h-9">
          <Skeleton className="h-8 w-8 rounded-full" />

          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-2.5 w-44" />
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2 h-6">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      )}

      <Skeleton className="h-7" />

      {(!hideImage || props.hideImage === false) && (
        <Skeleton className="aspect-video max-md:-mx-3.5 max-md:rounded-none" />
      )}

      <div className="flex flex-row justify-end gap-2">
        <Skeleton className="h-7 w-10 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      <Separator className="max-md:-mx-3.5 w-auto!" />
    </div>
  );
}

export function FeedPostCard(props: PostProps) {
  const id = useId();

  const showNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.showNsfw) ?? false;
  const blurNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true;
  const myApId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.apId,
  );

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore(
    (s) => s.posts[getCachePrefixer()(props.apId)]?.data,
  );

  const [imageLoaded, setImageLoaded] = useState(false);

  const [removeBlur, setRemoveBlur] = useState(false);

  const linkCtx = useLinkContext();

  const filterKeywords = useSettingsStore((s) => s.filterKeywords);

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);

  const flairs = useFlairs(post?.flairs?.map((f) => f.id));

  const patchPost = usePostsStore((s) => s.patchPost);

  const doubeTapLike = useDoubleTapPostLike(
    post
      ? {
          postId: post.id,
          postApId: post.apId,
          score: 1,
        }
      : undefined,
  );

  if (post?.nsfw === true && !showNsfw) {
    return props.detailView ? <Notice>Hidden due to NSFW</Notice> : null;
  }

  if (!post) {
    return <PostCardSkeleton />;
  }

  let displayUrl = post.url;
  if (displayUrl) {
    const parsedUrl = new URL(displayUrl);
    displayUrl = `${parsedUrl.host.replace(/^www\./, "")}${parsedUrl.pathname.replace(/\/$/, "")}`;
  }

  const embed = post ? getPostEmbed(post) : null;

  const showImage = embed?.type === "image" && !post.deleted;
  const showArticle = embed?.type === "article" && !post?.deleted;
  const blurImg = post.nsfw && !removeBlur ? blurNsfw : false;

  const encodedApId = encodeApId(post.apId);

  const featuredCommunity =
    post.optimisticFeaturedCommunity ?? post.featuredCommunity;
  const featuredLocal = post.optimisticFeaturedLocal ?? post.featuredLocal;
  const pinned =
    props.featuredContext === "community"
      ? featuredCommunity
      : props.featuredContext === "home"
        ? featuredLocal
        : false;

  for (const keyword of filterKeywords) {
    if (post?.title.toLowerCase().includes(keyword.toLowerCase())) {
      return props.detailView ? (
        <Notice>Hidden due to keyword filter "{keyword}"</Notice>
      ) : null;
    }
  }

  const titleId = `${id}-title`;
  const bodyId = `${id}-title`;

  return (
    <article
      data-testid="post-card"
      className={cn(
        "flex-1 py-4 gap-2 flex flex-col max-md:px-3.5 overflow-x-hidden",
        props.detailView ? "max-md:bg-background" : "border-b",
      )}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <PostByline
        post={post}
        pinned={pinned}
        showCreator={
          (props.featuredContext !== "user" &&
            props.featuredContext !== "search") ||
          props.detailView
        }
        showCommunity={
          props.featuredContext === "home" ||
          props.featuredContext === "user" ||
          props.featuredContext === "search"
            ? true
            : props.detailView
        }
        canMod={myApId ? props.modApIds?.includes(myApId) : false}
        isMod={props.modApIds?.includes(post.creatorApId)}
      />

      {props.detailView && post.crossPosts && post.crossPosts.length > 0 && (
        <CrossPosts key={post.apId} crossPosts={post.crossPosts} />
      )}

      {flairs && flairs.length > 0 && (
        <div className="flex flex-row">
          {flairs.map((flair, index) => (
            <Badge
              key={flair?.data.id ?? index}
              variant="brand"
              className="rounded-full"
            >
              {flair?.data.title}
            </Badge>
          ))}
        </div>
      )}

      <Link
        to={`${linkCtx.root}c/:communityName/posts/:post`}
        params={{
          communityName: post.communitySlug,
          post: encodedApId,
        }}
        className="gap-2 flex flex-col"
      >
        <span
          className={twMerge(
            "text-xl font-medium",
            !props.detailView && post.read && "text-muted-foreground",
          )}
          id={titleId}
        >
          {post.deleted ? "deleted" : post.title}
        </span>

        {!props.detailView &&
          post.body &&
          !post.deleted &&
          embed?.type === "text" && (
            <p
              className={cn(
                "text-sm line-clamp-3 leading-relaxed",
                post.read && "text-muted-foreground",
              )}
              id={bodyId}
            >
              {removeMd(post.body)}
            </p>
          )}
      </Link>

      {showImage && embed.thumbnail && (
        <Link
          to={
            props.featuredContext === "home"
              ? "/home/lightbox"
              : `${linkCtx.root}c/:communityName/lightbox`
          }
          params={{
            communityName: post.communitySlug,
          }}
          searchParams={`?apId=${encodeApId(post.apId)}`}
          className="max-md:-mx-3.5 flex flex-col relative overflow-hidden"
          onClick={() => {
            if (!removeBlur && props.detailView) {
              setRemoveBlur(true);
            }
          }}
        >
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 rounded-none md:rounded-lg" />
          )}
          <ProgressiveImage
            lowSrc={embed.thumbnail}
            highSrc={embed.fullResThumbnail}
            className={cn(
              "md:rounded-lg object-cover relative",
              blurImg && "blur-3xl",
            )}
            onAspectRatio={(thumbnailAspectRatio) => {
              setImageLoaded(true);
              if (!post.thumbnailAspectRatio) {
                patchPost(post.apId, getCachePrefixer(), {
                  thumbnailAspectRatio,
                });
              }
            }}
            aspectRatio={post.thumbnailAspectRatio ?? undefined}
            alt={post.altText}
          />
          {blurImg && !removeBlur && (
            <div className="absolute top-1/2 inset-x-0 text-center z-0 font-bold text-xl">
              NSFW
            </div>
          )}
        </Link>
      )}

      {showArticle && (
        <PostArticleEmbed
          name={post.title}
          url={showArticle ? embed.embedUrl : undefined}
          displayUrl={showArticle ? displayUrl : undefined}
          thumbnail={showArticle ? embed.thumbnail : null}
          blurNsfw={blurImg}
        />
      )}

      {embed?.type === "generic-video" && !post.deleted && embed.embedUrl && (
        <IFramePostEmbed embedVideoUrl={embed.embedUrl} />
      )}
      {embed?.type === "peertube" && !post.deleted && embed.embedUrl && (
        <PeerTubeEmbed url={embed.embedUrl} />
      )}
      {embed?.type === "soundcloud" && !post.deleted && embed.embedUrl && (
        <SoundCloudEmbed url={embed.embedUrl} />
      )}
      {embed?.type === "spotify" && !post.deleted && embed.embedUrl && (
        <SpotifyEmbed url={embed.embedUrl} />
      )}
      {embed?.type &&
        PostVideoEmbed.embedTypes.includes(embed?.type) &&
        !post.deleted &&
        embed.embedUrl && (
          <PostVideoEmbed url={embed.embedUrl} blurNsfw={blurImg} />
        )}
      {embed?.type === "loops" && !post.deleted && embed.embedUrl && (
        <PostLoopsEmbed
          url={embed.embedUrl}
          thumbnail={embed.thumbnail}
          autoPlay={props.detailView}
          blurNsfw={blurImg}
        />
      )}
      {embed?.type === "youtube" && !post.deleted && (
        <YouTubeVideoEmbed url={embed.embedUrl} />
      )}

      {props.detailView && post.body && !post.deleted && (
        <div className="flex-1" {...doubeTapLike}>
          <MarkdownRenderer markdown={post.body} className="pt-2" id={bodyId} />
        </div>
      )}
      <div
        className={cn(
          "flex flex-row items-center justify-end gap-2.5 pt-1",
          leftHandedMode && "flex-row-reverse",
        )}
      >
        <PostShareButton postApId={props.apId} />
        <div className="flex-1" />
        <PostCommentsButton postApId={post.apId} />
        <PostVoting apId={post.apId} />
      </div>
    </article>
  );
}

export function PostBottomBar({
  apId,
}: {
  apId: string;
  commentsCount: number;
  onReply: () => void;
}) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const postView = usePostsStore(
    (s) => s.posts[getCachePrefixer()(apId)]?.data,
  );

  if (!postView) {
    return null;
  }
  return (
    <div
      className={cn(
        "md:hidden flex flex-row gap-3 bg-background border-b dark:border-t-[.5px] max-md:border-b-[.5px] opacity-0 [[data-is-sticky-header=true]_&]:opacity-100 max-md: max-md:px-3.5 absolute top-0 inset-x-0 transition-opacity",
        postView.thumbnailUrl && "max-md:pr-0",
      )}
    >
      <div className="flex-1 my-2 font-semibold line-clamp-2 text-sm overflow-hidden">
        {postView.title}
      </div>
      {postView.thumbnailUrl && (
        <img
          src={postView.thumbnailUrl}
          className="w-[58px] aspect-square object-cover"
        />
      )}
    </div>
  );
}

function CrossPosts({
  crossPosts,
}: {
  crossPosts: Schemas.Post["crossPosts"];
}) {
  const linkCtx = useLinkContext();
  return (
    <span className="text-brand text-sm flex flex-row items-center gap-x-2 gap-y-1 flex-wrap">
      <LuRepeat2 />
      {crossPosts?.map(({ apId, communitySlug }) => (
        <Link
          key={apId}
          to={`${linkCtx.root}c/:communityName/posts/:post`}
          params={{
            post: encodeApId(apId),
            communityName: communitySlug,
          }}
          className="hover:underline line-clamp-1"
        >
          {communitySlug}
        </Link>
      ))}
    </span>
  );
}
