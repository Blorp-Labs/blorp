import { useIonRouter } from "@ionic/react";
import { RoutePath } from "./routes";

export function usePathname() {
  try {
    const pathname = useIonRouter().routeInfo.pathname;
    return pathname as RoutePath;
  } catch {
    return "" as RoutePath;
  }
}
