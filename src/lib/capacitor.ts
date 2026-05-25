import { TextZoom } from "@capacitor/text-zoom";
import { isCapacitor } from "./device";
import _ from "lodash";
import { registerSafeArea } from "./safe-area/register";

async function accesibleTextSize() {
  const pref = await TextZoom.getPreferred();
  await TextZoom.set({ value: pref.value });
}

export function applyCapacitorFixes() {
  // This one is special in that we call
  // is even when were not a native app
  registerSafeArea();

  const mightChange = () => {
    if (isCapacitor()) {
      accesibleTextSize();
    }
  };

  mightChange();
  const debouncedRehydrate = _.debounce(mightChange, 50);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      debouncedRehydrate();
    }
  });
  window.addEventListener("focus", debouncedRehydrate);
}
