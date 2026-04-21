import { useMedia } from "@/src/hooks";
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
  ...rest
}: {
  children: string;
  className?: string;
  numRightIcons: number;
} & VariantProps<typeof titleVariants> &
  React.HTMLAttributes<HTMLSpanElement>) {
  const media = useMedia();
  return (
    <span
      data-tauri-drag-region
      className={cn(titleVariants({ size }), className)}
      style={{
        maxWidth: media.maxMd
          ? `calc(100vw - 65px - ${35 * numRightIcons}px)`
          : 500,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
