import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { LuCakeSlice } from "react-icons/lu";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { MarkdownRenderer } from "../markdown/renderer";
import { ActionMenu } from "../adaptable/action-menu";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { Sidebar, SidebarContent } from "../sidebar";
import { Separator } from "../ui/separator";
import { Collapsible } from "../ui/collapsible";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronsUpDown } from "lucide-react";
import { useSidebarStore } from "@/src/stores/sidebars";
import { AggregateBadges } from "../aggregates";
import { Schemas } from "@/src/lib/api/adapters/api-blueprint";
import { useTagUserStore } from "@/src/stores/user-tags";
import { Badge } from "../ui/badge";
import { usePersonActions } from "./person-action-menu";
import { cn } from "@/src/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import { DateTime } from "../datetime";
import { useIsPersonBlocked } from "@/src/stores/auth";

dayjs.extend(localizedFormat);

export function SmallScreenSidebar({ person }: { person?: Schemas.Person }) {
  const [expanded, setExpanded] = useState(false);
  const actions = usePersonActions({ person });

  const isBlocked = useIsPersonBlocked(person?.apId);

  return (
    <div className={cn("p-4 py-1.5", !expanded && "md:hidden")}>
      <div className="flex flex-row items-start gap-3 flex-1 mb-1.5">
        <Avatar className="h-13 w-13">
          <AvatarImage
            src={person?.avatar ?? undefined}
            className="object-cover"
          />
          <AvatarFallback className="text-xl">
            {person?.slug?.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <LuCakeSlice />
            <span>
              Created{" "}
              <DateTime date={person ? dayjs(person.createdAt) : null} />
            </span>
          </div>

          <AggregateBadges
            className="mt-1"
            aggregates={{
              Posts: person?.postCount,
              Comments: person?.commentCount,
            }}
          />
        </div>

        <div className="flex-1" />

        <ActionMenu
          header="User"
          align="end"
          actions={actions}
          trigger={
            <IoEllipsisHorizontal
              className="text-muted-foreground mt-0.5"
              aria-label="Person action menu"
            />
          }
        />
      </div>

      {expanded && person?.bio && !isBlocked && (
        <div className="my-2">
          <span>BIO</span>
          <MarkdownRenderer markdown={person.bio} dim className="mt-3" />
        </div>
      )}

      {person?.bio && !isBlocked && (
        <Button
          variant="link"
          className="-ml-4 text-brand"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide" : "Show"} bio
        </Button>
      )}
    </div>
  );
}

export function PersonSidebar({ person }: { person?: Schemas.Person }) {
  const open = useSidebarStore((s) => s.personBioExpanded);
  const setOpen = useSidebarStore((s) => s.setPersonBioExpanded);

  const tag = useTagUserStore((s) =>
    person ? s.userTags[person.slug] : undefined,
  );

  const [name, host] = person ? person.slug.split("@") : [];

  const actions = usePersonActions({ person });
  const isBlocked = useIsPersonBlocked(person?.apId);

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-row items-start justify-between flex-1">
            <Avatar className="h-13 w-13">
              <AvatarImage
                src={person?.avatar ?? undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-xl">
                {person?.slug?.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <ActionMenu
              header="User"
              align="end"
              actions={actions}
              trigger={
                <IoEllipsisHorizontal
                  className="text-muted-foreground mt-0.5"
                  aria-label="Person action menu"
                />
              }
            />
          </div>

          <span className="flex items-center text-ellipsis overflow-hidden">
            <b>{name}</b>
            {tag ? (
              <Badge size="sm" variant="brand" className="ml-2">
                {tag}
              </Badge>
            ) : (
              <i className="text-muted-foreground">@{host}</i>
            )}
          </span>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <LuCakeSlice />
            <span>
              Created{" "}
              <DateTime date={person ? dayjs(person.createdAt) : null} />
            </span>
          </div>

          <AggregateBadges
            className="mt-1"
            aggregates={{
              Posts: person?.postCount,
              Comments: person?.commentCount,
            }}
          />
        </div>

        {person?.bio && !isBlocked && (
          <>
            <Separator />
            <Collapsible className="p-4" open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
                <span>BIO</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <MarkdownRenderer markdown={person.bio} dim className="mt-3" />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
