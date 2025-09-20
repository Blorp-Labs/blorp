import { usePostsStore } from "@/src/stores/posts";
import { useLinkContext } from "../../routing/link-context";
import { useSettingsStore } from "@/src/stores/settings";
import { getPostEmbed } from "@/src/lib/post";
import { encodeApId } from "@/src/lib/api/utils";
import { Link } from "@/src/routing/index";
import { PostArticleEmbed, PostArticleMiniEmbed } from "./post-article-embed";
import { PostActionButtion, PostByline } from "./post-byline";
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
import { useMedia } from "@/src/lib/hooks";
import { useFlairs } from "@/src/stores/flairs";
import { Flair } from "../flair";

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
  const postCardStyle = useSettingsStore((s) => s.postCardStyle);

  if (props.detailView || postCardStyle === "large") {
    return <LargePostCardSkeleton />;
  }

  return <SmallPostCardSkeleton />;
}

function LargePostCardSkeleton(props: {
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

function SmallPostCardSkeleton(props: {
  hideImage?: boolean;
  detailView?: boolean;
}) {
  const hideImage = useRef(Math.random()).current < 0.1;
  return (
    <div>
      <div className="flex-1 gap-2.5 flex overflow-x-hidden md:py-2">
        {(!hideImage || props.hideImage === false) && (
          <Skeleton className="h-32 w-32 md:h-36 md:w-40 rounded-none md:rounded-md shrink-0" />
        )}

        <div className="flex-1 flex flex-col gap-1.5 overflow-y-hidden">
          <div className="flex flex-row items-center gap-2 h-6">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>

          <Skeleton className="h-7" />

          <div className="flex-1" />

          <div className="flex flex-row justify-end gap-2">
            <Skeleton className="h-7 w-10 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <Separator className="max-md:-mx-3.5 w-auto!" />
    </div>
  );
}

export function StickyPostHeader({
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

function LargePostCard({
  post,
  detailView,
  featuredContext,
  pinned,
  modApIds,
  apId,
}: {
  post?: Schemas.Post;
  detailView?: boolean;
  featuredContext: PostProps["featuredContext"];
  pinned: boolean;
  modApIds?: string[];
  apId: string;
}) {
  const blurNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true;

  const myApId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.apId,
  );

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const [imageStatus, setImageStatus] = useState<
    "loading" | "error" | "success"
  >("loading");

  const [removeBlur, setRemoveBlur] = useState(false);

  const linkCtx = useLinkContext();

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);

  const flairs = useFlairs(post?.flairs?.map((f) => f.id));

  const patchPost = usePostsStore((s) => s.patchPost);

  const doubeTapLike = useDoubleTapPostLike(
    post
      ? {
          postId: post.id,
          postApId: apId,
          score: 1,
        }
      : undefined,
  );

  const id = useId();

  if (!post) {
    return <PostCardSkeleton />;
  }

  let displayUrl = post.url;
  if (displayUrl) {
    const parsedUrl = new URL(displayUrl);
    displayUrl = `${parsedUrl.host.replace(/^www\./, "")}${parsedUrl.pathname.replace(/\/$/, "")}`;
  }

  const encodedApId = encodeApId(apId);
  const embed = post ? getPostEmbed(post) : null;

  const showImage =
    embed?.type === "image" && !post.deleted && imageStatus !== "error";
  const showArticle = embed?.type === "article" && !post?.deleted;
  const blurImg = post.nsfw && !removeBlur ? blurNsfw : false;

  const titleId = `${id}-title`;
  const bodyId = `${id}-title`;

  return (
    <article
      data-testid="post-card"
      className={cn(
        "flex-1 py-4 gap-2 flex flex-col max-md:px-3.5 overflow-x-hidden",
        detailView ? "max-md:bg-background" : "border-b",
      )}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <PostByline
        post={post}
        pinned={pinned}
        showCreator={
          (featuredContext !== "user" && featuredContext !== "search") ||
          detailView
        }
        showCommunity={
          featuredContext === "home" ||
          featuredContext === "user" ||
          featuredContext === "search"
            ? true
            : detailView
        }
        canMod={myApId ? modApIds?.includes(myApId) : false}
        isMod={modApIds?.includes(post.creatorApId)}
      />

      {detailView && post.crossPosts && post.crossPosts.length > 0 && (
        <CrossPosts key={apId} crossPosts={post.crossPosts} />
      )}

      {flairs && flairs.length > 0 && (
        <div className="flex flex-row">
          {flairs.map((flair, index) => (
            <Flair key={flair?.data.id ?? index} flair={flair.data} />
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
        disable={detailView}
      >
        <span
          className={twMerge(
            "text-xl font-medium",
            !detailView && post.read && "text-muted-foreground",
          )}
          id={titleId}
        >
          {post.deleted ? "deleted" : post.title}
        </span>
        {!detailView &&
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
            featuredContext === "home"
              ? "/home/lightbox"
              : `${linkCtx.root}c/:communityName/lightbox`
          }
          params={{
            communityName: post.communitySlug,
          }}
          searchParams={`?apId=${encodeApId(apId)}`}
          className="max-md:-mx-3.5 flex flex-col relative overflow-hidden"
          onClick={() => {
            if (!removeBlur && detailView) {
              setRemoveBlur(true);
            }
          }}
        >
          {imageStatus === "loading" && (
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
              setImageStatus("success");
              if (!post.thumbnailAspectRatio) {
                patchPost(apId, getCachePrefixer(), {
                  thumbnailAspectRatio,
                });
              }
            }}
            onError={() => setImageStatus("error")}
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
          url={showArticle ? embed.embedUrl : undefined}
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
          autoPlay={detailView}
          blurNsfw={blurImg}
        />
      )}
      {embed?.type === "youtube" && !post.deleted && (
        <YouTubeVideoEmbed url={embed.embedUrl} />
      )}

      {detailView && post.body && !post.deleted && (
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
        <PostShareButton postApId={apId} />
        <div className="flex-1" />
        <PostCommentsButton postApId={apId} />
        <PostVoting apId={apId} />
      </div>
    </article>
  );
}

function SmallPostCard({
  post,
  detailView,
  featuredContext,
  pinned,
  modApIds,
  apId,
}: {
  post?: Schemas.Post;
  detailView?: boolean;
  featuredContext: PostProps["featuredContext"];
  pinned: boolean;
  modApIds?: string[];
  apId: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const blurNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true;

  const myApId = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.me?.apId,
  );

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);

  const linkCtx = useLinkContext();

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);

  const flairs = useFlairs(post?.flairs?.map((f) => f.id));

  const patchPost = usePostsStore((s) => s.patchPost);

  const id = useId();

  const media = useMedia();

  if (!post) {
    return <SmallPostCardSkeleton />;
  }

  const encodedApId = encodeApId(apId);
  const embed = post ? getPostEmbed(post) : null;

  const showImage =
    embed?.thumbnail && !post.deleted && embed.type !== "article";
  const showArticle = !post.deleted && embed?.type === "article";
  const blurImg = post.nsfw && blurNsfw;

  const titleId = `${id}-title`;
  const bodyId = `${id}-title`;

  const canMod = myApId ? modApIds?.includes(myApId) : false;

  return (
    <article
      data-testid="post-card"
      className={cn(
        "flex-1 gap-2.5 flex overflow-x-hidden md:py-2",
        detailView ? "max-md:bg-background" : "border-b",
      )}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {embed?.thumbnail && showImage && (
        <Link
          to={
            featuredContext === "home"
              ? "/home/lightbox"
              : `${linkCtx.root}c/:communityName/lightbox`
          }
          params={{
            communityName: post.communitySlug,
          }}
          searchParams={`?apId=${encodeApId(apId)}`}
          className="relative"
        >
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 md:rounded-md" />
          )}
          <ProgressiveImage
            lowSrc={embed?.thumbnail}
            highSrc={embed?.fullResThumbnail}
            className={cn(
              "h-32 w-32 md:h-36 md:w-40 md:rounded-md shrink-0",
              blurImg && "blur-3xl",
            )}
            onAspectRatio={(thumbnailAspectRatio) => {
              setImageLoaded(true);
              if (!post.thumbnailAspectRatio) {
                patchPost(apId, getCachePrefixer(), {
                  thumbnailAspectRatio,
                });
              }
            }}
          />
        </Link>
      )}
      {showArticle && (
        <PostArticleMiniEmbed
          url={embed.embedUrl}
          thumbnail={embed.thumbnail}
          blurNsfw={blurImg ?? false}
          className="h-32 w-32 md:h-36 md:w-40 md:rounded-md shrink-0"
        />
      )}

      <div
        className={cn(
          "flex-1 flex flex-col gap-1 overflow-hidden max-md:py-2 max-md:pr-3.5",
          !showImage && !showArticle && "max-md:pl-3.5",
        )}
      >
        <PostByline
          post={post}
          pinned={pinned}
          showCreator={
            (featuredContext !== "user" &&
              featuredContext !== "search" &&
              featuredContext !== "home") ||
            detailView
          }
          showCommunity={
            featuredContext === "home" ||
            featuredContext === "user" ||
            featuredContext === "search"
              ? true
              : detailView
          }
          canMod={canMod}
          isMod={modApIds?.includes(post.creatorApId)}
          showActions={media.md}
        />

        {flairs && flairs.length > 0 && (
          <div className="flex flex-row">
            {flairs.map((flair, index) => (
              <Flair
                key={flair?.data.id ?? index}
                flair={flair.data}
                size="sm"
              />
            ))}
          </div>
        )}

        <Link
          id={titleId}
          to={`${linkCtx.root}c/:communityName/posts/:post`}
          params={{
            communityName: post.communitySlug,
            post: encodedApId,
          }}
          className={cn(
            "gap-2 flex flex-col flex-1 font-medium max-md:text-sm",
            !detailView && post.read && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "line-clamp-2 md:line-clamp-3",
              flairs && flairs.length > 0 && "line-clamp-1 md:line-clamp-2",
            )}
          >
            {post.deleted ? "deleted" : post.title}
          </span>
        </Link>

        <div
          className={cn(
            "flex items-center justify-end gap-2.5",
            leftHandedMode && "flex-row-reverse",
          )}
        >
          {media.maxMd && <PostActionButtion post={post} canMod={canMod} />}
          <PostCommentsButton postApId={apId} />
          <PostVoting apId={apId} />
        </div>
      </div>
    </article>
  );
}

export function PostCard(props: PostProps) {
  const showNsfw =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.showNsfw) ?? false;

  const postCardStyle = useSettingsStore((s) => s.postCardStyle);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore(
    (s) => s.posts[getCachePrefixer()(props.apId)]?.data,
  );

  const featuredCommunity =
    post?.optimisticFeaturedCommunity ?? post?.featuredCommunity ?? false;
  const featuredLocal =
    post?.optimisticFeaturedLocal ?? post?.featuredLocal ?? false;
  const pinned =
    props.featuredContext === "community"
      ? featuredCommunity
      : props.featuredContext === "home"
        ? featuredLocal
        : false;

  const filterKeywords = useSettingsStore((s) => s.filterKeywords);

  for (const keyword of filterKeywords) {
    if (post?.title.toLowerCase().includes(keyword.toLowerCase())) {
      return props.detailView ? (
        <Notice>Hidden due to keyword filter "{keyword}"</Notice>
      ) : null;
    }
  }

  if (post?.nsfw === true && !showNsfw) {
    return props.detailView ? <Notice>Hidden due to NSFW</Notice> : null;
  }

  if (props.detailView || postCardStyle === "large") {
    return (
      <LargePostCard
        post={post}
        detailView={props.detailView}
        featuredContext={props.featuredContext}
        pinned={pinned}
        modApIds={props.modApIds}
        apId={props.apId}
      />
    );
  }

  return (
    <SmallPostCard
      post={post}
      detailView={props.detailView}
      featuredContext={props.featuredContext}
      pinned={pinned}
      modApIds={props.modApIds}
      apId={props.apId}
    />
  );
}
