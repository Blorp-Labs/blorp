import { useEffect, useId, useState } from "react";
import { useSettingsStore } from "@/src/stores/settings";
import { useLogout } from "@/src/lib/api/index";
import { Account, parseAccountInfo, useAuth } from "@/src/stores/auth";
import { useRequireAuth } from "@/src/components/auth-context";
import { ContentGutters } from "@/src/components/gutters";
import _ from "lodash";
import { Logo } from "@/src/components/logo";
import pkgJson from "@/package.json";
import { getDbSizes } from "@/src/lib/create-storage";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToggle,
  IonToolbar,
} from "@ionic/react";
import { MenuButton, UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { PersonCard } from "@/src/components/person/person-card";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { openUrl } from "@/src/lib/linking";
import { resolveRoute } from "@/src/routing";
import { SectionItem, Section } from "./shared-components";
import { useConfirmationAlert, useIsActiveRoute } from "@/src/lib/hooks/index";
import { DebouncedInput } from "@/src/components/debounced-input";
import { FiChevronRight } from "react-icons/fi";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

const version =
  _.isObject(pkgJson) && "version" in pkgJson ? pkgJson.version : undefined;

function AccountCard({
  account,
  accountIndex,
  hasOtherAccounts,
}: {
  account: Account;
  accountIndex: number;
  hasOtherAccounts: boolean;
}) {
  const modalTriggerId = useId();

  const getConfirmation = useConfirmationAlert();
  const requireAuth = useRequireAuth();
  const logout = useLogout();
  const logoutZustand = useAuth((s) => s.logout);
  const { person, instance } = parseAccountInfo(account);
  const isLoggedIn = Boolean(account.jwt);

  return (
    <Section title={`ACCOUNT ${accountIndex + 1}`}>
      {person && (
        <SectionItem unstyled>
          <PersonCard actorId={person.apId} person={person} size="sm" />
        </SectionItem>
      )}

      {isLoggedIn && (
        <>
          <SectionItem
            to={resolveRoute("/settings/update-profile/:index", {
              index: String(accountIndex),
            })}
          >
            Update Profile
            <FiChevronRight className="text-xl" />
          </SectionItem>

          <SectionItem
            to={resolveRoute("/settings/manage-blocks/:index", {
              index: String(accountIndex),
            })}
          >
            Manage Blocks
            <FiChevronRight className="text-xl" />
          </SectionItem>

          <SectionItem
            onClick={() => {
              getConfirmation({
                header: `Delete Account?`,
                message:
                  "You’ll be taken to Lemmy’s website to confirm deletion. Continue?",
                danger: true,
                confirmText: "Continue",
              }).then(() => {
                if (Capacitor.isNativePlatform()) {
                  Browser.open({
                    url: `${account.instance}settings`,
                  });
                } else {
                  openUrl(`${account.instance}settings`);
                }
              });
            }}
            rel="noopener noreferrer"
            id={modalTriggerId}
          >
            Delete account
          </SectionItem>
        </>
      )}

      <SectionItem
        onClick={() => {
          if (isLoggedIn && person) {
            getConfirmation({
              message: `Are you sure you want to logout of ${person.slug ?? "this account"}`,
            }).then(() => logout.mutate(account));
          } else if (hasOtherAccounts) {
            logoutZustand(accountIndex);
          } else {
            requireAuth();
          }
        }}
      >
        {[
          isLoggedIn ? "Logout" : hasOtherAccounts ? "Remove" : "Login",
          person ? person.slug : hasOtherAccounts ? instance : null,
        ]
          .filter(Boolean)
          .join(" ")}
      </SectionItem>
    </Section>
  );
}

function AccountSection() {
  const accounts = useAuth((s) => s.accounts);
  return (
    <>
      {accounts.map((a, index) => {
        const { instance } = parseAccountInfo(a);
        return (
          <AccountCard
            key={instance + index}
            accountIndex={index}
            account={a}
            hasOtherAccounts={accounts.length > 1}
          />
        );
      })}
    </>
  );
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024); // Convert bytes to MB
  return `${mb.toFixed(2)} MB`; // Round to 2 decimal places
}

function CacheSection() {
  const [cacheSizes, setCacheSizes] = useState<Readonly<[string, number]>[]>(
    [],
  );

  const isActive = useIsActiveRoute();
  useEffect(() => {
    if (isActive) {
      getDbSizes().then(setCacheSizes);
    }
  }, [isActive]);

  const totalSize = cacheSizes.reduce((acc, [_, size]) => acc + size, 0);

  return (
    <>
      <Section title="STORAGE">
        <SectionItem>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              Cache {formatSize(totalSize)}
            </span>

            {totalSize > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row flex-1 gap-px rounded-md overflow-hidden">
                  {cacheSizes.map(([key, size], index) => (
                    <Tooltip key={key}>
                      <TooltipTrigger
                        className="h-6 bg-foreground/50"
                        style={{
                          width: `${(size / totalSize) * 100}%`,
                          opacity:
                            (cacheSizes.length - index) / cacheSizes.length,
                        }}
                      ></TooltipTrigger>
                      <TooltipContent>
                        {key}: {formatSize(size)}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <div className="flex flex-row flex-wrap items-center gap-2">
                  {cacheSizes.map(([key], index) => (
                    <div key={key} className="flex flex-row gap-1 items-center">
                      <div
                        className="h-3 w-3 bg-foreground/50 rounded-full"
                        style={{
                          opacity:
                            (cacheSizes.length - index) / cacheSizes.length,
                        }}
                      />
                      <span className="capitalize text-sm text-muted-foreground">
                        {key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* <Divider /> */}

            {/* <SettingsButton */}
            {/*   onClick={() => { */}
            {/*     alrt("Clear data cache?").then(async () => { */}
            {/*       try { */}
            {/*         queryClient.clear(); */}
            {/*       } catch (err) {} */}
            {/*       try { */}
            {/*         queryClient.invalidateQueries(); */}
            {/*       } catch (err) {} */}
            {/*       refreshCacheSizes(); */}
            {/*     }); */}
            {/*   }} */}
            {/* > */}
            {/*   Clear data cache */}
            {/* </SettingsButton> */}
          </div>
        </SectionItem>
      </Section>
    </>
  );
}

export default function SettingsPage() {
  const id = useId();

  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);
  const setLeftHandedMode = useSettingsStore((s) => s.setLeftHandedMode);

  const postCardStyle = useSettingsStore((s) => s.postCardStyle);
  const setPostCardStyle = useSettingsStore((s) => s.setPostCardStyle);

  const hideRead = useSettingsStore((s) => s.hideRead);
  const setHideRead = useSettingsStore((s) => s.setHideRead);

  const filterKeywords = useSettingsStore((s) => s.filterKeywords);
  const setFilterKeywords = useSettingsStore((s) => s.setFilterKeywords);
  const pruneFiltersKeywords = useSettingsStore((s) => s.pruneFiltersKeywords);

  const keywords = [...filterKeywords, ""];

  return (
    <IonPage>
      <PageTitle>Settings</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <MenuButton />
            <ToolbarTitle numRightIcons={1}>Settings</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="pt-4 pb-12 max-md:px-3.5">
          <div className="flex-1 gap-9 flex flex-col">
            <AccountSection />

            <Section title="ACCESSIBILITY">
              <SectionItem>
                <IonToggle
                  className="flex-1 font-light"
                  checked={leftHandedMode}
                  onIonChange={(e) => setLeftHandedMode(e.detail.checked)}
                >
                  Left handed mode
                </IonToggle>
              </SectionItem>
            </Section>

            <Section title="POSTS">
              <SectionItem>
                <label htmlFor={`${id}-post-display`}>Display posts as</label>
                <Select value={postCardStyle} onValueChange={setPostCardStyle}>
                  <SelectTrigger
                    className="w-[120px]"
                    id={`${id}-post-display`}
                  >
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectGroup>
                      <SelectLabel>Display posts as</SelectLabel>
                      <SelectItem value="large">Cards</SelectItem>
                      <SelectItem value="small">Compact</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </SectionItem>
            </Section>

            <Section title="GLOBAL FILTERS">
              <SectionItem>
                <IonToggle
                  className="flex-1 font-light"
                  checked={hideRead}
                  onIonChange={(e) => setHideRead(e.detail.checked)}
                >
                  Hide read posts from feeds
                </IonToggle>
              </SectionItem>
            </Section>

            <Section title="GLOBAL KEYWORD FILTERS">
              {keywords.map((keyword, index) => (
                <SectionItem key={index}>
                  <DebouncedInput
                    defaultValue={keyword}
                    debounceTimeout={1000}
                    onChange={(e) =>
                      setFilterKeywords({
                        index,
                        keyword: e.target.value ?? "",
                      })
                    }
                    onBlur={() => {
                      pruneFiltersKeywords();
                    }}
                    placeholder="Keyword to filter..."
                  />
                </SectionItem>
              ))}
            </Section>

            <CacheSection />

            <Section title="OTHER">
              <SectionItem
                href="https://github.com/Blorp-Labs/blorp/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                What's new
              </SectionItem>
              <SectionItem
                href="https://github.com/Blorp-Labs/blorp/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report issue
              </SectionItem>
              <SectionItem to={resolveRoute("/privacy")}>
                Privacy Policy
              </SectionItem>
              <SectionItem to={resolveRoute("/terms")}>
                Terms of Use
              </SectionItem>
            </Section>

            <div className="flex flex-col items-center pt-6">
              <Logo />
              <span className="text-muted-foreground">v{version}</span>
            </div>
          </div>
        </ContentGutters>
      </IonContent>
    </IonPage>
  );
}
