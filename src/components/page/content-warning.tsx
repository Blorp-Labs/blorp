import { IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { useSettingsStore } from "@/src/stores/settings";
import { env } from "@/src/env";
import { ContentGutters } from "../gutters";
import { Button } from "../ui/button";
import { UserDropdown } from "../nav";
import { ToolbarButtons } from "../toolbar/toolbar-buttons";
import { ToolbarTitle } from "../toolbar/toolbar-title";

export function ContentWarningPageContent() {
  const setContentWarningAccepted = useSettingsStore(
    (s) => s.setContentWarningAccepted,
  );
  return (
    <>
      <IonHeader>
        <IonToolbar data-tauri-drag-region>
          <ToolbarButtons side="left">
            <ToolbarTitle numRightIcons={1}>Content Warning</ToolbarTitle>
          </ToolbarButtons>
          <ToolbarButtons side="right">
            <UserDropdown />
          </ToolbarButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <div className="flex-1 py-8 flex flex-col gap-4 items-start">
            <p>{env.contentWarning}</p>
            <Button onClick={() => setContentWarningAccepted(true)}>
              I agree
            </Button>
          </div>
        </ContentGutters>
      </IonContent>
    </>
  );
}
