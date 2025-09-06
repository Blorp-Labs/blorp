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
import { useLinkContext } from "../routing/link-context";
import { encodeApId } from "../lib/api/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { useRequireAuth } from "./auth-context";
import { IonMenuButton, IonMenuToggle } from "@ionic/react";
import { IoPerson, IoSettingsOutline } from "react-icons/io5";
import {
  useLogout,
  useNotificationCount,
  usePrivateMessagesCount,
} from "../lib/api";
import { LuMenu } from "react-icons/lu";
import { useConfirmationAlert, useMedia } from "../lib/hooks";
import {
  IoPersonOutline,
  IoBookmarksOutline,
  IoPersonAddOutline,
} from "react-icons/io5";
import { LEFT_SIDEBAR_MENU_ID, RIGHT_SIDEBAR_MENU_ID } from "../routing/config";
import { LogOut } from "./icons";
import { BadgeCount } from "./badge-count";
import _ from "lodash";
import { Separator } from "./ui/separator";
import { formatOrdinal } from "../lib/utils";
import { env } from "../env";

function AccountNotificationBadge({
  accountIndex,
  children,
}: {
  accountIndex: number;
  children: React.ReactNode;
}) {
  const inboxCount = useNotificationCount()[accountIndex];
  const pmCount = usePrivateMessagesCount()[accountIndex];
  return (
    <BadgeCount showBadge={!!inboxCount || !!pmCount}>{children}</BadgeCount>
  );
}

const USER_DROPDOWN_ARIA = "Open account/app settings menu";

export function UserDropdown() {
  const getConfirmation = useConfirmationAlert();
  const media = useMedia();
  const linkCtx = useLinkContext();
  const logout = useLogout();
  const requireAuth = useRequireAuth();

  const selectedAccountIndex = useAuth((s) => s.accountIndex);
  const selectedAccount = useAuth((s) => s.getSelectedAccount());
  const accounts = useAuth((s) => s.accounts);
  const setAccountIndex = useAuth((s) => s.setAccountIndex);

  const inboxCounts = useNotificationCount();
  const pmCounts = usePrivateMessagesCount();
  const count =
    _.sum(inboxCounts.filter((_, i) => i !== selectedAccountIndex)) +
    _.sum(pmCounts.filter((_, i) => i !== selectedAccountIndex));

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
          {person && person.slug?.substring(0, 1).toUpperCase()}
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
      >
        <button aria-label={USER_DROPDOWN_ARIA}>{content}</button>
      </IonMenuToggle>
    );
  }

  const [name] = person?.slug.split("@") ?? [];

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
        <DropdownMenuLabel className="flex items-center gap-2 mb-1">
          <Avatar className="h-12 w-12" key={person?.id}>
            <AvatarImage src={person?.avatar ?? undefined} />
            <AvatarFallback className="text-xl">
              {person && person.slug?.substring(0, 1).toUpperCase()}
              {!person && <IoPerson />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-row gap-2 items-center">
            <div className="flex flex-col">
              <span className="text-md line-clamp-1">{name}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">
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
                  message: `Are you sure you want to logout of ${person.slug ?? "this account"}`,
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
          {accounts.map((a, index) => {
            if (index === selectedAccountIndex) {
              return null;
            }
            const { person, instance } = parseAccountInfo(a);
            const [name] = person?.slug.split("@") ?? [];

            return (
              <DropdownMenuItem
                onClick={() => {
                  setAccountIndex(index);
                }}
                key={instance + index}
                className="relative"
              >
                <AccountNotificationBadge accountIndex={index}>
                  <Avatar key={person?.id} className="h-7 w-7">
                    <AvatarImage src={person?.avatar ?? undefined} />
                    <AvatarFallback>
                      {person && person.slug?.substring(0, 1).toUpperCase()}
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
  const logout = useLogout();
  const requireAuth = useRequireAuth();

  const selectedAccountIndex = useAuth((s) => s.accountIndex);
  const selectedAccount = useAuth((s) => s.getSelectedAccount());
  const accounts = useAuth((s) => s.accounts);
  const setAccountIndex = useAuth((s) => s.setAccountIndex);
  const inboxAcounts = useNotificationCount();
  const pmCounts = usePrivateMessagesCount();

  const { person, instance } = parseAccountInfo(selectedAccount);
  const userName = person?.slug.split("@")[0];

  return (
    <div
      className="flex flex-col gap-4 min-h-full pb-[var(--ion-safe-area-bottom)]"
      data-testid="user-sidebar-content"
    >
      <div className="flex items-center gap-3 my-1">
        <Avatar className="h-12 w-12" key={person?.id}>
          {person && <AvatarImage src={person.avatar ?? undefined} />}
          <AvatarFallback className="text-xl">
            {person && person.slug?.substring(0, 1).toUpperCase()}
            {!person && <IoPerson />}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <span className="leading-snug line-clamp-1">{userName}</span>
          <span className="text-sm text-muted-foreground line-clamp-1">
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
                  message: `Are you sure you want to logout of ${person.slug ?? "this account"}`,
                }).then(() => logout.mutate(selectedAccount))
              }
              className="flex flex-row items-center gap-2 w-full text-lg"
            >
              <LogOut className="text-muted-foreground" /> Logout
            </button>
          </IonMenuToggle>
        ) : (
          <IonMenuToggle menu={RIGHT_SIDEBAR_MENU_ID} autoHide={false}>
            <button
              onClick={() => requireAuth()}
              className="flex flex-row items-center gap-2 w-full text-lg"
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

      {accounts.map((a, index) => {
        if (index === selectedAccountIndex) {
          return null;
        }
        const { person, instance } = parseAccountInfo(a);
        const [name] = person?.slug.split("@") ?? [];
        return (
          <IonMenuToggle key={instance + index}>
            <button
              onClick={() => {
                setAccountIndex(index);
              }}
              className="flex flex-row gap-2 items-center text-left w-full"
            >
              <BadgeCount
                showBadge={!!inboxAcounts[index] || !!pmCounts[index]}
              >
                <Avatar key={person?.id}>
                  {person && <AvatarImage src={person.avatar ?? undefined} />}
                  <AvatarFallback>
                    {person && person.slug?.substring(0, 1).toUpperCase()}
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
          className="flex flex-row items-center gap-2 w-full"
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
    <IonMenuButton
      menu={LEFT_SIDEBAR_MENU_ID}
      autoHide={false}
      className="lg:hidden"
    >
      <LuMenu className="text-2xl scale-110 -ml-[7px]" />
    </IonMenuButton>
  );
}
