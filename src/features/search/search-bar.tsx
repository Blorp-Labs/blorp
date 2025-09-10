import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/src/components/ui/command";
import { useSearch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/stores/auth";
import { usePostsStore } from "@/src/stores/posts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import _ from "lodash";
import { useProfilesStore } from "@/src/stores/profiles";
import { useLinkContext } from "@/src/routing/link-context";
import { useIonRouter } from "@ionic/react";
import { resolveRoute } from "@/src/routing";
import { encodeApId } from "@/src/lib/api/utils";
import { useCommunitiesStore } from "@/src/stores/communities";
import type { Forms } from "@/src/lib/api/adapters/api-blueprint";
import {
  useDebouncedState,
  useIsActiveRoute,
  useKeyboardShortcut,
} from "@/src/lib/hooks";
import { isIos, isMacOs } from "@/src/lib/device";
import { useSearchStore } from "@/src/stores/search";

function CommunitySearchResult({ apId }: { apId: string }) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const community = useCommunitiesStore(
    (s) => s.communities[getCachePrefixer()(apId)]?.data,
  );

  const router = useIonRouter();
  const linkCtx = useLinkContext();

  if (!community) {
    return null;
  }

  const onSelect = () =>
    router.push(
      resolveRoute(`${linkCtx.root}c/:communityName`, {
        communityName: community.communityView.slug,
      }),
    );

  return (
    <CommandItem
      value={apId}
      keywords={[community.communityView.slug]}
      onSelect={onSelect}
      onClick={onSelect}
    >
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
        {community.communityView.slug}
      </span>
    </CommandItem>
  );
}

function PostSearchResult({ apId }: { apId: string }) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = usePostsStore((s) => s.posts[getCachePrefixer()(apId)]?.data);

  const router = useIonRouter();
  const linkCtx = useLinkContext();

  if (!post) {
    return null;
  }

  const onSelect = () =>
    router.push(
      resolveRoute(`${linkCtx.root}c/:communityName/posts/:post`, {
        communityName: post.communitySlug,
        post: encodeApId(apId),
      }),
    );

  return (
    <CommandItem
      value={apId}
      keywords={[post.title]}
      onSelect={onSelect}
      onClick={onSelect}
    >
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
        {post.title}
      </span>
    </CommandItem>
  );
}

function UserSearchResult({ apId }: { apId: string }) {
  const getCachePrefixer = useAuth((s) => s.getCachePrefixer);
  const post = useProfilesStore(
    (s) => s.profiles[getCachePrefixer()(apId)]?.data,
  );

  const router = useIonRouter();
  const linkCtx = useLinkContext();

  if (!post) {
    return null;
  }

  const onSelect = () =>
    router.push(
      resolveRoute(`${linkCtx.root}u/:userId`, {
        userId: encodeApId(apId),
      }),
    );

  return (
    <CommandItem
      value={apId}
      keywords={[post.slug]}
      onSelect={onSelect}
      onClick={onSelect}
    >
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
        {post.slug}
      </span>
    </CommandItem>
  );
}

export function SearchBar({
  type,
  communitySlug,
  preventOpen = false,
  className,
  autoFocus,
  ...props
}: React.ComponentProps<typeof CommandInput> & {
  onSubmit?: (value?: string) => any;
} & {
  type?: Forms.Search["type"];
  communitySlug?: Forms.Search["communitySlug"];
  preventOpen?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const [_open, setOpen] = useState(false);
  const isOpen = preventOpen ? false : _open;

  const search = useDebouncedState(props.value, 500);

  const searchResults = useSearch({
    q: search.value ?? "",
    type: type ?? "All",
    limit: type ? 10 : 3,
    communitySlug,
  });

  useKeyboardShortcut(
    useCallback((e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ref.current?.focus();
      }
    }, []),
  );

  const { posts, users, communities } = useMemo(() => {
    const posts = _.uniq(searchResults.data?.pages.flatMap((p) => p.posts));
    const users = _.uniq(searchResults.data?.pages.flatMap((p) => p.users));
    const communities = searchResults.data?.pages.flatMap((p) => p.communities);
    return { posts, users, communities };
  }, [searchResults.data]);

  const isActive = useIsActiveRoute();

  useEffect(() => {
    if (autoFocus && isActive) {
      const id = setTimeout(() => {
        ref.current?.focus();
      }, 50);
      return () => clearTimeout(id);
    }
  }, [autoFocus, isActive]);

  const saveSearch = useSearchStore((s) => s.saveSearch);
  const searchHistory = useSearchStore((s) => s.searchHistory).slice(0, 5);

  const canOpen = props.value || searchHistory.length > 0;

  return (
    <Command
      className={cn(
        "md:max-w-md relative mx-auto overflow-visible border group",
        canOpen && !preventOpen
          ? "focus-within:rounded-b-none focus-within:shadow"
          : "focus-within:ring",
        className,
      )}
    >
      <CommandInput
        placeholder="Search..."
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        ref={ref}
        {...props}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            ref.current?.blur();
          } else if (e.key === "Enter") {
            if (props.value) {
              saveSearch(props.value);
            }
            ref.current?.blur();
          }
          props.onKeyDown?.(e);
        }}
        onValueChange={(value) => {
          search.setValue(value);
          props.onValueChange?.(value);
        }}
        onBlurCapture={() => {
          if (props.value) {
            saveSearch(props.value);
          }
        }}
        loading={isOpen && searchResults.isFetching}
        endAdornment={
          <CommandShortcut className="group-focus-within:hidden max-md:hidden">
            {isMacOs() || isIos() ? "⌘" : "Ctrl+"}K
          </CommandShortcut>
        }
      />
      <CommandList
        className={cn(
          "absolute top-full z-50 bg-popover rounded-b-lg border -left-px -right-px shadow hidden",
          canOpen && !preventOpen && "group-focus-within:block",
        )}
      >
        {props.value && (
          <CommandGroup forceMount>
            <CommandItem
              value={props.value}
              onSelect={() => {
                if (props.value) {
                  saveSearch(props.value);
                }
                props.onSubmit?.();
              }}
            >
              <span className="whitespace-nowrap break-all overflow-hidden text-ellipsis">
                Search {props.value.trim()}...
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {searchHistory.length > 0 && (
          <CommandGroup heading="Recent searches">
            {searchHistory.map((item) =>
              item !== props.value ? (
                <CommandItem
                  key={item}
                  className="whitespace-nowrap overflow-hidden text-ellipsis"
                  value={item}
                  onSelect={() => {
                    saveSearch(item);
                    props.onSubmit?.(item);
                  }}
                >
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item}
                  </span>
                </CommandItem>
              ) : null,
            )}
          </CommandGroup>
        )}

        {props.value && communities && communities.length > 0 && (
          <CommandGroup heading="Communities">
            {communities.map((apId) => (
              <CommunitySearchResult key={apId} apId={apId} />
            ))}
          </CommandGroup>
        )}
        {props.value && posts && posts.length > 0 && (
          <CommandGroup heading="Posts">
            {posts.map((apId) => (
              <PostSearchResult key={apId} apId={apId} />
            ))}
          </CommandGroup>
        )}
        {props.value && users && users.length > 0 && (
          <CommandGroup heading="Users">
            {users.map((apId) => (
              <UserSearchResult key={apId} apId={apId} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
