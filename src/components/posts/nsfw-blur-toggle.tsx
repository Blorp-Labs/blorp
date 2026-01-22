import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function NsfwBlurToggle({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger className="absolute top-1/2 left-1/2 -translate-x-1/2">
        <Button variant="ghost" size="lg" className="text-lg" onClick={onClick}>
          NSFW
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remove NSFW blur</TooltipContent>
    </Tooltip>
  );
}
