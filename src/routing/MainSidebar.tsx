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
import { useMedia } from "../lib/hooks";
import { usePathname } from "./hooks";
import { Skeleton } from "../components/ui/skeleton";

function useMainSidebarCollapsed() {
  const media = useMedia();
  return useSidebarStore((s) => s.mainSidebarCollapsed) && media.md;
}

function SidebarTabs() {
  const mainSidebarCollapsed = useMainSidebarCollapsed();
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
              className={cn("text-sm ml-2", mainSidebarCollapsed && "sr-only")}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </>
  );
}

function SiteTitle() {
  const accounts = useAuth((s) => s.accounts);
  const accountIndex = useAuth((s) => s.accountIndex);
  const sites = accounts.map((a) => getAccountSite(a));
  const iconTranslationPct = 1 - (accountIndex + 1) / accounts.length;
  const titleTranslationPct = accountIndex / accounts.length;
  const siteTitle = sites[accountIndex]?.title;

  const mainSidebarCollapsed = useMainSidebarCollapsed();

  if (!siteTitle) {
    return (
      <div className="flex flex-row items-center gap-1.5 w-full">
        <Skeleton className="h-7.5 w-7.5" />
        <Skeleton className="flex-1 max-w-3/5 h-7" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-row gap-1.5 w-full",
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
            <div key={index} className="h-9 flex items-center">
              {site?.icon && (
                <img
                  src={site.icon}
                  className="h-7.5 aspect-square object-cover rounded-sm"
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
                className="h-9 flex flex-row items-center gap-1.5"
              >
                <span className="font-jersey text-3xl">{site?.title}</span>
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
          "h-[60px] w-full mt-3 md:mt-1 px-3.5 flex items-center gap-1.5",
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

      <div className="md:px-3 pt-2 pb-4 gap-0.5 flex flex-col">
        <SidebarTabs />

        {recentCommunities.length > 0 && (
          <>
            <Separator className="my-2" />

            <Collapsible
              className="py-1"
              open={recentOpen}
              onOpenChange={setRecentOpen}
            >
              <CollapsibleTrigger
                className={cn(
                  "uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-3",
                  mainSidebarCollapsed && "px-0 justify-center",
                )}
              >
                <span>{mainSidebarCollapsed ? "R" : "RECENT"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {recentCommunities.slice(0, 5).map((c, index) => (
                  <IonMenuToggle
                    key={index}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c.slug}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-3 h-10 md:rounded-xl",
                        mainSidebarCollapsed && "px-2",
                      )}
                      hideText={mainSidebarCollapsed}
                    />
                  </IonMenuToggle>
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
                  "uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-3",
                  mainSidebarCollapsed && "px-0 justify-center",
                )}
              >
                <span>{mainSidebarCollapsed ? "M" : "MODERATING"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {moderatingCommunities.map((c, index) => (
                  <IonMenuToggle
                    key={index}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-3 h-10 md:rounded-xl",
                        mainSidebarCollapsed && "px-2",
                      )}
                      hideText={mainSidebarCollapsed}
                    />
                  </IonMenuToggle>
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
                  "uppercase text-xs font-medium text-muted-foreground flex items-center justify-between w-full px-3",
                  mainSidebarCollapsed && "px-0 justify-center",
                )}
              >
                <span>{mainSidebarCollapsed ? "S" : "SUBSCRIBED"}</span>
                <ChevronsUpDown className="h-4 w-4" />
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "pt-2 flex flex-col gap-1",
                  mainSidebarCollapsed && "items-center",
                )}
              >
                {subscribedCommunities.map((c, index) => (
                  <IonMenuToggle
                    key={index}
                    menu={LEFT_SIDEBAR_MENU_ID}
                    autoHide={false}
                  >
                    <CommunityCard
                      communitySlug={c}
                      size="sm"
                      className={cn(
                        "hover:bg-secondary px-3 h-10 md:rounded-xl",
                        mainSidebarCollapsed && "px-2",
                      )}
                      hideText={mainSidebarCollapsed}
                    />
                  </IonMenuToggle>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {!mainSidebarCollapsed && (
          <>
            <Separator className="my-2" />

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
        className="px-4 text-muted-foreground flex flex-row items-center gap-2"
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
        "fixed left-0 bottom-25 rounded-l-none z-10 pl-0! pr-1.5! max-lg:hidden text-border opacity-75 hover:opacity-100 hover:text-foreground border-l-0 bg-transparent duration-75",
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
