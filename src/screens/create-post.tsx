import { ContentGutters } from "../components/gutters";
import { useRecentCommunitiesStore } from "../stores/recent-communities";
import { useCallback, useEffect, useId, useState } from "react";
import { Draft, NEW_DRAFT, useCreatePostStore } from "../stores/create-post";
import { VirtualList } from "@/src/components/virtual-list";
import { CommunityCard } from "../components/communities/community-card";
import {
  useCreatePost,
  useEditPost,
  useListCommunities,
  useSearch,
  useUploadImage,
} from "../lib/lemmy";
import _ from "lodash";
import { Community } from "lemmy-js-client";
import { parseOgData } from "../lib/html-parsing";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { MarkdownEditor } from "../components/markdown/editor";
import { Button } from "../components/ui/button";
import { close } from "ionicons/icons";
import { FaCheck, FaChevronDown } from "react-icons/fa6";
import { LuLoaderCircle } from "react-icons/lu";
import { Input } from "../components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/src/components/ui/toggle-group";
import { useDropzone } from "react-dropzone";
import { UserDropdown } from "../components/nav";
import { Skeleton } from "../components/ui/skeleton";
import { FaRegImage } from "react-icons/fa6";
import { Label } from "@/src/components/ui/label";
import { cn } from "../lib/utils";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { Link } from "@/src/routing/index";
import { v4 as uuid } from "uuid";
import { MdDelete } from "react-icons/md";
import { useMedia, useUrlSearchState } from "../lib/hooks";
import { createSlug } from "../lib/lemmy/utils";
import { RelativeTime } from "../components/relative-time";
import { Deferred } from "../lib/deferred";
import z from "zod";
import { usePostsStore } from "../stores/posts";
import { getAccountActorId, useAuth } from "../stores/auth";

dayjs.extend(localizedFormat);

const EMPTY_ARR: never[] = [];

function DraftsSidebar({
  createPostId,
  onClickDraft,
}: {
  createPostId: string;
  onClickDraft: () => void;
}) {
  const [alrt] = useIonAlert();
  const drafts = useCreatePostStore((s) => s.drafts);
  const deleteDraft = useCreatePostStore((s) => s.deleteDraft);
  return (
    <div className="flex flex-col gap-3 py-6">
      <div className="flex flex-row justify-between items-center">
        <h2 className="font-bold">Drafts</h2>
        <Button size="sm" variant="ghost" asChild>
          <Link
            to="/create"
            searchParams={`?id=${uuid()}`}
            onClick={onClickDraft}
          >
            New
          </Link>
        </Button>
      </div>
      {_.entries(drafts)
        .sort(([_a, a], [_b, b]) => b.createdAt - a.createdAt)
        .map(([key, draft]) => {
          const slug = draft.community
            ? createSlug(draft.community)?.slug
            : undefined;
          return (
            <div key={key} className="relative">
              <Link
                to="/create"
                searchParams={`?id=${key}`}
                className={cn(
                  "bg-muted border px-3 py-2 gap-1 rounded-lg flex flex-col",
                  createPostId === key &&
                    "border-brand border-dashed bg-brand/20",
                )}
                onClickCapture={onClickDraft}
              >
                <div className="text-muted-foreground flex flex-row items-center text-sm gap-1 pr-3.5">
                  <RelativeTime time={draft.createdAt} />
                  {slug && (
                    <>
                      <span>•</span>
                      <span className="flex-1 overflow-hidden text-ellipsis break-words line-clamp-1">
                        {slug}
                      </span>
                    </>
                  )}
                </div>
                <span
                  className={cn(
                    "font-medium line-clamp-1 break-words",
                    !draft.name && "italic",
                  )}
                >
                  {draft.name || "Untitiled"}
                </span>
              </Link>
              <button
                className="absolute top-2 right-2 text-destructive text-xl"
                onClick={async () => {
                  try {
                    const deferred = new Deferred();
                    alrt({
                      message: "Delete draft",
                      buttons: [
                        {
                          text: "Cancel",
                          role: "cancel",
                          handler: () => deferred.reject(),
                        },
                        {
                          text: "OK",
                          role: "confirm",
                          handler: () => deferred.resolve(),
                        },
                      ],
                    });
                    await deferred.promise;
                    deleteDraft(key);
                  } catch {}
                }}
              >
                <MdDelete />
              </button>
            </div>
          );
        })}
    </div>
  );
}

export function CreatePost() {
  const [showDrafts, setShowDrafts] = useState(false);
  const media = useMedia();
  const [draftIdEncoded] = useUrlSearchState("id", uuid(), z.string());
  const draftId = decodeURIComponent(draftIdEncoded);
  const id = useId();

  useEffect(() => {
    if (media.md) {
      setShowDrafts(false);
    }
  }, [media.md]);

  const numDrafts = useCreatePostStore((s) => Object.keys(s.drafts).length);
  const draft = useCreatePostStore((s) => s.drafts[draftId]) ?? NEW_DRAFT;
  const isEdit = !!draft.apId;
  const patchDraft = useCreatePostStore((s) => s.updateDraft);
  const deleteDraft = useCreatePostStore((s) => s.deleteDraft);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) =>
    draft.apId ? s.posts[getCachePrefixer()(draft.apId)] : undefined,
  );
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const canEdit =
    isEdit &&
    post?.data.creator.actor_id &&
    myUserId === post.data.creator.actor_id;
  const postOwner = post?.data.creator
    ? createSlug(post.data.creator)?.slug
    : undefined;

  const uploadImage = useUploadImage();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (files) => {
      if (files[0]) {
        uploadImage
          .mutateAsync({ image: files[0] })
          .then((res) => {
            patchDraft(draftId, {
              custom_thumbnail: res.url,
            });
          })
          .catch((err) => console.log(err));
      }
    },
  });

  const [chooseCommunity, setChooseCommunity] = useState(false);

  const createPost = useCreatePost();
  const editPost = useEditPost(draftId);

  const parseUrl = (url: string) => {
    if (url) {
      try {
        fetch(url)
          .then((res) => res.text())
          .then((body) => {
            const ogData = parseOgData(body);
            const patch: Partial<Draft> = {};
            if (!draft.name && ogData.title) {
              patch.name = ogData.title;
            }
            if (ogData.image) {
              patch.custom_thumbnail = ogData.image;
            }
            patchDraft(draftId, patch);
          });
      } catch {}
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start" className="md:gap-4.5 gap-3.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowDrafts((s) => !s)}
              className="md:hidden"
            >
              {showDrafts
                ? "Back"
                : `Drafts${numDrafts > 0 ? ` (${numDrafts})` : ""}`}
            </Button>
          </IonButtons>

          <IonTitle>{isEdit ? "Edit" : "Create"} post</IonTitle>

          <IonButtons slot="end" className="md:gap-4.5 gap-3.5">
            <Button
              size="sm"
              className={cn(showDrafts && "max-md:hidden")}
              onClick={() => {
                try {
                  if (draft.community) {
                    if (isEdit) {
                      editPost
                        .mutateAsync(draft)
                        .then(() => deleteDraft(draftId));
                    } else {
                      createPost
                        .mutateAsync(draft)
                        .then(() => deleteDraft(draftId));
                    }
                  }
                } catch {
                  // TODO: handle incomplete post data
                }
              }}
              disabled={!draft.community || (isEdit && !canEdit)}
            >
              {isEdit ? "Update" : "Post"}
              {createPost.isPending && (
                <LuLoaderCircle className="animate-spin" />
              )}
            </Button>
            <UserDropdown />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ChooseCommunity
          createPostId={draftId}
          isOpen={chooseCommunity && !isEdit}
          closeModal={() => setChooseCommunity(false)}
        />

        <ContentGutters className="max-md:h-full">
          {media.maxMd && showDrafts ? (
            <DraftsSidebar
              createPostId={draftId}
              onClickDraft={() => setShowDrafts(false)}
            />
          ) : (
            <div className="flex flex-col gap-4 md:gap-5 max-md:pt-3 md:py-6">
              {isEdit && !canEdit && (
                <span className="bg-amber-500/30 text-amber-500 py-2 px-3 rounded-lg">
                  {postOwner
                    ? `Switch to ${postOwner} to make edits.`
                    : "You cannot edit this post because it doesn't belong to the selected account."}
                </span>
              )}

              <button
                onClick={() => setChooseCommunity(true)}
                className="flex flex-row items-center gap-2 h-9 self-start"
                disabled={isEdit}
              >
                {draft.community ? (
                  <CommunityCard communityView={draft.community} disableLink />
                ) : (
                  <span className="font-bold">Select a community</span>
                )}
                {!isEdit && <FaChevronDown className="text-brand" />}
              </button>

              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={draft.type}
                onValueChange={(val) => {
                  if (val) {
                    patchDraft(draftId, {
                      type: val as "text" | "media" | "link",
                    });
                  }
                }}
              >
                <ToggleGroupItem value="text">Text</ToggleGroupItem>
                <ToggleGroupItem value="media">Image</ToggleGroupItem>
                <ToggleGroupItem value="link">Link</ToggleGroupItem>
              </ToggleGroup>

              {draft.type === "link" && (
                <div className="gap-2 flex flex-col">
                  <Label htmlFor={`${id}-link`}>Link</Label>
                  <Input
                    id={`${id}-link`}
                    placeholder="Link"
                    className="border-b border-border"
                    value={draft.url ?? ""}
                    onChange={(e) =>
                      patchDraft(draftId, { url: e.target.value })
                    }
                    onBlur={() => draft.url && parseUrl(draft.url)}
                  />
                </div>
              )}

              {draft.type === "media" && (
                <div className="gap-2 flex flex-col">
                  <Label htmlFor={`${id}-media`}>Image</Label>
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed flex flex-col items-center justify-center gap-2 p-2 cursor-pointer rounded-md md:min-h-32"
                  >
                    <input id={`${id}-media`} {...getInputProps()} />
                    {draft.custom_thumbnail && !uploadImage.isPending && (
                      <img
                        src={draft.custom_thumbnail}
                        className="h-40 rounded-md"
                      />
                    )}
                    {uploadImage.isPending && (
                      <Skeleton className="h-40 aspect-square flex items-center justify-center">
                        <FaRegImage className="text-muted-foreground text-4xl" />
                      </Skeleton>
                    )}
                    {isDragActive ? (
                      <p>Drop the files here ...</p>
                    ) : (
                      <p className="text-muted-foreground">
                        Drop or upload image here
                        {draft.custom_thumbnail && " to replace"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="gap-2 flex flex-col">
                <Label htmlFor={`${id}-title`}>Title</Label>
                <Input
                  id={`${id}-title`}
                  placeholder="Title"
                  value={draft.name ?? ""}
                  onInput={(e) =>
                    patchDraft(draftId, {
                      name: e.currentTarget.value ?? "",
                    })
                  }
                />
              </div>

              <div className="gap-2 flex flex-col flex-1">
                <Label htmlFor={`${id}-body`}>Body</Label>
                <MarkdownEditor
                  id={`${id}-body`}
                  content={draft.body ?? ""}
                  onChange={(body) =>
                    patchDraft(draftId, {
                      body,
                    })
                  }
                  className="md:border md:rounded-lg shadow-xs max-md:-mx-3 max-md:flex-1"
                  placeholder="Write something..."
                />
              </div>
            </div>
          )}

          <div className="h-[calc(100vh-60px)] overflow-auto">
            <DraftsSidebar
              createPostId={draftId}
              onClickDraft={() => setShowDrafts(false)}
            />
          </div>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}

function ChooseCommunity({
  createPostId,
  isOpen,
  closeModal,
}: {
  createPostId: string;
  isOpen: boolean;
  closeModal: () => void;
}) {
  const recentCommunities = useRecentCommunitiesStore();

  const [search, setSearch] = useState("");
  const debouncedSetSearch = useCallback(_.debounce(setSearch, 500), []);

  const draft = useCreatePostStore((s) => s.drafts[createPostId]) ?? NEW_DRAFT;
  const patchDraft = useCreatePostStore((s) => s.updateDraft);

  const subscribedCommunitiesRes = useListCommunities({
    type_: "Subscribed",
    limit: 50,
  });
  const subscribedCommunities =
    subscribedCommunitiesRes.data?.pages
      .flatMap((p) => p.communities)
      .sort((a, b) => a.community.name.localeCompare(b.community.name))
      .map(({ community }) => community) ?? EMPTY_ARR;

  const searchResultsRes = useSearch({
    q: search,
    type_: "Communities",
    sort: "TopAll",
  });

  const searchResultsCommunities =
    searchResultsRes.data?.pages.flatMap((p) =>
      p.communities.map(({ community }) => community),
    ) ?? EMPTY_ARR;

  let data: (
    | Pick<Community, "name" | "title" | "icon" | "actor_id">
    | "Selected"
    | "Recent"
    | "Subscribed"
    | "Search results"
  )[] = [
    "Recent",
    ...recentCommunities.recentlyVisited.slice(0, 5),
    "Subscribed",
    ...subscribedCommunities,
  ];

  if (search) {
    data = ["Search results", ...searchResultsCommunities];
  }
  if (draft.community) {
    data = ["Selected", draft.community, ...data];
  }

  data = _.uniqBy(data, (item) => {
    if (typeof item === "string") {
      return item;
    }
    return item.actor_id;
  });

  return (
    <IonModal isOpen={isOpen} onWillDismiss={closeModal}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={closeModal}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>

          <IonTitle>Choose Community</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        <VirtualList
          className="h-full"
          data={data}
          stickyHeaderIndices={[0]}
          header={[
            <ContentGutters className="bg-background" key="header-search">
              <div className="border-b-[.5px] py-2">
                <Input
                  placeholder="Search communities"
                  defaultValue={search}
                  onChange={(e) => debouncedSetSearch(e.target.value)}
                />
              </div>
            </ContentGutters>,
          ]}
          renderItem={({ item }) => {
            if (typeof item === "string") {
              return (
                <ContentGutters className="py-2">
                  <span className="text-muted-foreground text-sm">{item}</span>
                </ContentGutters>
              );
            }

            return (
              <ContentGutters className="cursor-pointer">
                <button
                  onClick={() => {
                    patchDraft(createPostId, {
                      community: item,
                    });
                    closeModal();
                  }}
                  className="flex flex-row items-center gap-2"
                  disabled={!!draft.apId}
                >
                  <CommunityCard communityView={item} disableLink />
                  {draft.community &&
                    item.actor_id === draft.community?.actor_id && (
                      <FaCheck className="text-brand" />
                    )}
                </button>
              </ContentGutters>
            );
          }}
          estimatedItemSize={50}
        />
      </IonContent>
    </IonModal>
  );
}
