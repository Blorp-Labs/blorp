"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/src/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";

type Option<V extends string> = {
  label: string;
  value: V;
};

interface ComboboxProps<V extends string> {
  trigger: (props: { isOpen: boolean }) => React.ReactNode;
  value: V;
  options: Option<V>[];
  onChange: (opt: Option<V>) => void;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
}

export function Combobox<V extends string>({
  options,
  value,
  trigger,
  onChange,
  align,
}: ComboboxProps<V>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger({ isOpen: open })}</PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align={align}>
        <Command>
          <CommandInput
            placeholder="Search language..."
            className="h-9 text-sm"
            searchIcon={false}
          />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(
                      options.find(({ value }) => value === currentValue)!,
                    );
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
