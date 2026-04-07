import { cn } from "@/src/lib/utils";
import { useLinkContext } from "@/src/hooks/navigation-hooks";
import { IonBackButton } from "@ionic/react";

export function ToolbarBackButton({ className }: { className?: string }) {
  const root = useLinkContext().root;
  return (
    <IonBackButton
      text=""
      className={cn("text-muted-foreground -ml-1", className)}
      defaultHref={root}
    />
  );
}
