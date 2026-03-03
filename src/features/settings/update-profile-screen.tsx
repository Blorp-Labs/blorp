import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import {
  IonContent,
  IonHeader,
  IonToggle,
  IonToolbar,
  useIonAlert,
} from "@ionic/react";
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
import { useRemoveUserAvatar, useUpdateUserSettings } from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { useHistory } from "react-router";
import { useDropzone } from "react-dropzone";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { ToolbarButtons } from "@/src/components/toolbar/toolbar-buttons";
import { isCapacitor, isIos } from "@/src/lib/device";
import { useSettingsStore } from "@/src/stores/settings";
import { SimpleSelect } from "@/src/components/ui/simple-select";

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
  const { index: indexStr } = useParams("/settings/manage-blocks/:index");
  const index = parseInt(indexStr);

  const account = useAuth((s) => s.accounts[index]);
  const site = account ? getAccountSite(account) : null;

  const [_email, setEmail] = useState<string>();
  const email = _email ?? site?.myEmail ?? "";

  const [_bio, setBio] = useState<string>();
  const bio = _bio ?? site?.me?.bio ?? "";

  const [_showNsfw, setShowNsfw] = useState<boolean>();
  const showNsfw = _showNsfw ?? site?.showNsfw ?? false;

  const [_blurNsfw, setBlurNsfw] = useState<boolean>();
  const blurNsfw = _blurNsfw ?? site?.blurNsfw ?? true;

  const [_showUpvotes, setShowUpvotes] = useState<boolean>();
  const showUpvotes = _showUpvotes ?? site?.showUpvotes ?? true;

  const [_showDownvotes, setShowDownvotes] = useState<boolean>();
  const showDownvotes = _showDownvotes ?? site?.showDownvotes ?? true;

  const [_showScores, setShowScores] = useState<boolean>();
  const showScores = _showScores ?? site?.showScores ?? true;

  const scoresOverriddenByVotes = showUpvotes || showDownvotes;

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
  const downvotesSetting = useSettingsStore((s) => s.downvotesSetting);
  const setDownvotesSetting = useSettingsStore((s) => s.setDownvotesSetting);
  const scoresSetting = useSettingsStore((s) => s.scoresSetting);
  const setScoresSetting = useSettingsStore((s) => s.setScoresSetting);
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
      message:
        'Your Blorp app settings are overriding this account preference. Tap "Use account setting" to let your Lemmy account preference take effect.',
      buttons: [{ text: "OK", role: "cancel" }],
    });
  const canShowNsfwSetting =
    !(isCapacitor() && isIos()) || nsfwPreviouslyEnabled;

  const updateUserSettings = useUpdateUserSettings();
  const removeUserAvatar = useRemoveUserAvatar();
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
                <>
                  <div className="flex flex-col gap-1">
                    <IonToggle
                      className="flex-1 font-light"
                      checked={showNsfw}
                      onIonChange={(e) => {
                        setShowNsfw(e.detail.checked);
                        if (e.detail.checked) {
                          setBlurNsfw(true);
                        }
                      }}
                    >
                      Show NSFW content
                    </IonToggle>
                  </div>
                  {showNsfw && (
                    <div className="flex flex-col gap-1">
                      <IonToggle
                        className="flex-1 font-light"
                        checked={blurNsfw}
                        onIonChange={(e) => setBlurNsfw(e.detail.checked)}
                      >
                        Blur NSFW images
                      </IonToggle>
                    </div>
                  )}
                </>
              )}

              {isLemmy && (
                <>
                  <IonToggle
                    className="flex-1 font-light"
                    checked={showUpvotes}
                    onIonChange={(e) => setShowUpvotes(e.detail.checked)}
                  >
                    Show upvotes
                  </IonToggle>
                  {downvotesSetting === "account" ? (
                    <IonToggle
                      className="flex-1 font-light"
                      checked={showDownvotes}
                      onIonChange={(e) => setShowDownvotes(e.detail.checked)}
                    >
                      Show downvotes
                    </IonToggle>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Show downvotes</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setDownvotesSetting("account")}
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
                  {scoresSetting === "account" ? (
                    <div className="flex flex-col gap-1">
                      <IonToggle
                        className="flex-1 font-light"
                        checked={showScores}
                        disabled={scoresOverriddenByVotes}
                        onIonChange={(e) => setShowScores(e.detail.checked)}
                      >
                        Show scores
                      </IonToggle>
                      {scoresOverriddenByVotes && (
                        <p className="text-sm text-muted-foreground">
                          No effect while show upvotes or show downvotes is
                          enabled.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-light">Show scores</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setScoresSetting("account")}
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
                        options={[-5, -10, -15, -20]}
                        value={replyCollapseThreshold}
                        onChange={setReplyCollapseThreshold}
                        valueGetter={(o) => String(o)}
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
                        options={[-5, -10, -15, -20]}
                        value={replyHideThreshold}
                        onChange={setReplyHideThreshold}
                        valueGetter={(o) => String(o)}
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
