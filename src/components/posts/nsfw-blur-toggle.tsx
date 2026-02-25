import { Button } from "../ui/button";

export function NsfwBlurToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      size="lg"
      className="text-xl absolute top-1/2 left-1/2 -translate-x-1/2 p-8"
      onClick={onClick}
    >
      Show NSFW
    </Button>
  );
}
