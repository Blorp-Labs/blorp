import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar, useIonAlert } from "@ionic/react";
import { FiHelpCircle } from "react-icons/fi";
import { UserDropdown } from "@/src/components/nav";
import { PageTitle } from "@/src/components/page-title";
import { useParams } from "@/src/routing";
import { getAccountSite, parseAccountInfo, useAuth } from "@/src/stores/auth";
import { Page } from "../../components/page";
import { ToolbarBackButton } from "@/src/components/toolbar/toolbar-back-button";
import { ToolbarTitle } from "@/src/components/toolbar/toolbar-title";
import { useState } from "react";
import { MarkdownEditor } from "@/src/components/markdown/editor";
import {
  useRemoveUserAvatarMutation,
  useUpdateUserSettingsMutation,
} from "@/src/queries";
import { Button } from "@/src/components/ui/button";
import { useHistory } from "react-router";
import { useDropzone } from "react-dropzone";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { isCapacitor, isIos } from "@/src/lib/device";
import { useSettingsStore } from "@/src/stores/settings";
import { SimpleSelect } from "@/src/components/ui/simple-select";
import { type ScoreDisplay } from "@/src/stores/utils";

const VOTE_DISPLAY_OPTIONS: { value: ScoreDisplay; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "upvotes", label: "Upvotes only" },
  { value: "downvotes", label: "Downvotes only" },
  { value: "none", label: "Hidden" },
];

type NsfwDisplay = "hidden" | "blur" | "show";

const NSFW_DISPLAY_OPTIONS: { value: NsfwDisplay; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "blur", label: "Blur" },
  { value: "show", label: "Show" },
];

function toNsfwDisplay(showNsfw: boolean, blurNsfw: boolean): NsfwDisplay {
  if (!showNsfw) {
    return "hidden";
  }
  return blurNsfw ? "blur" : "show";
}

function fromNsfwDisplay(mode: NsfwDisplay): {
  showNsfw: boolean;
  blurNsfw: boolean;
} {
  switch (mode) {
    case "hidden":
      return { showNsfw: false, blurNsfw: true };
    case "blur":
      return { showNsfw: true, blurNsfw: true };
    case "show":
      return { showNsfw: true, blurNsfw: false };
  }
}

// Note: this conversion is intentionally lossy. Lemmy has three separate
// boolean fields (showUpvotes, showDownvotes, showScores) but the UI collapses
// them into a single mode. For example, showUpvotes=true+showDownvotes=true is
// treated the same as showScores=true ("score" mode). Saving any mode other
// than the original combination will normalise those fields on the server, which
// is acceptable because the visible behaviour is identical.
function toScoreDisplay(
  showUpvotes: boolean,
  showDownvotes: boolean,
  showScores: boolean,
): ScoreDisplay {
  if (showUpvotes && showDownvotes) {
    return "score";
  }
  if (showUpvotes) {
    return "upvotes";
  }
  if (showDownvotes) {
    return "downvotes";
  }
  if (showScores) {
    return "score";
  }
  return "none";
}

function fromScoreDisplay(mode: ScoreDisplay): {
  showUpvotes: boolean;
  showDownvotes: boolean;
  showScores: boolean;
} {
  switch (mode) {
    case "score":
      return { showUpvotes: false, showDownvotes: false, showScores: true };
    case "upvotes":
      return { showUpvotes: true, showDownvotes: false, showScores: false };
    case "downvotes":
      return { showUpvotes: false, showDownvotes: true, showScores: false };
    case "none":
      return { showUpvotes: false, showDownvotes: false, showScores: false };
  }
}

function FileUpload({
  placeholder,
  onDrop,
  imgClassName,
}: {
  placeholder?: string | null;
  onDrop: (file: File) => void;
  imgClassName?: string;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (files) => {
      if (files[0]) {
        onDrop(files[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed min-h-32 rounded-md p-2"
    >
      <input id="profile-upload" {...getInputProps()} />
      {placeholder && (
        <img
          src={placeholder}
          className={cn("aspect-square object-cover", imgClassName)}
        />
      )}
      {isDragActive ? (
        <p className="">Drop the files here ...</p>
      ) : (
        <p className="text-muted-foreground">
          Drop or upload image here
          {placeholder && " to replace"}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { index: indexStr } = useParams("/settings/update-profile/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);
  const site = account ? getAccountSite(account) : null;

  const [_email, setEmail] = useState<string>();
  const email = _email ?? site?.myEmail ?? "";

  const [_bio, setBio] = useState<string>();
  const bio = _bio ?? site?.me?.bio ?? "";

  const [_nsfwDisplay, setNsfwDisplay] = useState<NsfwDisplay>();
  const nsfwDisplay =
    _nsfwDisplay ??
    toNsfwDisplay(site?.showNsfw ?? false, site?.blurNsfw ?? true);
  const { showNsfw, blurNsfw } = fromNsfwDisplay(nsfwDisplay);

  const serverEnablesDownvotes =
    site?.enablePostDownvotes !== false ||
    site?.enableCommentDownvotes !== false;

  const [_voteDisplay, setVoteDisplay] = useState<ScoreDisplay>();
  const voteDisplay =
    _voteDisplay ??
    toScoreDisplay(
      site?.showUpvotes ?? true,
      (site?.showDownvotes ?? true) && serverEnablesDownvotes,
      site?.showScores ?? true,
    );
  const { showUpvotes, showDownvotes, showScores } =
    fromScoreDisplay(voteDisplay);

  const [_replyCollapseThreshold, setReplyCollapseThreshold] =
    useState<number>();
  const replyCollapseThreshold =
    _replyCollapseThreshold ?? site?.replyCollapseThreshold ?? -10;

  const [_replyHideThreshold, setReplyHideThreshold] = useState<number>();
  const replyHideThreshold =
    _replyHideThreshold ?? site?.replyHideThreshold ?? -20;

  const nsfwPreviouslyEnabled = useSettingsStore(
    (s) => s.nsfwPreviouslyEnabled,
  );
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const setVoteDisplaySetting = useSettingsStore(
    (s) => s.setVoteDisplaySetting,
  );
  const collapseThresholdSetting = useSettingsStore(
    (s) => s.collapseThresholdSetting,
  );
  const setCollapseThresholdSetting = useSettingsStore(
    (s) => s.setCollapseThresholdSetting,
  );
  const hideThresholdSetting = useSettingsStore((s) => s.hideThresholdSetting);
  const setHideThresholdSetting = useSettingsStore(
    (s) => s.setHideThresholdSetting,
  );

  const isPieFed = site?.software === "piefed";

  const [presentAlert] = useIonAlert();
  const showOverrideInfo = () =>
    presentAlert({
      header: "Blorp is overriding this setting",
      message: `Your Blorp app settings are overriding this account preference. Tap "Use account setting" to let your ${_.capitalize(site?.software)} account preference take effect.`,
      buttons: [{ text: "OK", role: "cancel" }],
    });
  const canShowNsfwSetting =
    !(isCapacitor() && isIos()) || nsfwPreviouslyEnabled;

  const updateUserSettings = useUpdateUserSettingsMutation();
  const removeUserAvatar = useRemoveUserAvatarMutation();
  const history = useHistory();

  const { person } = account
    ? parseAccountInfo(account)
    : { person: undefined };
  const slug = person?.slug;
  const isLemmy = site?.software === "lemmy";

  const handleSubmit = () => {
    if (account) {
      updateUserSettings
        .mutateAsync({
          account,
          form: {
            bio,
            email,
            showNsfw,
            blurNsfw,
            showUpvotes,
            showDownvotes,
            showScores,
            replyCollapseThreshold,
            replyHideThreshold,
          },
        })
        .then(() => history.goBack());
    }
  };

  return (
    <Page notFound={!account}>
      <PageTitle>{slug ?? "Person"}</PageTitle>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarBackButton />
            <ToolbarTitle size="sm" numRightIcons={1}>
              {slug ?? "Person"}
            </ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={true}>
        <ContentGutters className="py-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-muted-foreground text-sm">
                Avatar (auto saves)
              </label>
              <FileUpload
                placeholder={person?.avatar}
                onDrop={(file) => {
                  if (account) {
                    updateUserSettings.mutate({
                      account,
                      form: {
                        avatar: file,
                      },
                    });
                  }
                }}
                imgClassName="w-24 h-24 rounded-full"
              />
              {person?.avatar && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (account) {
                      removeUserAvatar.mutate(account);
                    }
                  }}
                >
                  Remove avatar
                </Button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="gap-4 flex flex-col"
              data-testid="signup-form"
            >
              {!isPieFed && (
                <div className="flex flex-col gap-1">
                  <label
                    className="text-muted-foreground text-sm"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <Input
                    placeholder="Email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-sm" htmlFor="bio">
                  Bio
                </label>
                <MarkdownEditor
                  className="border rounded-md min-h-32"
                  placeholder="Bio"
                  id="bio"
                  content={bio}
                  onChange={(md) => setBio(md)}
                />
              </div>

              {canShowNsfwSetting && (
                <div className="flex items-center justify-between gap-2">
                  <label className="font-light">NSFW content</label>
                  <SimpleSelect
                    options={NSFW_DISPLAY_OPTIONS}
                    value={nsfwDisplay}
                    onChange={(opt) => setNsfwDisplay(opt.value)}
                    valueGetter={(o) => o.value}
                    labelGetter={(o) => o.label}
                    className="w-[160px]"
                    side="top"
                  />
                </div>
              )}

              {isLemmy && (
                <>
                  {voteDisplaySetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Vote display</label>
                      <SimpleSelect
                        options={
                          serverEnablesDownvotes
                            ? VOTE_DISPLAY_OPTIONS
                            : VOTE_DISPLAY_OPTIONS.filter(
                                (o) => o.value !== "downvotes",
                              )
                        }
                        value={voteDisplay}
                        onChange={(opt) => setVoteDisplay(opt.value)}
                        valueGetter={(o) => o.value}
                        labelGetter={(o) => o.label}
                        className="w-[160px]"
                        side="top"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Vote display</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setVoteDisplaySetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isPieFed && (
                <>
                  {collapseThresholdSetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Collapse comments</label>
                      <SimpleSelect
                        options={_.sortBy(
                          _.uniq([-5, -10, -15, -20, replyCollapseThreshold]),
                          (o) => -o,
                        )}
                        value={replyCollapseThreshold}
                        onChange={setReplyCollapseThreshold}
                        valueGetter={(o) => o}
                        labelGetter={(o) => `Score \u2264 ${o}`}
                        className="w-[160px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Collapse comments</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setCollapseThresholdSetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                  {hideThresholdSetting === "account" ? (
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-light">Hide comments</label>
                      <SimpleSelect
                        options={_.sortBy(
                          _.uniq([-5, -10, -15, -20, replyHideThreshold]),
                          (o) => -o,
                        )}
                        value={replyHideThreshold}
                        onChange={setReplyHideThreshold}
                        valueGetter={(o) => o}
                        labelGetter={(o) => `Score \u2264 ${o}`}
                        className="w-[160px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Hide comments</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setHideThresholdSetting("account")}
                        >
                          Use account setting
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          type="button"
                          onClick={showOverrideInfo}
                        >
                          <FiHelpCircle />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button variant="outline">Save profile</Button>
            </form>
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
