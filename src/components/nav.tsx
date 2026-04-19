import { Link } from "@/src/routing/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/src/components/ui/dropdown-menu";
import { parseAccountInfo, useAuth } from "../stores/auth";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { encodeApId, parseHandle } from "../apis/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { IonMenuButton, IonMenuToggle } from "@ionic/react";
import {
  IoPerson,
  IoSettingsOutline,
  IoPersonOutline,
  IoBookmarksOutline,
  IoPersonAddOutline,
} from "react-icons/io5";
import {
  useLogoutMutation,
  // eslint-disable-next-line local/no-query-hooks-in-components -- the nav bar is persistent app chrome shown on every route. No feature owns it, so badge counts can't be fetched upstream and passed down.
  useNotificationCountQuery,
  // eslint-disable-next-line local/no-query-hooks-in-components -- same as above
  usePrivateMessagesCountQuery,
} from "../queries";
import { LuMenu } from "react-icons/lu";
import { useConfirmationAlert, useMedia, useRequireAuth } from "../hooks";
import { LEFT_SIDEBAR_MENU_ID, RIGHT_SIDEBAR_MENU_ID } from "../routing/config";
import { LogOut } from "./icons";
import { BadgeCount } from "./badge-count";
import _ from "lodash";
import { Separator } from "./ui/separator";
import { formatOrdinal } from "../lib/utils";
import { env } from "../env";
import { Button } from "./ui/button";

function AccountNotificationBadge({
  accountUuid,
  children,
}: {
  accountUuid: string;
  children: React.ReactNode;
}) {
  const inboxCount = useNotificationCountQuery()[accountUuid];
  const pmCount = usePrivateMessagesCountQuery()[accountUuid];
  return (
    <BadgeCount showBadge={!!inboxCount || !!pmCount}>{children}</BadgeCount>
  );
}

const USER_DROPDOWN_ARIA = "Open account/app settings menu";

export function UserDropdown() {
  const getConfirmation = useConfirmationAlert();
  const media = useMedia();
  const linkCtx = useLinkContext();
  const logout = useLogoutMutation();
  const requireAuth = useRequireAuth();

  const selectedAccountUuid = useAuth((s) => s.getSelectedAccount().uuid);
  const selectedAccount = useAuth((s) => s.getSelectedAccount());
  const accounts = useAuth((s) => s.accounts);
  const selectAccount = useAuth((s) => s.selectAccount);

  const inboxCounts = useNotificationCountQuery();
  const pmCounts = usePrivateMessagesCountQuery();
  const count =
    _.sum(
      Object.entries(inboxCounts)
        .filter(([k]) => k !== selectedAccountUuid)
        .map(([, v]) => v),
    ) +
    _.sum(
      Object.entries(pmCounts)
        .filter(([k]) => k !== selectedAccountUuid)
        .map(([, v]) => v),
    );

  const { person, instance } = parseAccountInfo(selectedAccount);

  const content = (
    <BadgeCount showBadge={!!count}>
      <Avatar key={person ? 0 : 1}>
        {person && (
          <AvatarImage
            src={person.avatar ?? undefined}
            className="object-cover"
          />
        )}
        <AvatarFallback>
          {person && person.handle?.substring(0, 1).toUpperCase()}
          {!person && <IoPerson />}
        </AvatarFallback>
      </Avatar>
    </BadgeCount>
  );

  if (media.maxMd) {
    return (
      <IonMenuToggle
        menu={RIGHT_SIDEBAR_MENU_ID}
        autoHide={false}
        data-testid="user-sidebar-trigger"
        className="contents"
      >
        <Button variant="outline" size="icon" aria-label={USER_DROPDOWN_ARIA}>
          {content}
        </Button>
      </IonMenuToggle>
    );
  }

  const { name } = parseHandle(person?.handle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="user-dropdown-trigger"
        aria-label={USER_DROPDOWN_ARIA}
      >
        {content}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60"
        data-testid="user-dropdown-content"
      >
        <DropdownMenuLabel className="mb-1 flex items-center gap-2">
          <Avatar className="h-12 w-12" key={person?.id}>
            <AvatarImage src={person?.avatar ?? undefined} />
            <AvatarFallback className="text-xl">
              {person && person.handle?.substring(0, 1).toUpperCase()}
              {!person && <IoPerson />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-row items-center gap-2">
            <div className="flex flex-col">
              <span className="text-md line-clamp-1">{name}</span>
              <span className="text-muted-foreground line-clamp-1 text-xs">
                @{instance}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <>
          {person && (
            <Link to="/home/saved">
              <DropdownMenuItem>
                <IoBookmarksOutline /> Saved
              </DropdownMenuItem>
            </Link>
          )}
          {person && (
            <Link
              to={`${linkCtx.root}u/:userId`}
              params={{
                userId: encodeApId(person.apId),
              }}
            >
              <DropdownMenuItem>
                <IoPersonOutline /> Profile
              </DropdownMenuItem>
            </Link>
          )}
          {person ? (
            <DropdownMenuItem
              onClick={() =>
                getConfirmation({
                  message: `Are you sure you want to logout of ${person.handle ?? "this account"}`,
                }).then(() => logout.mutate(selectedAccount))
              }
            >
              <LogOut />
              Logout
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => requireAuth()}
              data-testid="user-dropdown-login"
            >
              Login / Signup
              {env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
                ? ""
                : " / Change instance"}
            </DropdownMenuItem>
          )}
        </>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Other accounts</DropdownMenuLabel>

        <>
          {accounts.map((a) => {
            if (a.uuid === selectedAccountUuid) {
              return null;
            }
            const { person, instance } = parseAccountInfo(a);
            const { name } = parseHandle(person?.handle);

            return (
              <DropdownMenuItem
                onClick={() => {
                  selectAccount(a.uuid);
                }}
                key={a.uuid}
                className="relative"
              >
                <AccountNotificationBadge accountUuid={a.uuid}>
                  <Avatar key={person?.id} className="h-7 w-7">
                    <AvatarImage src={person?.avatar ?? undefined} />
                    <AvatarFallback>
                      {person && person.handle?.substring(0, 1).toUpperCase()}
                      {!person && <IoPerson />}
                    </AvatarFallback>
                  </Avatar>
                </AccountNotificationBadge>
                <div className="flex flex-col text-xs leading-4">
                  <span>{name}</span>
                  <span className="text-muted-foreground">@{instance}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem
            onClick={() => {
              requireAuth({ addAccount: true });
            }}
          >
            <IoPersonAddOutline />
            Add {formatOrdinal(accounts.length + 1)} account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Link to={`/settings`}>
            <DropdownMenuItem>
              <IoSettingsOutline /> Settings
            </DropdownMenuItem>
          </Link>
        </>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserSidebar() {
  const getConfirmation = useConfirmationAlert();
  const linkCtx = useLinkContext();
  const logout = useLogoutMutation();
  const requireAuth = useRequireAuth();

  const selectedAccount = useAuth((s) => s.getSelectedAccount());
  const accounts = useAuth((s) => s.accounts);
  const selectAccount = useAuth((s) => s.selectAccount);
  const inboxAcounts = useNotificationCountQuery();
  const pmCounts = usePrivateMessagesCountQuery();

  const { person, instance } = parseAccountInfo(selectedAccount);
  const userName = parseHandle(person?.handle).name;

  return (
    <div
      className="flex min-h-full flex-col gap-4 pb-[var(--ion-safe-area-bottom)]"
      data-testid="user-sidebar-content"
    >
      <div className="my-1 flex items-center gap-3">
        <Avatar className="h-12 w-12" key={person?.id}>
          {person && <AvatarImage src={person.avatar ?? undefined} />}
          <AvatarFallback className="text-xl">
            {person && person.handle?.substring(0, 1).toUpperCase()}
            {!person && <IoPerson />}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <span className="line-clamp-1 leading-snug">{userName}</span>
          <span className="text-muted-foreground line-clamp-1 text-sm">
            @{instance}
          </span>
        </div>
      </div>

      <>
        {person && (
          <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
            <Link
              to="/home/saved"
              className="flex flex-row items-center gap-2 text-lg"
            >
              <IoBookmarksOutline className="text-muted-foreground" />
              Saved
            </Link>
          </IonMenuToggle>
        )}
        {person && (
          <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
            <Link
              to={`${linkCtx.root}u/:userId`}
              params={{
                userId: encodeApId(person.apId),
              }}
              className="flex flex-row items-center gap-2 text-lg"
            >
              <IoPersonOutline className="text-muted-foreground" /> Profile
            </Link>
          </IonMenuToggle>
        )}

        {person ? (
          <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
            <button
              onClick={() =>
                getConfirmation({
                  message: `Are you sure you want to logout of ${person.handle ?? "this account"}`,
                }).then(() => logout.mutate(selectedAccount))
              }
              className="flex w-full flex-row items-center gap-2 text-lg"
            >
              <LogOut className="text-muted-foreground" /> Logout
            </button>
          </IonMenuToggle>
        ) : (
          <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
            <button
              onClick={() => requireAuth()}
              className="flex w-full flex-row items-center gap-2 text-lg"
              data-testid="user-sidebar-login"
            >
              Login / Signup
              {env.REACT_APP_LOCK_TO_DEFAULT_INSTANCE
                ? ""
                : " / Change instance"}
            </button>
          </IonMenuToggle>
        )}
      </>

      <Separator />

      <span>Other accounts</span>

      {accounts.map((a) => {
        if (a.uuid === selectedAccount.uuid) {
          return null;
        }
        const { person, instance } = parseAccountInfo(a);
        const { name } = parseHandle(person?.handle);
        return (
          <IonMenuToggle key={a.uuid}>
            <button
              onClick={() => {
                selectAccount(a.uuid);
              }}
              className="flex w-full flex-row items-center gap-2 text-left"
            >
              <BadgeCount
                showBadge={!!inboxAcounts[a.uuid] || !!pmCounts[a.uuid]}
              >
                <Avatar key={person?.id}>
                  {person && <AvatarImage src={person.avatar ?? undefined} />}
                  <AvatarFallback>
                    {person && person.handle?.substring(0, 1).toUpperCase()}
                    {!person && <IoPerson />}
                  </AvatarFallback>
                </Avatar>
              </BadgeCount>
              <div className="flex flex-col">
                <span>{name}</span>
                <span className="text-muted-foreground text-xs">
                  @{instance}
                </span>
              </div>
            </button>
          </IonMenuToggle>
        );
      })}

      <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
        <button
          onClick={() => {
            requireAuth({ addAccount: true });
          }}
          className="flex w-full flex-row items-center gap-2"
        >
          <IoPersonAddOutline className="text-muted-foreground" />
          Add {formatOrdinal(
            accounts.length + 1,
          )} account
        </button>
      </IonMenuToggle>

      <Separator />
      <div className="flex-1" />

      <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
        <Link
          to={`/settings`}
          className="flex flex-row items-center gap-2 text-lg"
        >
          <IoSettingsOutline className="text-muted-foreground" /> Settings
        </Link>
      </IonMenuToggle>
    </div>
  );
}

export function MenuButton() {
  // Negative margin aligns icon left side with button left side
  return (
    <Button asChild variant="ghost" size="icon" className="lg:hidden -ms-1.5">
      <IonMenuButton menu={LEFT_SIDEBAR_MENU_ID} autoHide={false}>
        <LuMenu className="-scale-110 text-2xl" />
      </IonMenuButton>
    </Button>
  );
}
