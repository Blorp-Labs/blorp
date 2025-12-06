import { useFiltersStore } from "@/src/stores/filters";
import { useMemo } from "react";
import { useAuth } from "../stores/auth";
import { useMedia } from "../lib/hooks";
import { ActionMenu, ActionMenuProps } from "./adaptable/action-menu";
import _ from "lodash";

import { TbArrowsDownUp, TbMessageCircle } from "react-icons/tb";
import { LuClock3, LuCalendarArrowUp } from "react-icons/lu";
import {
  FaPersonRunning,
  FaArrowTrendUp,
  FaHourglassEnd,
} from "react-icons/fa6";
import { HiOutlineRectangleStack } from "react-icons/hi2";

import { IoSkullOutline, IoChevronDown } from "react-icons/io5";
import { TbMessageCircleUp } from "react-icons/tb";
import { PiFireSimpleBold } from "react-icons/pi";
import { FaSortAlphaDown, FaSortAlphaUp } from "react-icons/fa";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useAvailableSorts } from "../lib/api";
import { POST_CARD_STYLE_OPTIONS, useSettingsStore } from "../stores/settings";

function humanizeText(str: string) {
  return str.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function groupByFirstWord(arr: string[] | readonly string[]) {
  return (
    _.chain(arr)
      // 1) map each string to { prefix, remainder, original }
      .map((str) => {
        // split just before each capital letter
        const parts = str.split(/(?=[A-Z])/);
        const prefix = parts[0];
        // if there was more than one part, join the rest back together
        const remainder = parts.length > 1 ? parts.slice(1).join("") : null;
        return { prefix, remainder, original: str };
      })
      // 2) group by that first word
      .groupBy("prefix")
      // 3) rebuild: singletons → string, multiples → [ prefix, [remainders…] ]
      .map((group, prefix) => {
        if (group.length === 1 && group[0]?.remainder === null) {
          // only one and it had no “rest” → leave it as the original
          return group[0].original;
        } else {
          // multiple items (or one with a remainder) → collect the remainders
          const items = group.map(
            (item) =>
              // use the remainder if it exists, otherwise fall back to the full original
              item.remainder || "",
          );
          return [prefix, items] as const;
        }
      })
      // 4) get the final array
      .value()
  );
}

function getIconCommunitySort(sort: string) {
  if (sort.startsWith("Top")) {
    return <LuCalendarArrowUp />;
  }
  if (sort.startsWith("Active")) {
    return <FaPersonRunning />;
  }

  switch (sort) {
    case "Hot":
      return <PiFireSimpleBold />;
    case "New":
      return <LuClock3 />;
    case "Controversial":
      return <IoSkullOutline />;
    case "Scaled":
      return <FaArrowTrendUp />;
    case "MostComments":
      return <TbMessageCircleUp />;
    case "NewComments":
      return <TbMessageCircle />;
    case "Old":
      return <FaHourglassEnd />;
    case "NameAsc":
      return <FaSortAlphaDown />;
    case "NameDesc":
      return <FaSortAlphaUp />;
    default:
      return <TbArrowsDownUp />;
  }
}

export function CommunitySortSelect() {
  const setCommunitySort = useFiltersStore((s) => s.setCommunitySort);

  const { communitySorts, communitySort } = useAvailableSorts();

  const actions: ActionMenuProps<string>["actions"] = useMemo(() => {
    if (communitySorts) {
      return groupByFirstWord(communitySorts).map((item) =>
        _.isString(item)
          ? {
              text: humanizeText(item),
              value: item,
              onClick: () => setCommunitySort(item),
            }
          : {
              text: humanizeText(item[0]),
              value: item[0],
              actions: item[1].map((subItem) => ({
                text: humanizeText(subItem),
                value: item[0] + subItem,
                onClick: () => setCommunitySort(item[0] + subItem),
              })),
            },
      );
    }

    return [];
  }, [communitySorts, setCommunitySort]);

  return (
    <ActionMenu
      align="end"
      header="Community Sort"
      actions={actions}
      selectedValue={communitySort}
      trigger={
        <div className="text-2xl text-muted-foreground">
          {communitySorts?.includes(communitySort) ? (
            getIconCommunitySort(communitySort)
          ) : (
            <TbArrowsDownUp />
          )}
        </div>
      }
    />
  );
}

function getIconCommentSort(sort: string) {
  switch (sort) {
    case "Top":
      return <LuCalendarArrowUp />;
    case "Hot":
      return <PiFireSimpleBold />;
    case "New":
      return <LuClock3 />;
    case "Controversial":
      return <IoSkullOutline />;
    case "Old":
      return <FaHourglassEnd />;
    default:
      return <TbArrowsDownUp />;
  }
}

export function CommentSortSelect({
  className,
  variant,
}: {
  className?: string;
  variant?: "button" | "icon";
}) {
  const setCommentSort = useFiltersStore((s) => s.setCommentSort);

  const { commentSorts, commentSort } = useAvailableSorts();
  const isValidSort = commentSorts?.includes(commentSort);

  const actions: ActionMenuProps<string>["actions"] = useMemo(() => {
    if (commentSorts) {
      return groupByFirstWord(commentSorts).map((item) =>
        _.isString(item)
          ? {
              text: humanizeText(item),
              value: item,
              onClick: () => setCommentSort(item),
            }
          : {
              text: humanizeText(item[0]),
              value: item[0],
              actions: item[1].map((subItem) => ({
                text: humanizeText(subItem),
                value: item[0] + subItem,
                onClick: () => setCommentSort(item[0] + subItem),
              })),
            },
      );
    }

    return [];
  }, [commentSorts, setCommentSort]);

  return (
    <ActionMenu
      align="start"
      header="Comment Sort"
      actions={actions}
      selectedValue={commentSort}
      triggerAsChild={variant === "button"}
      trigger={
        variant === "button" ? (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "text-sm font-medium text-muted-foreground hover:text-brand",
              className,
            )}
          >
            {humanizeText(commentSort)}
            {commentSorts?.includes(commentSort) &&
              getIconCommentSort(commentSort)}
          </Button>
        ) : (
          <div className={cn("text-2xl text-muted-foreground", className)}>
            {isValidSort && getIconForSort(commentSort)}
            {!isValidSort && <TbArrowsDownUp />}
          </div>
        )
      }
    />
  );
}

function getIconForSort(sort: string) {
  if (sort.startsWith("Top")) {
    return <LuCalendarArrowUp />;
  }

  switch (sort) {
    case "Hot":
      return <PiFireSimpleBold />;
    case "Active":
      return <FaPersonRunning />;
    case "New":
      return <LuClock3 />;
    case "Controversial":
      return <IoSkullOutline />;
    case "Scaled":
      return <FaArrowTrendUp />;
    case "MostComments":
      return <TbMessageCircleUp />;
    case "NewComments":
      return <TbMessageCircle />;
    case "Old":
      return <FaHourglassEnd />;
    default:
      return <TbArrowsDownUp />;
  }
}

export function PostSortButton({
  hideOnGtMd,
  align = "end",
  variant = "icon",
  className,
}: {
  hideOnGtMd?: boolean;
  align?: "start" | "end";
  variant?: "button" | "icon";
  className?: string;
}) {
  const setPostSort = useFiltersStore((s) => s.setPostSort);

  const media = useMedia();

  const { postSorts, postSort } = useAvailableSorts();

  const actions: ActionMenuProps<string>["actions"] = useMemo(() => {
    if (postSorts) {
      return groupByFirstWord(postSorts).map((item) =>
        _.isString(item)
          ? {
              text: humanizeText(item),
              value: item,
              onClick: () => setPostSort(item),
            }
          : {
              text: humanizeText(item[0]),
              value: item[0],
              actions: item[1].map((subItem) => ({
                text: humanizeText(subItem || "Post"),
                value: item[0] + subItem,
                onClick: () => setPostSort(item[0] + subItem),
              })),
            },
      );
    }

    return [];
  }, [postSorts, setPostSort]);

  if (hideOnGtMd && media.md) {
    return null;
  }

  const isValidSort = postSorts?.includes(postSort);

  const sortLabel = actions.find(
    (sort) => sort.value && postSort.startsWith(sort.value),
  )?.text;

  const ariaLabel = (isValidSort ? postSort : "Invalid") + " post sort";

  return (
    <ActionMenu
      header="Sort by"
      align={align}
      actions={actions}
      selectedValue={postSort}
      triggerAsChild={variant === "button"}
      trigger={
        variant === "button" ? (
          <Button
            size="sm"
            variant="outline"
            className={className}
            aria-label={ariaLabel}
          >
            {sortLabel ?? "Sort"}
            {isValidSort && getIconForSort(postSort)}
          </Button>
        ) : (
          <div
            className={cn("text-2xl text-muted-foreground", className)}
            aria-label={ariaLabel}
          >
            {isValidSort && getIconForSort(postSort)}
            {!isValidSort && <TbArrowsDownUp />}
          </div>
        )
      }
    />
  );
}

export function PostCardStyleButton({
  hideOnGtMd,
  align = "end",
  variant = "icon",
  className,
}: {
  hideOnGtMd?: boolean;
  align?: "start" | "end";
  variant?: "button" | "icon";
  className?: string;
}) {
  const postCardStyle = useSettingsStore((s) => s.postCardStyle);
  const setPostCardStyle = useSettingsStore((s) => s.setPostCardStyle);

  const media = useMedia();

  if (hideOnGtMd && media.md) {
    return null;
  }

  return (
    <ActionMenu
      header="Display posts as"
      align={align}
      actions={POST_CARD_STYLE_OPTIONS.map(({ label, value }) => ({
        text: label,
        value,
        onClick: () => setPostCardStyle(value),
      }))}
      selectedValue={postCardStyle}
      triggerAsChild={variant === "button"}
      trigger={
        variant === "button" ? (
          <Button
            size="sm"
            variant="outline"
            className={className}
            aria-label={postCardStyle}
          >
            <HiOutlineRectangleStack />
            <IoChevronDown />
          </Button>
        ) : (
          <div
            className={cn("text-2xl text-muted-foreground", className)}
            aria-label={postCardStyle}
          >
            <HiOutlineRectangleStack />
          </div>
        )
      }
    />
  );
}

export function HomeFilter({ children }: { children?: React.ReactNode }) {
  const instance = useAuth((s) => s.getSelectedAccount().instance);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const listingType = useFiltersStore((s) => s.listingType);
  const setListingType = useFiltersStore((s) => s.setListingType);

  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  const LISTING_TYPE_OPTIONS: ActionMenuProps["actions"] = useMemo(
    () =>
      [
        {
          label: "All",
          value: "All",
        } as const,
        {
          label: `Local (${instanceHost ? instanceHost : ""})`,
          value: "Local",
        } as const,
        ...(isLoggedIn
          ? ([
              {
                label: "Subscribed",
                value: "Subscribed",
              },
              {
                label: "Moderating",
                value: "ModeratorView",
              },
            ] as const)
          : []),
      ].map((opt) => ({
        text: opt.label,
        value: opt.value,
        onClick: () => setListingType(opt.value),
      })),
    [isLoggedIn, setListingType, instanceHost],
  );

  return (
    <ActionMenu
      align="start"
      actions={LISTING_TYPE_OPTIONS}
      selectedValue={listingType}
      trigger={
        children ?? (
          <div className="flex flex-row items-center gap-0.5 text-lg">
            <span className="font-black capitalize">
              {listingType === "ModeratorView" ? "Moderating" : listingType}
            </span>
            <IoChevronDown className="text-muted-foreground" />
          </div>
        )
      }
    />
  );
}

export function CommunityFilter() {
  const instance = useAuth((s) => s.getSelectedAccount().instance);

  const listingType = useFiltersStore((s) => s.communitiesListingType);
  const setListingType = useFiltersStore((s) => s.setCommunitiesListingType);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  const LISTING_TYPE_OPTIONS = useMemo(
    () =>
      [
        {
          label: "All",
          value: "All",
        } as const,
        {
          label: `Local (${instanceHost})`,
          value: "Local",
        } as const,
        ...(isLoggedIn
          ? ([
              {
                label: "Subscribed",
                value: "Subscribed",
              },

              {
                label: "Moderating",
                value: "ModeratorView",
              },
            ] as const)
          : []),
      ].map((opt) => ({
        text: opt.label,
        value: opt.value,
        onClick: () => setListingType(opt.value),
      })),
    [isLoggedIn, instanceHost, setListingType],
  );

  return (
    <ActionMenu
      align="start"
      actions={LISTING_TYPE_OPTIONS}
      selectedValue={listingType}
      trigger={
        <div className="flex flex-row items-center gap-0.5 text-lg">
          <span className="font-black capitalize">
            {listingType === "ModeratorView" ? "Moderating" : listingType}
          </span>
          <IoChevronDown className="text-muted-foreground" />
        </div>
      }
    />
  );
}
