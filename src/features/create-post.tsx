import { ContentGutters } from "../components/gutters";
import { useRecentCommunitiesStore } from "../stores/recent-communities";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  useLinkMetadata,
  useListCommunities,
  useSearch,
  useSoftware,
  useUploadImage,
} from "../lib/api";
import { supportsPollCreation } from "../lib/api/adapters/support";
import { Forms } from "../lib/api/adapters/api-blueprint";
import _ from "lodash";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
import { MarkdownEditor } from "../components/markdown/editor";
import { Button, LoadingButton } from "../components/ui/button";
import { close } from "ionicons/icons";
import { FaCheck, FaChevronDown } from "react-icons/fa6";
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
import {
  useCommunitiesFromStore,
  useCommunitiesStore,
  useCommunityFromStore,
} from "../stores/communities";
import { ToolbarButtons } from "../components/toolbar/toolbar-buttons";
import { MultiSelect } from "../components/ui/multi-select";
import { Flair } from "../components/flair";
import { Checkbox } from "@/src/components/ui/checkbox";
import { useFlairs } from "../stores/flairs";
import { Page } from "../components/page";

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
            to="/create_post"
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
                to="/create_post"
                searchParams={`?id=${key}`}
                className={cn(
                  "bg-background border px-3 py-2 gap-1 rounded-lg flex flex-col",
                  createPostId === key &&
                    "border-brand border-dashed bg-brand/20",
                )}
                onClick={onClickDraft}
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
  const isActive = pathname === "/create_post";
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

function useDraftFromUrl({
  draft,
  patchDraft,
  draftId,
}: {
  draft: Draft;
  patchDraft: (key: string, patch: Partial<Draft>) => void;
  draftId: string;
}) {
  const [title, _1, removeTitle] = useUrlSearchState("title", "", z.string());
  const [url, _2, removeUrl] = useUrlSearchState("url", "", z.string());
  const [body, _3, removeBody] = useUrlSearchState("body", "", z.string());
  const [nsfw, _4, removeNsfw] = useUrlSearchState(
    "nsfw",
    undefined,
    z
      .union([
        z.literal("1"),
        z.literal("0"),
        z.literal("true"),
        z.literal("false"),
      ])
      .optional(),
  );

  useEffect(() => {
    if (isEmptyDraft(draft) && (title || url || body || nsfw)) {
      const updateDraft: Partial<Draft> = {};
      if (title) {
        updateDraft.title = title;
      }
      if (url) {
        updateDraft.url = url;
        updateDraft.type = "link";
      }
      if (body) {
        updateDraft.body = body;
      }
      if (nsfw === "1" || nsfw === "true") {
        updateDraft.nsfw = true;
      }
      patchDraft(draftId, updateDraft);
    }
    if (title || url || body || nsfw) {
      removeTitle().and(removeUrl).and(removeBody).and(removeNsfw);
    }
  }, [
    draft,
    title,
    url,
    body,
    nsfw,
    patchDraft,
    draftId,
    removeTitle,
    removeUrl,
    removeBody,
    removeNsfw,
  ]);
}

export function CreatePost() {
  const [showDrafts, setShowDrafts] = useState(false);
  const media = useMedia();
  const [defaultUuid, setDefaultUuid] = useState(uuid());
  const [draftIdEncoded] = useUrlSearchState("id", defaultUuid, z.string());
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

  useDraftFromUrl({
    draft,
    draftId,
    patchDraft,
  });

  useLoadRecentCommunity(draftId, draft);

  useCommunity({
    name: draft.communitySlug,
  });
  const community = useCommunityFromStore(draft.communitySlug);
  const flairs = useFlairs(community?.flairs?.map((f) => f.id));
  const flairLookup = useFlairLookup(flairs);

  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) =>
    draft.apId ? s.posts[getCachePrefixer()(draft.apId)] : undefined,
  );
  const myUserId = useAuth((s) => getAccountActorId(s.getSelectedAccount()));
  const canEdit =
    isEdit && post?.data.creatorApId && myUserId === post.data.creatorApId;
  const postOwner = post?.data.creatorSlug;

  const softwareInfo = useSoftware();
  const { software } = softwareInfo;
  const showPollOption =
    supportsPollCreation(softwareInfo) || draft.type === "poll";

  const DEFAULT_POLL: Forms.PollInput = {
    endDate: dayjs().add(7, "days").toISOString(),
    mode: "single",
    localOnly: false,
    choices: [
      { id: 0, text: "", sortOrder: 0 },
      { id: 0, text: "", sortOrder: 1 },
    ],
  };

  const patchPollChoice = (index: number, text: string) => {
    if (!draft.poll) return;
    const choices = draft.poll.choices.map((c, i) =>
      i === index ? { ...c, text } : c,
    );
    patchDraft(draftId, { poll: { ...draft.poll, choices } });
  };

  const addPollChoice = () => {
    if (!draft.poll) return;
    const choices = [
      ...draft.poll.choices,
      { id: 0, text: "", sortOrder: draft.poll.choices.length },
    ];
    patchDraft(draftId, { poll: { ...draft.poll, choices } });
  };

  const removePollChoice = (index: number) => {
    if (!draft.poll) return;
    const choices = draft.poll.choices
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, sortOrder: i }));
    patchDraft(draftId, { poll: { ...draft.poll, choices } });
  };

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
  const resetCreatePost = createPost.reset;
  const resetEditPost = editPost.reset;
  useEffect(() => {
    resetCreatePost();
    resetEditPost();
  }, [draftId, resetCreatePost, resetEditPost]);

  const linkMetadata = useLinkMetadata();

  const parseUrl = (url: string) => {
    if (url) {
      linkMetadata
        .mutateAsync({
          url,
        })
        .then((meta) => {
          const patch: Partial<Draft> = {};
          if (!draft.title && meta.title) {
            patch.title = meta.title;
          }
          if (meta.imageUrl) {
            patch.thumbnailUrl = meta.imageUrl;
          }
          patchDraft(draftId, patch);
        });
    }
  };

  const getPostButton = (className: string) => (
    <LoadingButton
      size="sm"
      className={className}
      onClick={() => {
        try {
          if (draft.communitySlug) {
            const cleanup = () => {
              deleteDraft(draftId);
              setDefaultUuid(uuid());
            };
            if (isEdit) {
              editPost.mutateAsync(draft).then(cleanup);
            } else {
              createPost.mutateAsync(draft).then(cleanup);
            }
          }
        } catch {
          // TODO: handle incomplete post data
        }
      }}
      disabled={
        !draft.communitySlug ||
        (isEdit && !canEdit) ||
        (draft.type === "poll" && software === "lemmy")
      }
      loading={
        isEdit
          ? editPost.isPending || editPost.isSuccess
          : createPost.isPending || createPost.isSuccess
      }
    >
      {isEdit ? "Update" : "Post"}
    </LoadingButton>
  );

  return (
    <Page requireLogin>
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
                    const patch: Partial<Draft> = {
                      type: val as Draft["type"],
                    };
                    if (val === "poll" && !draft.poll) {
                      patch.poll = DEFAULT_POLL;
                    }
                    patchDraft(draftId, patch);
                  }
                }}
              >
                <ToggleGroupItem value="text">Text</ToggleGroupItem>
                <ToggleGroupItem value="media">Image</ToggleGroupItem>
                <ToggleGroupItem value="link">Link</ToggleGroupItem>
                {showPollOption && (
                  <ToggleGroupItem value="poll">Poll</ToggleGroupItem>
                )}
              </ToggleGroup>

              {draft.type === "poll" && software === "lemmy" && (
                <p className="text-sm text-destructive">
                  Lemmy doesn't support polls. Switch to a different post type
                  or use a PieFed account.
                </p>
              )}

              <div className="gap-2 flex items-center">
                <Checkbox
                  id={`${id}-nsfw`}
                  checked={draft.nsfw ?? false}
                  onCheckedChange={(nsfw) =>
                    patchDraft(draftId, {
                      nsfw: nsfw === true,
                    })
                  }
                />
                <Label htmlFor={`${id}-nsfw`}>NSFW</Label>
              </div>

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
                      draft.flairs?.map(flairLookup).filter(isNotNil) ?? []
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

              {draft.type === "poll" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Poll Options</Label>
                    {draft.poll?.choices.map((choice, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder={`Option ${i + 1}`}
                          value={choice.text}
                          onChange={(e) => patchPollChoice(i, e.target.value)}
                        />
                        {(draft.poll?.choices.length ?? 0) > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePollChoice(i)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={addPollChoice}
                    >
                      + Add Option
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Poll End Date</Label>
                    <input
                      type="datetime-local"
                      value={
                        draft.poll?.endDate
                          ? dayjs(draft.poll.endDate).format("YYYY-MM-DDTHH:mm")
                          : ""
                      }
                      onChange={(e) =>
                        draft.poll &&
                        patchDraft(draftId, {
                          poll: {
                            ...draft.poll,
                            endDate: new Date(e.target.value).toISOString(),
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Voting Mode</Label>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={draft.poll?.mode ?? "single"}
                      onValueChange={(val) =>
                        val &&
                        draft.poll &&
                        patchDraft(draftId, {
                          poll: {
                            ...draft.poll,
                            mode: val as "single" | "multiple",
                          },
                        })
                      }
                    >
                      <ToggleGroupItem value="single">
                        Single choice
                      </ToggleGroupItem>
                      <ToggleGroupItem value="multiple">
                        Multiple choice
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={draft.poll?.localOnly ?? false}
                      onCheckedChange={(v) =>
                        draft.poll &&
                        patchDraft(draftId, {
                          poll: { ...draft.poll, localOnly: !!v },
                        })
                      }
                    />
                    <Label>Local only (don't federate)</Label>
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
    </Page>
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
  const subscribedCommunities = useCommunitiesFromStore(
    subscribedCommunitiesRes.data?.pages
      .flatMap((p) => p.communities)
      .sort((a, b) => a.localeCompare(b)) ?? EMPTY_ARR,
  );

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

  if (subscribedCommunities && recentCommunities.recentlyVisited.length > 0) {
    data.push(
      "Subscribed",
      ...subscribedCommunities.map((c) => ({ slug: c.communityView.slug })),
    );
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
          stickyIndicies={[0]}
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
