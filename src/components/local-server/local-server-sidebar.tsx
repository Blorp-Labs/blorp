import _ from "lodash";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { MarkdownRenderer } from "@/src/components/markdown/renderer";
import { Separator } from "@/src/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { PersonCard } from "@/src/components/person/person-card";
import { Sidebar, SidebarContent } from "@/src/components/sidebar";
import { useSidebarStore } from "@/src/stores/sidebars";
import { AggregateBadges } from "../aggregates";
import { Link } from "@/src/routing/index";
import { useLinkContext } from "@/src/routing/link-context";

function InstanceSidebar({ asPage }: { asPage?: boolean }) {
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const sidebar = site?.sidebar;

  const instance = useAuth((s) => s.getSelectedAccount().instance);

  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  const open = useSidebarStore((s) => s.siteAboutExpanded);
  const setOpen = useSidebarStore((s) => s.setSiteAboutExpanded);

  if (!sidebar) {
    return null;
  }

  if (asPage) {
    return (
      <>
        <section className="p-3 flex flex-col gap-3">
          <h2 className="text-muted-foreground uppercase">
            ABOUT {instanceHost}
          </h2>

          <MarkdownRenderer dim className="text-sm" markdown={sidebar} />

          <AggregateBadges
            aggregates={{
              "users / day": site.usersActiveDayCount,
              "users / week": site.usersActiveWeekCount,
              "users / month": site.usersActiveMonthCount,
              "users / 6 months": site.usersActiveHalfYearCount,
              Posts: site.postCount,
              Users: site.userCount,
              Communities: site.commentCount,
              Comments: site.commentCount,
            }}
          />
        </section>
        <Separator />
      </>
    );
  }

  return (
    <>
      <Collapsible className="p-3" open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
          <span>ABOUT {instanceHost}</span>
          <ChevronsUpDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-5 pb-2">
          <p className="text-sm mb-4 text-muted-foreground font-medium">
            {site.description}
          </p>

          <MarkdownRenderer dim markdown={sidebar} />

          <AggregateBadges
            className="mt-4"
            aggregates={{
              "users / day": site.usersActiveDayCount,
              "users / week": site.usersActiveWeekCount,
              "users / month": site.usersActiveMonthCount,
              "users / 6 months": site.usersActiveHalfYearCount,
              Posts: site.postCount,
              Users: site.userCount,
              Communities: site.commentCount,
              Comments: site.commentCount,
            }}
          />
        </CollapsibleContent>
      </Collapsible>
      <Separator />
    </>
  );
}

function InstanceAdmins({ asPage }: { asPage?: boolean }) {
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const admins = site?.admins;

  const instance = useAuth((s) => s.getSelectedAccount().instance);

  const open = useSidebarStore((s) => s.siteAdminsExpanded);
  const setOpen = useSidebarStore((s) => s.setSiteAdminsExpanded);

  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  if (!admins) {
    return null;
  }

  if (asPage) {
    return (
      <section className="p-3 flex flex-col gap-2">
        <span className="text-muted-foreground uppercase">
          {instanceHost} ADMINS
        </span>

        {admins.map((apId) => (
          <PersonCard key={apId} actorId={apId} size="sm" />
        ))}
      </section>
    );
  }

  return (
    <Collapsible className="p-3" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full">
        <span>{instanceHost} ADMINS</span>
        <ChevronsUpDown className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 flex flex-col gap-1">
        {admins.map((apId) => (
          <PersonCard key={apId} actorId={apId} size="sm" />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LocalSererSidebar() {
  const linkCtx = useLinkContext();

  return (
    <Sidebar>
      <SidebarContent>
        <InstanceSidebar />
        <InstanceAdmins />
        <Separator />
        <div className="p-3">
          <Link to={`${linkCtx.root}modlog`} className="text-brand text-sm">
            Modlog
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function LocalSererSidebarPage() {
  return (
    <div className="flex-1">
      <InstanceSidebar asPage />
      <InstanceAdmins asPage />
    </div>
  );
}
