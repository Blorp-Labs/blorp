import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useIonAlert } from "@ionic/react";

export function ResponsiveTooltip({
  trigger,
  content,
  className,
}: {
  trigger: React.ReactNode;
  content: string;
  className?: string;
}) {
  const [alrt] = useIonAlert();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            className={className}
            onClick={() => alrt(content, [{ text: "Close" }])}
          >
            {trigger}
          </button>
        }
      />
      <TooltipContent
        side="top"
        align="end"
        className="max-w-sm flex flex-col gap-1"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
