import { IonIcon, useIonRouter, IonMenuToggle } from "@ionic/react";
import { Link, ParamsFor } from "@/src/routing/index";
import _ from "lodash";
import { twMerge } from "tailwind-merge";
import { useRecentCommunitiesStore } from "@/src/stores/recent-communities";
import { getAccountSite, useAuth } from "@/src/stores/auth";
import { useShouldShowNsfw } from "@/src/hooks/nsfw";
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
  Shield,
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
import { useMedia } from "../hooks";
import { usePathname } from "./hooks";
import { Skeleton } from "../components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";

function useMainSidebarCollapsed() {
  const media = useMedia();
  return useSidebarStore((s) => s.mainSidebarCollapsed) && media.md;
}

function SidebarTabs() {
  const mainSidebarCollapsed = useMainSidebarCollapsed();
  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const messageCount = usePrivateMessagesCount()[selectedAccountUuid];
  const inboxCount = useNotificationCount()[selectedAccountUuid];
  const pathname = useIonRouter().routeInfo.pathname;

  return (
    <>
      {TABS.map((t) => {
        const isActive = pathname.startsWith(t.to);
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  const tab = document.querySelector(
                    `ion-tab-button[tab=${t.id}]`,
                  );
                  if (tab && "click" in tab && _.isFunction(tab.click)) {
                    tab.click();
                  }
                }}
                className={twMerge(
                  "text-md hover:bg-secondary relative flex flex-row items-center rounded-xl px-3 py-2 max-md:hidden",
                  isActive ? "bg-secondary" : "text-muted-foreground",
                  mainSidebarCollapsed && "mx-auto",
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
                  className={cn(
                    "ml-2 text-sm",
                    mainSidebarCollapsed && "sr-only",
                  )}
                >
                  {t.label}
                </span>
              </button>
            </TooltipTrigger>
            {mainSidebarCollapsed && (
              <TooltipContent side="right">{t.label}</TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </>
  );
}

function SiteTitle() {
  const accounts = useAuth((s) => s.accounts);
  const accountIndex = useAuth((s) =>
    s.accounts.findIndex((a) => a.uuid === s.getSelectedAccount().uuid),
  );
  const sites = accounts.map((a) => getAccountSite(a));
  const iconTranslationPct = 1 - (accountIndex + 1) / accounts.length;
  const titleTranslationPct = accountIndex / accounts.length;
  const siteTitle = sites[accountIndex]?.title;

  const mainSidebarCollapsed = useMainSidebarCollapsed();

  if (!siteTitle) {
    return (
      <div className="flex w-full flex-row items-center gap-1.5">
        <Skeleton className="h-7.5 w-7.5" />
        <Skeleton className="h-7 max-w-3/5 flex-1" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-row gap-1.5",
        mainSidebarCollapsed && "justify-center",
      )}
      key={accounts.length}
      aria-label={siteTitle}
    >
      <div className="h-9 w-7.5 overflow-hidden">
        <div
          className="flex flex-col transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateY(${iconTranslationPct * -100}%)`,
          }}
        >
          {sites.toReversed().map((site, index) => (
            <div key={index} className="flex h-9 items-center">
              {site?.icon && (
                <img
                  src={site.icon}
                  className="aspect-square h-7.5 rounded-sm object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      {!mainSidebarCollapsed && (
        <div className="h-9 overflow-hidden" aria-hidden>
          <div
            className="flex flex-col transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateY(${titleTranslationPct * -100}%)`,
            }}
          >
            {sites.map((site, index) => (
              <div
                key={index}
                className="flex h-9 flex-row items-center gap-1.5"
              >
                <span className="font-jersey text-3xl text-nowrap">
                  {site?.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MainSidebar() {
  const mainSidebarCollapsed = useMainSidebarCollapsed();
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

  const showNsfw = useShouldShowNsfw();

  const fiveRecentCommunities = recentCommunities
    .filter((c) => (showNsfw ? true : !c.nsfw))
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      {isTauri() && (
        <div
          className="from-background sticky top-0 z-10 -mb-6 h-12 w-full bg-gradient-to-b from-30% to-transparent"
          data-tauri-drag-region
        />
      )}
      <button
        className={cn(
          "mt-3 flex h-[60px] w-full items-center gap-1.5 px-3.5 md:mt-1",
          mainSidebarCollapsed && "mx-auto",
        )}
        onClick={() => {
          const tab = document.querySelector(`ion-tab-button[tab="home"]`);
          if (tab && "click" in tab && _.isFunction(tab.click)) {
            tab.click();
          }
        }}
      >
        <SiteTitle />
      </button>

      <div className="flex flex-col gap-0.5 pt-2 pb-4 md:px-3">
        <SidebarTabs />

        {fiveRecentCommunities.length > 0 && (
          <>
            <Separator className="my-2" />

            <Collapsible
              className="py-1"
              open={recentOpen}
              onOpenChange={setRecentOpen}
            >
              <CollapsibleTrigger
                className={cn(
                  "text-muted-foreground flex w-full items-center justify-between px-3 text-xs font-medium uppercase",
                  mainSidebarCollapsed && "justify-center px-0",
                )}
              >
                <span>{mainSidebarCollapsed ? "R" : "RECENT"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "flex flex-col gap-1 pt-2",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {fiveRecentCommunities.map((c, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div>
                        <IonMenuToggle
                          menu={LEFT_SIDEBAR_MENU_ID}
                          autoHide={false}
                        >
                          <CommunityCard
                            communitySlug={c.slug}
                            size="sm"
                            className={cn(
                              "hover:bg-secondary h-10 px-3 md:rounded-xl",
                              mainSidebarCollapsed && "px-2",
                            )}
                            hideText={mainSidebarCollapsed}
                          />
                        </IonMenuToggle>
                      </div>
                    </TooltipTrigger>
                    {mainSidebarCollapsed && (
                      <TooltipContent side="right">{c.slug}</TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {isLoggedIn && moderatingCommunities.length > 0 && (
          <>
            <Separator className="my-2" />

            <Collapsible
              className="py-1"
              open={moderatingOpen}
              onOpenChange={setModeratingOpen}
            >
              <CollapsibleTrigger
                className={cn(
                  "text-muted-foreground flex w-full items-center justify-between px-3 text-xs font-medium uppercase",
                  mainSidebarCollapsed && "justify-center px-0",
                )}
              >
                <span>{mainSidebarCollapsed ? "M" : "MODERATING"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "flex flex-col gap-1 pt-2",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {moderatingCommunities.map((c, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div>
                        <IonMenuToggle
                          menu={LEFT_SIDEBAR_MENU_ID}
                          autoHide={false}
                        >
                          <CommunityCard
                            communitySlug={c}
                            size="sm"
                            className={cn(
                              "hover:bg-secondary h-10 px-3 md:rounded-xl",
                              mainSidebarCollapsed && "px-2",
                            )}
                            hideText={mainSidebarCollapsed}
                          />
                        </IonMenuToggle>
                      </div>
                    </TooltipTrigger>
                    {mainSidebarCollapsed && (
                      <TooltipContent side="right">{c}</TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {isLoggedIn && subscribedCommunities.length > 0 && (
          <>
            <Separator className="my-2" />

            <Collapsible
              className="py-1"
              open={subscribedOpen}
              onOpenChange={setSubscribedOpen}
            >
              <CollapsibleTrigger
                className={cn(
                  "text-muted-foreground flex w-full items-center justify-between px-3 text-xs font-medium uppercase",
                  mainSidebarCollapsed && "justify-center px-0",
                )}
              >
                <span>{mainSidebarCollapsed ? "S" : "SUBSCRIBED"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "flex flex-col gap-1 pt-2",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {subscribedCommunities.map((c, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div>
                        <IonMenuToggle
                          menu={LEFT_SIDEBAR_MENU_ID}
                          autoHide={false}
                        >
                          <CommunityCard
                            communitySlug={c}
                            size="sm"
                            className={cn(
                              "hover:bg-secondary h-10 px-3 md:rounded-xl",
                              mainSidebarCollapsed && "px-2",
                            )}
                            hideText={mainSidebarCollapsed}
                          />
                        </IonMenuToggle>
                      </div>
                    </TooltipTrigger>
                    {mainSidebarCollapsed && (
                      <TooltipContent side="right">{c}</TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {!mainSidebarCollapsed && (
          <>
            <Separator className="my-2" />

            <section className="md:hidden">
              <h2 className="text-muted-foreground px-4 pt-1 pb-3 text-sm uppercase">
                {instanceHost}
              </h2>

              <SidebarLink
                icon={<SidebarOutline />}
                to={`${linkCtx.root}sidebar`}
              >
                Sidebar
              </SidebarLink>

              <SidebarLink icon={<Shield />} to={`${linkCtx.root}modlog`}>
                Modlog
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
        className="text-muted-foreground flex flex-row items-center gap-2 px-4"
      >
        <>
          {icon} {children}
        </>
      </Link>
    </IonMenuToggle>
  );
}

function useIsLightboxRoute() {
  const path = usePathname().replace(/\/$/, "");
  return /\/lightbox(\/|\?|$)/.test(path);
}

export function MainSidebarCollapseButton() {
  const mainSidebarCollapsed = useMainSidebarCollapsed();
  const setMainSidebarCollapsed = useSidebarStore(
    (s) => s.setMainSidebarCollapsed,
  );
  const isLightbox = useIsLightboxRoute();
  return (
    <Button
      className={cn(
        "text-border hover:text-foreground fixed bottom-25 left-0 z-10 rounded-l-none border-l-0 bg-transparent pr-1.5! pl-0! opacity-75 duration-75 hover:opacity-100 max-lg:hidden",
        isLightbox && "dark",
      )}
      variant="outline"
      onClick={() => setMainSidebarCollapsed(!mainSidebarCollapsed)}
    >
      {mainSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
    </Button>
  );
}

export function useMainSidebarWidth() {
  const mainSidebarCollapsed = useMainSidebarCollapsed();
  return mainSidebarCollapsed ? 80 : 270;
}
