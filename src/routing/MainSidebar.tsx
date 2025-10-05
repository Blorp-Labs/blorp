import { IonIcon, useIonRouter, IonMenuToggle } from "@ionic/react";
import { Link, ParamsFor } from "@/src/routing/index";
import _ from "lodash";
import { twMerge } from "tailwind-merge";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import {
  useModeratingCommunities,
  useNotificationCount,
  usePrivateMessagesCount,
  useSubscribedCommunities,
} from "@/src/lib/api";
import { CommunityCard } from "@/src/components/communities/community-card";
import { LEFT_SIDEBAR_MENU_ID, TABS } from "./config";
import { Separator } from "../components/ui/separator";
import {
  DocumentsOutline,
  LockClosedOutline,
  ScrollTextOutline,
  SidebarOutline,
} from "../components/icons";
import { useLinkContext } from "./link-context";
import { RoutePath } from "./routes";
import { BadgeCount } from "../components/badge-count";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { useSidebarStore } from "../stores/sidebars";
import { IoSettingsOutline } from "react-icons/io5";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { isTauri } from "../lib/device";
import { ChevronLeft, ChevronRight } from "../components/icons";

function SidebarTabs() {
  const mainSidebarCollapse = useSidebarStore((s) => s.mainSidebarCollapsed);
  const selectedAccountIndex = useAuth((s) => s.accountIndex);
  const messageCount = usePrivateMessagesCount()[selectedAccountIndex];
  const inboxCount = useNotificationCount()[selectedAccountIndex];
  const pathname = useIonRouter().routeInfo.pathname;

  return (
    <>
      {TABS.map((t) => {
        const isActive = pathname.startsWith(t.to);
        return (
          <button
            key={t.id}
            onClick={() => {
              const tab = document.querySelector(`ion-tab-button[tab=${t.id}]`);
              if (tab && "click" in tab && _.isFunction(tab.click)) {
                tab.click();
              }
            }}
            className={twMerge(
              "relative max-md:hidden text-md flex flex-row items-center py-2 px-3 rounded-xl hover:bg-secondary",
              isActive ? "bg-secondary" : "text-muted-foreground",
              mainSidebarCollapse && "mx-auto",
            )}
          >
            <BadgeCount
              showBadge={
                t.id === "inbox"
                  ? !!inboxCount
                  : t.id === "messages"
                    ? !!messageCount
                    : false
              }
            >
              <IonIcon
                icon={t.icon(isActive)}
                key={isActive ? "active" : "inactive"}
                className="text-2xl"
              />
            </BadgeCount>
            <span
              className={cn("text-sm ml-2", mainSidebarCollapse && "sr-only")}
            >
              {t.label}
            </span>
          </button>
        );
      })}

      <Separator className="max-md:hidden my-2" />
    </>
  );
}

export function MainSidebar() {
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const icon = site?.icon;
  const siteTitle = site?.title;

  const mainSidebarCollapse = useSidebarStore((s) => s.mainSidebarCollapsed);
  const recentCommunities = useRecentCommunitiesStore((s) => s.recentlyVisited);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const instance = useAuth((s) => s.getSelectedAccount().instance);
  const linkCtx = useLinkContext();

  const subscribedCommunities = useSubscribedCommunities();
  const moderatingCommunities = useModeratingCommunities();

  const recentOpen = useSidebarStore((s) => s.mainSidebarRecent);
  const setRecentOpen = useSidebarStore((s) => s.setMainSidebarRecent);
  const subscribedOpen = useSidebarStore((s) => s.mainSidebarSubscribed);
  const setSubscribedOpen = useSidebarStore((s) => s.setMainSidebarSubscribed);
  const moderatingOpen = useSidebarStore((s) => s.mainSidebarModerating);
  const setModeratingOpen = useSidebarStore((s) => s.setMainSidebarModerating);

  let instanceHost = "";
  try {
    const url = new URL(instance);
    instanceHost = url.host;
  } catch {}

  return (
    <div className="overflow-y-auto h-full">
      {isTauri() && (
        <div
          className="h-12 -mb-6 w-full top-0 sticky bg-gradient-to-b from-background to-transparent from-30% z-10"
          data-tauri-drag-region
        />
      )}
      <button
        className={cn(
          "h-[60px] mt-3 md:mt-1 px-4 flex items-center gap-1.5",
          mainSidebarCollapse && "mx-auto",
        )}
        onClick={() => {
          const tab = document.querySelector(`ion-tab-button[tab="home"]`);
          if (tab && "click" in tab && _.isFunction(tab.click)) {
            tab.click();
          }
        }}
      >
        {icon && (
          <img
            src={icon}
            className="h-7.5 aspect-square object-cover rounded-sm"
          />
        )}
        <span
          className={cn(
            "font-jersey text-3xl",
            mainSidebarCollapse && "sr-only",
          )}
        >
          {siteTitle ?? "Loading..."}
        </span>
      </button>

      <div className="md:px-3 pt-2 pb-4 gap-0.5 flex flex-col">
        <SidebarTabs />

        {recentCommunities.length > 0 && (
          <>
            <Collapsible
              className="py-1"
              open={recentOpen}
              onOpenChange={setRecentOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-4">
                <span>{mainSidebarCollapse ? "R" : "RECENT"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapse && "items-center",
                )}
              >
                {recentCommunities.slice(0, 5).map((c) => (
                  <IonMenuToggle
                    key={c.id}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c.slug}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-4 h-10 md:rounded-xl",
                        mainSidebarCollapse && "px-2",
                      )}
                      hideText={mainSidebarCollapse}
                    />
                  </IonMenuToggle>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator className="my-2" />
          </>
        )}

        {isLoggedIn && moderatingCommunities.length > 0 && (
          <>
            <Collapsible
              className="py-1"
              open={moderatingOpen}
              onOpenChange={setModeratingOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-4">
                <span>{mainSidebarCollapse ? "M" : "MODERATING"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapse && "items-center",
                )}
              >
                {moderatingCommunities.map((c) => (
                  <IonMenuToggle
                    key={c.id}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c.slug}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-4 h-10 md:rounded-xl",
                        mainSidebarCollapse && "px-2",
                      )}
                      hideText={mainSidebarCollapse}
                    />
                  </IonMenuToggle>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-2" />
          </>
        )}

        {isLoggedIn && subscribedCommunities.length > 0 && (
          <>
            <Collapsible
              className="py-1"
              open={subscribedOpen}
              onOpenChange={setSubscribedOpen}
            >
              <CollapsibleTrigger className="uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-4">
                <span>{mainSidebarCollapse ? "S" : "SUBSCRIBED"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapse && "items-center",
                )}
              >
                {subscribedCommunities.map((c) => (
                  <IonMenuToggle
                    key={c.id}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c.slug}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-4 h-10 md:rounded-xl",
                        mainSidebarCollapse && "px-2",
                      )}
                      hideText={mainSidebarCollapse}
                    />
                  </IonMenuToggle>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-2" />
          </>
        )}

        {!mainSidebarCollapse && (
          <>
            <section className="md:hidden">
              <h2 className="px-4 pt-1 pb-3 text-sm text-muted-foreground uppercase">
                {instanceHost}
              </h2>

              <SidebarLink
                icon={<SidebarOutline />}
                to={`${linkCtx.root}sidebar`}
              >
                Sidebar
              </SidebarLink>

              <Separator className="mt-3" />
            </section>

            <SidebarLink icon={<IoSettingsOutline />} to="/settings">
              Settings
            </SidebarLink>

            <SidebarLink icon={<LockClosedOutline />} to="/privacy">
              Privacy Policy
            </SidebarLink>

            <SidebarLink icon={<ScrollTextOutline />} to="/terms">
              Terms of Use
            </SidebarLink>

            <SidebarLink icon={<DocumentsOutline />} to="/licenses">
              OSS Licenses
            </SidebarLink>
          </>
        )}
      </div>

      <div className="h-[var(--ion-safe-area-bottom)]" />
    </div>
  );
}

function SidebarLink<T extends RoutePath>({
  to,
  params,
  icon,
  children,
}: {
  to: T;
  params?: ParamsFor<T>;
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <IonMenuToggle
      className="mt-3"
      menu={LEFT_SIDEBAR_MENU_ID}
      autoHide={false}
    >
      <Link
        to={to}
        params={params as any}
        className="px-4 text-muted-foreground flex flex-row items-center gap-2"
      >
        {icon} {children}
      </Link>
    </IonMenuToggle>
  );
}

export function MainSidebarCollapseButton() {
  const mainSidebarCollapse = useSidebarStore((s) => s.mainSidebarCollapsed);
  const setMainSidebarCollapse = useSidebarStore(
    (s) => s.setMainSidebarCollapsed,
  );
  return (
    <Button
      className="fixed left-0 bottom-10 rounded-l-none z-10 pl-0! pr-1.5! max-lg:hidden text-border hover:text-foreground"
      variant="outline"
      onClick={() => setMainSidebarCollapse(!mainSidebarCollapse)}
    >
      {mainSidebarCollapse ? <ChevronRight /> : <ChevronLeft />}
    </Button>
  );
}

export function useMainSidebarWidth() {
  const mainSidebarCollapse = useSidebarStore((s) => s.mainSidebarCollapsed);
  return mainSidebarCollapse ? 90 : 270;
}
