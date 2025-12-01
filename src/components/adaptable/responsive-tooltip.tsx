import { useMedia } from "@/src/lib/hooks";
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
      <TooltipTrigger asChild>
        <button
          className={className}
          onClick={() => alrt(content, [{ text: "Close" }])}
        >
          {trigger}
        </button>
      </TooltipTrigger>
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
