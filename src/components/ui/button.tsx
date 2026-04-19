import * as React from "react";
import { useState, useEffect } from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";
import { Spinner } from "../icons";

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-1",
  {
    variants: {
      variant: {
        default:
          "bg-brand border-brand text-white shadow-xs hover:bg-brand/90 hover:border-brand/90",
        destructive:
          "bg-destructive border-destructive text-white shadow-xs hover:bg-destructive/90 hover:border-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 dark:border-destructive/60",
        outline:
          "border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-input",
        secondary:
          "bg-secondary border-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:border-secondary/80",
        ghost:
          "border-transparent hover:bg-foreground/10 dark:hover:bg-foreground/15 hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export { Button, buttonVariants };

export function LoadingButton({
  loading,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading: boolean;
  }) {
  // Delay showing the spinner so quick operations don't flash a loading state.
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const id = setTimeout(() => setShowSpinner(true), 750);
    return () => clearTimeout(id);
  }, [loading]);

  return (
    <Button
      {...props}
      disabled={loading || props.disabled}
      className={cn(loading && "disabled:opacity-100", props.className)}
    >
      {children} {showSpinner && <Spinner className="animate-spin" />}
    </Button>
  );
}
