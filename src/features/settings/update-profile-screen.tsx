import { ContentGutters } from "@/src/components/gutters";
import _, { parseInt } from "lodash";
import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
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

  const updateUserSettings = useUpdateUserSettings();
  const removeUserAvatar = useRemoveUserAvatar();
  const history = useHistory();

  const { person } = account
    ? parseAccountInfo(account)
    : { person: undefined };
  const slug = person?.slug;

  const handleSubmit = () => {
    updateUserSettings
      .mutateAsync({
        account: account!,
        form: {
          bio,
          email,
        },
      })
      .then(() => history.goBack());
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
                onDrop={(file) =>
                  updateUserSettings.mutate({
                    account: account!,
                    form: {
                      avatar: file,
                    },
                  })
                }
                imgClassName="w-24 h-24 rounded-full"
              />
              {person?.avatar && (
                <Button
                  variant="outline"
                  onClick={() => removeUserAvatar.mutate(account!)}
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

              <Button variant="outline">Save profile</Button>
            </form>
          </div>
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
