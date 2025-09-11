import { ContentGutters } from "../components/gutters";
import { useRecentCommunitiesStore } from "../stores/recent-communities";
import { useCallback, useEffect, useId, useState } from "react";
import {
  Draft,
  isEmptyDraft,
  NEW_DRAFT,
  useCreatePostStore,
  useFlairLookup,
} from "../stores/create-post";
import { VirtualList } from "@/src/components/virtual-list";
import { CommunityCard } from "../components/communities/community-card";
import {
  useCommunity,
  useCreatePost,
  useEditPost,
  useListCommunities,
  useSearch,
  useUploadImage,
} from "../lib/api";
import _ from "lodash";
import { parseOgData } from "../lib/html-parsing";
import {
  IonButton,
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
import { cn, isNotNil } from "../lib/utils";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { Link } from "@/src/routing/index";
import { v4 as uuid } from "uuid";
import { MdDelete } from "react-icons/md";
import { useMedia, useUrlSearchState } from "../lib/hooks";
import { RelativeTime } from "../components/relative-time";
import { Deferred } from "../lib/deferred";
import z from "zod";
import { usePostsStore } from "../stores/posts";
import { getAccountActorId, useAuth } from "../stores/auth";
import { usePathname } from "../routing/hooks";
import { Sidebar, SidebarContent } from "../components/sidebar";
import { useCommunitiesStore } from "../stores/communities";
import LoginRequired from "./login-required";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { MultiSelect } from "../components/ui/multi-select";
import { Badge } from "../components/ui/badge";
import { Flair } from "../components/flair";

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-row justify-between items-center">
        <h2 className="font-bold">Drafts</h2>
        <Button size="sm" variant="outline" asChild>
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
          const slug = draft.communitySlug;
          return (
            <div key={key} className="relative">
              <Link
                to="/create"
                searchParams={`?id=${key}`}
                className={cn(
                  "bg-background border px-3 py-2 gap-1 rounded-lg flex flex-col",
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
                    !draft.title && "italic",
                  )}
                >
                  {draft.title || "Untitiled"}
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

function useLoadRecentCommunity(draftId: string, draft: Draft) {
  const pathname = usePathname();
  const isActive = pathname === "/create";
  const isEmpty = isEmptyDraft(draft);
  const mostRecentCommunity = useRecentCommunitiesStore(
    (s) => s.recentlyVisited[0],
  );
  const patchDraft = useCreatePostStore((s) => s.updateDraft);
  useEffect(() => {
    if (isActive && isEmpty && mostRecentCommunity) {
      patchDraft(draftId, {
        communitySlug: mostRecentCommunity.slug,
      });
    }
  }, [draftId, isActive, patchDraft, isEmpty, mostRecentCommunity]);
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

  useLoadRecentCommunity(draftId, draft);

  const community = useCommunity({
    name: draft.communitySlug,
  });
  const flairLookup = useFlairLookup(community.data?.flairs);

  const flairs = community.data?.flairs;

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) =>
    draft.apId ? s.posts[getCachePrefixer()(draft.apId)] : undefined,
  );
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const canEdit =
    isEdit && post?.data.creatorApId && myUserId === post.data.creatorApId;
  const postOwner = post?.data.creatorSlug;

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
              thumbnailUrl: res.url,
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
            if (!draft.title && ogData.title) {
              patch.title = ogData.title;
            }
            if (ogData.image) {
              patch.thumbnailUrl = ogData.image;
            }
            patchDraft(draftId, patch);
          });
      } catch {}
    }
  };

  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  if (!isLoggedIn) {
    return <LoginRequired />;
  }

  const getPostButton = (className: string) => (
    <Button
      size="sm"
      className={className}
      onClick={() => {
        try {
          if (draft.communitySlug) {
            if (isEdit) {
              editPost.mutateAsync(draft).then(() => deleteDraft(draftId));
            } else {
              createPost.mutateAsync(draft).then(() => deleteDraft(draftId));
            }
          }
        } catch {
          // TODO: handle incomplete post data
        }
      }}
      disabled={!draft.communitySlug || (isEdit && !canEdit)}
    >
      {isEdit ? "Update" : "Post"}
      {createPost.isPending && <LuLoaderCircle className="animate-spin" />}
    </Button>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
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
          </ToolbarButtons>

          <IonTitle>{isEdit ? "Edit" : "Create"} post</IonTitle>

          <ToolbarButtons side="right">
            {getPostButton(cn("md:hidden", showDrafts && "max-md:hidden"))}
            <UserDropdown />
          </ToolbarButtons>
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
                {draft.communitySlug ? (
                  <CommunityCard
                    communitySlug={draft.communitySlug}
                    disableLink
                  />
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

              {flairs && flairs.length > 0 && (
                <div className="gap-2 flex flex-col">
                  <Label htmlFor={`${id}-flair`}>Flair</Label>
                  <MultiSelect
                    onChange={(values) => {
                      patchDraft(draftId, {
                        flairs: values,
                      });
                    }}
                    value={
                      draft.flairs
                        ?.map((flair) => flairLookup[flair.apId ?? flair.title])
                        .filter(isNotNil) ?? []
                    }
                    options={
                      flairs.map((flair) => ({
                        label: flair.title,
                        value: flair,
                      })) ?? []
                    }
                    keyExtractor={(val) => val.apId ?? val.title}
                    placeholder="Flair"
                    renderOption={(opt) => <Flair flair={opt.value} />}
                  />
                </div>
              )}

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

              {(draft.type === "media" || draft.type === "link") && (
                <div className="gap-2 flex flex-col">
                  <Label htmlFor={`${id}-media`}>Image</Label>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed flex flex-col items-center justify-center gap-2 p-2 cursor-pointer rounded-md",
                      draft.type === "media" && "md:min-h-32",
                    )}
                  >
                    <input id={`${id}-media`} {...getInputProps()} />
                    {draft.thumbnailUrl && !uploadImage.isPending && (
                      <img
                        src={draft.thumbnailUrl}
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
                        {draft.thumbnailUrl && " to replace"}
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
                  value={draft.title ?? ""}
                  onInput={(e) =>
                    patchDraft(draftId, {
                      title: e.currentTarget.value ?? "",
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
                  className="md:border md:rounded-lg md:shadow-xs max-md:-mx-3.5 max-md:flex-1"
                  placeholder="Write something..."
                />
                {getPostButton("self-end max-md:hidden")}
              </div>
            </div>
          )}

          <Sidebar>
            <SidebarContent className="p-4">
              <DraftsSidebar
                createPostId={draftId}
                onClickDraft={() => setShowDrafts(false)}
              />
            </SidebarContent>
          </Sidebar>
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

  const [searchFocused, setSeachFocused] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSetSearch = useCallback(_.debounce(setSearch, 500), []);

  const draft = useCreatePostStore((s) => s.drafts[createPostId]) ?? NEW_DRAFT;
  const patchDraft = useCreatePostStore((s) => s.updateDraft);

  const subscribedCommunitiesRes = useListCommunities({
    type: "Subscribed",
  });
  const subscribedCommunities =
    subscribedCommunitiesRes.data?.pages
      .flatMap((p) => p.communities)
      .sort((a, b) => a.slug.localeCompare(b.slug)) ?? EMPTY_ARR;

  const searchResultsRes = useSearch({
    q: search,
    type: "Communities",
    sort: "TopAll",
  });

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const selectedCommunity = useCommunitiesStore((s) =>
    draft.communitySlug
      ? s.communities[getCachePrefixer()(draft.communitySlug)]?.data
          .communityView
      : null,
  );

  const searchResultsCommunities =
    searchResultsRes.data?.pages.flatMap((p) =>
      p.communities.map((slug) => ({ slug })),
    ) ?? EMPTY_ARR;

  let data: (
    | { slug: string }
    | "Selected"
    | "Recent"
    | "Subscribed"
    | "Search results"
  )[] = [];

  if (recentCommunities.recentlyVisited.length > 0) {
    data.push("Recent", ...recentCommunities.recentlyVisited.slice(0, 5));
  }

  if (recentCommunities.recentlyVisited.length > 0) {
    data.push("Subscribed", ...subscribedCommunities);
  }

  if (search || searchFocused) {
    data = ["Search results", ...searchResultsCommunities];
  } else if (data.length === 0) {
    // If the list is empty, we should this
    data.push("Search results", ...searchResultsCommunities);
  }

  if (selectedCommunity) {
    data.unshift("Selected", selectedCommunity);
  }

  data = _.uniqBy(data, (item) => {
    if (typeof item === "string") {
      return item;
    }
    return item.slug;
  });

  return (
    <IonModal isOpen={isOpen} onWillDismiss={closeModal}>
      <IonHeader>
        <IonToolbar>
          <ToolbarButtons side="left">
            <IonButton onClick={closeModal}>
              <IonIcon icon={close} />
            </IonButton>
          </ToolbarButtons>

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
                  onFocus={() => setSeachFocused(true)}
                  onBlur={() => setSeachFocused(false)}
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
                      communitySlug: item.slug,
                    });
                    closeModal();
                  }}
                  className="flex flex-row items-center gap-2"
                  disabled={!!draft.apId}
                >
                  <CommunityCard communitySlug={item.slug} disableLink />
                  {draft.communitySlug && item.slug === draft.communitySlug && (
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
