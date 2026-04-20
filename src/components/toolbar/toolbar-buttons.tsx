import { cn } from "@/src/lib/utils";
import { IonButtons } from "@ionic/react";
import { ReactNode } from "react";

export function ToolbarButtons({
  side,
  children,
  className,
}: {
  side: "left" | "right";
  children: ReactNode;
  className?: string;
}) {
  if (side === "left") {
    return (
      <IonButtons slot="start" className="gap-2">
        {children}
      </IonButtons>
    );
  } else {
    return (
      <IonButtons slot="end">
        <div
          className={cn(
            "flex flex-row items-center gap-3.5 md:gap-4.5",
            className,
          )}
        >
          {children}
        </div>
      </IonButtons>
    );
  }
}
