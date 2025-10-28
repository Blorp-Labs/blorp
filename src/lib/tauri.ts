import _ from "lodash";
import { check } from "@tauri-apps/plugin-updater";
import { confirm } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "./device";
import { env } from "../env";

export async function updateTauri() {
  try {
    if (isTauri()) {
      console.log("Checking for tauri update...");
      const update = await check();
      if (update) {
        await update.download();
        const shouldInstall = await confirm(
          `${env.REACT_APP_NAME} version ${update.version} is available. You may be prompted for a password if you choose to update.`,
          {
            okLabel: "Update",
          },
        );
        if (shouldInstall) {
          await update.install();
          const shouldRelaunch = await confirm(
            "Update successful! You can restart now or later to apply the update.",
            {
              okLabel: "Relaunch",
              cancelLabel: "Later",
            },
          );
          if (shouldRelaunch) {
            await relaunch();
          }
        }
      }
    }
  } catch (err) {
    console.log("failed to update blorp", err);
  }
}
