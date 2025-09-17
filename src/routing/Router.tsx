import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonContent,
  IonIcon,
  IonRouterOutlet,
  IonSplitPane,
  IonMenu,
  useIonRouter,
  IonBadge,
  IonLabel,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Redirect } from "@/src/routing/index";
import _ from "lodash";
import { useMedia } from "@/src/lib/hooks/index";
import { useNotificationCount, usePrivateMessagesCount } from "@/src/lib/api";
import { lazy } from "react";
import { dispatchScrollEvent } from "@/src/lib/scroll-events";
import { isAndroid, isTauri } from "@/src/lib/device";
import { AppUrlListener } from "@/src/components/universal-links";
import { CreatePost } from "@/src/features/create-post";
import { cn } from "../lib/utils";
import { UserSidebar } from "../components/nav";
import { MainSidebar } from "./MainSidebar";
import { LEFT_SIDEBAR_MENU_ID, RIGHT_SIDEBAR_MENU_ID, TABS } from "./config";
import InstanceSidebar from "../features/instance-sidebar";
import { getAccountSite, useAuth } from "../stores/auth";
import { usePathname } from "./hooks";

const CSAE = lazy(() => import("@/src/features/csae"));
const NotFound = lazy(() => import("@/src/features/not-found"));
const ApResolver = lazy(() => import("@/src/features/resolver"));
const Download = lazy(() => import("@/src/features/download"));
const Inbox = lazy(() => import("@/src/features/inbox"));
const Messages = lazy(() => import("@/src/features/messages/messages-screen"));
const MessagesChat = lazy(
  () => import("@/src/features/messages/messages-chat-screen"),
);
const Privacy = lazy(() => import("@/src/features/privacy"));
const OSLicenses = lazy(() => import("@/src/features/licenses"));
const Terms = lazy(() => import("@/src/features/terms"));
const Support = lazy(() => import("@/src/features/support"));
const HomeFeed = lazy(() => import("@/src/features/home-feed"));
const Post = lazy(() => import("@/src/features/post"));
const SettingsPage = lazy(
  () => import("@/src/features/settings/settings-screen"),
);
const ManageBlocks = lazy(
  () => import("@/src/features/settings/manage-blocks-screen"),
);
const UpdateProfile = lazy(
  () => import("@/src/features/settings/update-profile-screen"),
);
const CommunityFeed = lazy(() => import("@/src/features/community-feed"));
const CommunitySidebar = lazy(() => import("@/src/features/community-sidebar"));
const CommunitiesFeed = lazy(() => import("@/src/features/communities-feed"));
const User = lazy(() => import("@/src/features/user"));
const SavedFeed = lazy(() => import("@/src/features/saved-feed"));
const Search = lazy(() => import("@/src/features/search/search-screen"));
const LightBoxPostFeed = lazy(
  () => import("@/src/features/light-box/light-box-post-feed"),
);
const LightBox = lazy(() => import("@/src/features/light-box/light-box"));

const Instance = lazy(() => import("@/src/features/instance"));

const SKIP_NAV_ID = "#main";
function SkipNav() {
  return (
    <a
      className="transition left-0 bg-brand text-brand-foreground absolute p-3 z-50 opacity-0 pointer-events-none focus:opacity-100 focus:pointer-events-auto"
      href={SKIP_NAV_ID}
    >
      Skip Navigation
    </a>
  );
}

function useMenuSwipeEnabled(side: "from-right" | "from-left") {
  const path = usePathname();
  if (side === "from-left") {
    switch (path) {
      case "/home":
      case "/communities":
      case "/create":
      case "/inbox":
      case "/messages":
        return true;
      default:
        return false;
    }
  } else {
    if (isAndroid()) {
      return false;
    }
    // I wanted to prevent this from matching
    // communities named lightbox
    return !/\/lightbox(\/|\?|$)/.test(path);
  }
}

const HOME_STACK = [
  <Route key="/home/*" path="/home/*" component={NotFound} />,
  <Route key="/home" exact path="/home" component={HomeFeed} />,
  <Route key="/home/s" exact path="/home/s" component={Search} />,
  <Route
    key="/home/c/:communityName"
    exact
    path="/home/c/:communityName"
    component={CommunityFeed}
  />,
  <Route key="/home/c/:communityName/s" exact path="/home/c/:communityName/s">
    <Search scope="community" />
  </Route>,
  <Route
    key="/home/sidebar"
    exact
    path="/home/sidebar"
    component={InstanceSidebar}
  />,
  <Route
    key="/home/c/:communityName/sidebar"
    exact
    path="/home/c/:communityName/sidebar"
    component={CommunitySidebar}
  />,
  <Route
    key="/home/c/:communityName/posts/:post"
    exact
    path="/home/c/:communityName/posts/:post"
    component={Post}
  />,
  <Route
    key="/home/c/:communityName/posts/:post/comments/:comment"
    exact
    path="/home/c/:communityName/posts/:post/comments/:comment"
    component={Post}
  />,
  <Route key="/home/u/:userId" exact path="/home/u/:userId" component={User} />,
  <Route key="/home/saved" exact path="/home/saved" component={SavedFeed} />,
  <Route
    key="/home/lightbox"
    exact
    path="/home/lightbox"
    component={LightBoxPostFeed}
  />,
  <Route
    key="/home/lightbox/c/:communityName"
    exact
    path="/home/c/:communityName/lightbox"
    component={LightBoxPostFeed}
  />,
  <Route
    key="/home/lightbox/:imgUrl"
    exact
    path="/home/lightbox/:imgUrl"
    component={LightBox}
  />,
];

const CREATE_POST_STACK = [
  <Route key="/create/*" path="/create/*" component={NotFound} />,
  <Route key="/create" exact path="/create" component={CreatePost} />,
];

const COMMUNITIES_STACK = [
  <Route key="/communities/*" path="/communities/*" component={NotFound} />,
  <Route
    key="/communities"
    exact
    path="/communities"
    component={CommunitiesFeed}
  />,
  <Route key="/communities/s" exact path="/communities/s">
    <Search defaultType="communities" />
  </Route>,
  <Route
    key="/communities/sidebar"
    exact
    path="/communities/sidebar"
    component={InstanceSidebar}
  />,
  <Route
    key="/communities/c/:communityName"
    exact
    path="/communities/c/:communityName"
    component={CommunityFeed}
  />,
  <Route
    key="/communities/c/:communityName/s"
    exact
    path="/communities/c/:communityName/s"
  >
    <Search scope="community" />
  </Route>,
  <Route
    key="/communities/c/:communityName/sidebar"
    exact
    path="/communities/c/:communityName/sidebar"
    component={CommunitySidebar}
  />,
  <Route
    key="/communities/c/:communityName/posts/:post"
    exact
    path="/communities/c/:communityName/posts/:post"
    component={Post}
  />,
  <Route
    key="/communities/c/:communityName/posts/:post/comments/:comment"
    exact
    path="/communities/c/:communityName/posts/:post/comments/:comment"
    component={Post}
  />,
  <Route
    key="/communities/u/:userId"
    exact
    path="/communities/u/:userId"
    component={User}
  />,
  <Route
    key="/communities/lightbox/c/:communityName"
    exact
    path="/communities/c/:communityName/lightbox"
    component={LightBoxPostFeed}
  />,
  <Route
    key="/communities/lightbox/:imgUrl"
    exact
    path="/communities/lightbox/:imgUrl"
    component={LightBox}
  />,
];

const INBOX_STACK = [
  <Route key="/inbox/*" path="/inbox/*" component={NotFound} />,
  <Route key="/inbox" exact path="/inbox" component={Inbox} />,
  <Route key="/inbox/s" exact path="/inbox/s" component={Search} />,
  <Route
    key="/inbox/c/:communityName"
    exact
    path="/inbox/c/:communityName"
    component={CommunityFeed}
  />,
  <Route key="/inbox/c/:communityName/s" exact path="/inbox/c/:communityName/s">
    <Search scope="community" />
  </Route>,
  <Route
    key="/inbox/sidebar"
    exact
    path="/inbox/sidebar"
    component={InstanceSidebar}
  />,
  <Route
    key="/inbox/c/:communityName/sidebar"
    exact
    path="/inbox/c/:communityName/sidebar"
    component={CommunitySidebar}
  />,
  <Route
    key="/inbox/c/:communityName/posts/:post"
    exact
    path="/inbox/c/:communityName/posts/:post"
    component={Post}
  />,
  <Route
    key="/inbox/c/:communityName/posts/:post/comments/:comment"
    exact
    path="/inbox/c/:communityName/posts/:post/comments/:comment"
    component={Post}
  />,
  <Route
    key="/inbox/u/:userId"
    exact
    path="/inbox/u/:userId"
    component={User}
  />,
  <Route
    key="/inbox/lightbox/c/:communityName"
    exact
    path="/inbox/c/:communityName/lightbox"
    component={LightBoxPostFeed}
  />,
  <Route
    key="/inbox/lightbox"
    exact
    path="/inbox/lightbox/:imgUrl"
    component={LightBox}
  />,
];

const MESSAGES_STACK = [
  <Route key="/messages/*" path="/messages/*" component={NotFound} />,
  <Route key="/message" exact path="/messages" component={Messages} />,
  <Route
    key="/message/chat/:userId"
    exact
    path="/messages/chat/:userId"
    component={MessagesChat}
  />,
];

const SETTINGS = [
  <Route key="/settings/*" path="/settings/*" component={NotFound} />,
  <Route key="/settings" exact path="/settings" component={SettingsPage} />,
  <Route
    key="/settings/manage-blocks/:index"
    exact
    path="/settings/manage-blocks/:index"
    component={ManageBlocks}
  />,
  <Route
    key="/settings/UpdateProfile/:index"
    exact
    path="/settings/update-profile/:index"
    component={UpdateProfile}
  />,
];

function Tabs() {
  const fromLeftSwipeEnabled = useMenuSwipeEnabled("from-left");
  const fromRightSwipeEnabled = useMenuSwipeEnabled("from-right");
  const selectedAccountIndex = useAuth((s) => s.accountIndex);
  const inboxCount = useNotificationCount()[selectedAccountIndex];
  const messageCount = usePrivateMessagesCount()[selectedAccountIndex];
  const media = useMedia();
  const pathname = useIonRouter().routeInfo.pathname;
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const icon = site?.icon;
  const siteTitle = site?.title;

  return (
    <>
      <SkipNav />
      <IonMenu
        swipeGesture={fromRightSwipeEnabled}
        menuId={RIGHT_SIDEBAR_MENU_ID}
        contentId="main"
        side="end"
        type="push"
        style={{
          "--side-max-width": "270px",
        }}
      >
        <div className="h-[var(--ion-safe-area-top)]" />

        <IonContent scrollY={false}>
          <div className="overflow-y-auto h-full p-4">
            <UserSidebar />
            <div className="h-[var(--ion-safe-area-buttom)]" />
          </div>
        </IonContent>
      </IonMenu>

      <IonSplitPane when="lg" contentId="main">
        <IonMenu
          swipeGesture={fromLeftSwipeEnabled}
          type="push"
          contentId="main"
          menuId={LEFT_SIDEBAR_MENU_ID}
          style={{
            "--side-max-width": "270px",
          }}
        >
          <div className="h-[var(--ion-safe-area-top)]" />

          <IonContent scrollY={false}>
            <div className="overflow-y-auto h-full">
              {isTauri() && (
                <div
                  className="h-12 -mb-6 w-full top-0 sticky bg-gradient-to-b from-background to-transparent from-30% z-10"
                  data-tauri-drag-region
                />
              )}
              <button
                className="h-[60px] mt-3 md:mt-1 px-4 flex items-center"
                onClick={() => {
                  const tab = document.querySelector(
                    `ion-tab-button[tab="home"]`,
                  );
                  if (tab && "click" in tab && _.isFunction(tab.click)) {
                    tab.click();
                  }
                }}
              >
                {icon && (
                  <img
                    src={icon}
                    className="h-7.5 mr-1.5 aspect-square object-cover rounded-sm"
                  />
                )}
                <span className="font-jersey text-3xl">
                  {siteTitle ?? "Loading..."}
                </span>
              </button>

              <div className="md:px-3 pt-2 pb-4 gap-0.5 flex flex-col">
                <MainSidebar />
              </div>

              <div className="h-[var(--ion-safe-area-bottom)]" />
            </div>
          </IonContent>
        </IonMenu>

        <IonContent id="main" scrollY={false}>
          <IonTabs>
            <IonRouterOutlet animated={media.maxMd}>
              {...HOME_STACK}
              {...COMMUNITIES_STACK}
              {...CREATE_POST_STACK}
              {...INBOX_STACK}
              {...MESSAGES_STACK}
              {...SETTINGS}
              <Redirect
                key="/c/:communityName"
                exact
                path="/c/:communityName"
                to="/home/c/:communityName"
              />
              <Redirect
                key="/u/:userId"
                exact
                path="/u/:userId"
                to="/home/u/:userId"
              />

              <Route exact path="/instance" component={Instance} />
              <Route exact path="/post/:id" component={ApResolver} />
              <Route exact path="/user/:id" component={ApResolver} />
              <Route exact path="/c/:id" component={ApResolver} />
              <Route exact path="/download" component={Download} />
              <Route exact path="/support" component={Support} />
              <Route exact path="/privacy" component={Privacy} />
              <Route exact path="/licenses" component={OSLicenses} />
              <Route exact path="/terms" component={Terms} />
              <Route exact path="/csae" component={CSAE} />
              <Redirect exact from="/" to="/home" />
            </IonRouterOutlet>

            <IonTabBar slot="bottom" className="lg:hidden">
              {TABS.map((t) => {
                const isActive = pathname.startsWith(t.to);
                return (
                  <IonTabButton
                    key={t.id}
                    tab={t.id}
                    href={t.to}
                    onClick={() => {
                      const isRoot = pathname === t.to;
                      if (isRoot) {
                        dispatchScrollEvent(pathname);
                      }
                    }}
                    className={cn(isActive && "text-foreground")}
                  >
                    <IonIcon
                      icon={t.icon(isActive)}
                      key={isActive ? "active" : "inactive"}
                    />
                    <IonLabel>{t.label}</IonLabel>
                    {((t.id === "inbox" && !!inboxCount) ||
                      (t.id === "messages" && !!messageCount)) && (
                      <IonBadge className="aspect-square bg-brand"> </IonBadge>
                    )}
                  </IonTabButton>
                );
              })}
            </IonTabBar>
          </IonTabs>
        </IonContent>
      </IonSplitPane>
    </>
  );
}

export default function Router() {
  return (
    <IonReactRouter>
      <Tabs />
      <AppUrlListener />
    </IonReactRouter>
  );
}
