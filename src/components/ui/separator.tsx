import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";

import { cn } from "@/src/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
  {
    variants: {
      variant: {
        default: "",
        chunky: "max-md:data-[orientation=horizontal]:h-2 max-md:bg-border/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> &
  VariantProps<typeof badgeVariants>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Separator };
