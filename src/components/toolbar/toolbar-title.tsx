import { useMedia } from "@/src/lib/hooks";
import { cn } from "@/src/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const titleVariants = cva(
  "font-bold md:max-w-lg overflow-hidden overflow-ellipsis text-nowrap whitespace-nowrap",
  {
    variants: {
      size: {
        default: "text-lg",
        sm: "",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function ToolbarTitle({
  size,
  children,
  className,
  numRightIcons,
}: {
  children: string;
  className?: string;
  numRightIcons: number;
} & VariantProps<typeof titleVariants>) {
  const media = useMedia();
  return (
    <span
      data-tauri-drag-region
      className={cn(titleVariants({ size }), className)}
      style={{
        maxWidth: media.md
          ? `calc(100vw - 65px - ${35 * numRightIcons}px)`
          : 500,
      }}
    >
      {children}
    </span>
  );
}
