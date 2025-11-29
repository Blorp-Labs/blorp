import * as React from "react";
import { cn } from "@/src/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  wrapperClassName?: string;
}

function Input({
  className,
  type,
  startAdornment,
  endAdornment,
  wrapperClassName,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "has-[>input[aria-invalid='true']]:aria-invalid:ring-destructive/20 has-[>input[aria-invalid='true']]:dark:ring-destructive/40",
        "has-[>input[aria-invalid='true']]:border-destructive",
        wrapperClassName,
      )}
    >
      {startAdornment && (
        <div className="mr-2 flex shrink-0 items-center text-muted-foreground">
          {startAdornment}
        </div>
      )}

      <input
        type={type}
        data-slot="input"
        className={cn(
          "border-none file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "flex-1 min-w-0 bg-transparent outline-none",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "text-base md:text-sm",
          className,
        )}
        {...props}
      />

      {endAdornment && (
        <div className="ml-2 flex shrink-0 items-center text-muted-foreground">
          {endAdornment}
        </div>
      )}
    </div>
  );
}

export { Input };
