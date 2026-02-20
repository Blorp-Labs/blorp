import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn, isNotNil } from "@/src/lib/utils";
import { Fragment } from "react/jsx-runtime";
import { ComponentProps } from "react";

interface Option<V> {
  value: V;
  label: string;
}

interface MultiSelectProps<V> {
  options: Option<V>[];
  value: V[];
  onChange: (values: V[]) => void;
  placeholder?: string;
  renderOption: (opt: Option<V>) => React.ReactNode;
  keyExtractor: (opt: V) => string | number;
  buttonVariant?: ComponentProps<typeof Button>["variant"];
  buttonClassName?: string;
}

export function MultiSelect<V>({
  options,
  value,
  onChange,
  placeholder,
  renderOption,
  keyExtractor,
  buttonVariant = "outline",
  buttonClassName,
}: MultiSelectProps<V>) {
  const selected = value
    .map((value) =>
      options.find((opt) => keyExtractor(opt.value) === keyExtractor(value)),
    )
    .filter(isNotNil);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          className={cn("rounded-md", buttonClassName)}
        >
          {selected.length === 0 && placeholder && (
            <span className="text-muted-foreground font-normal">
              {placeholder}
            </span>
          )}
          {selected.map((option) => (
            <Fragment key={keyExtractor(option.value)}>
              {renderOption?.(option)}
            </Fragment>
          ))}
          <div className="flex-1" />
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {options.map((opt) => {
          const isSelected =
            value.findIndex(
              (v) => keyExtractor(v) === keyExtractor(opt.value),
            ) >= 0;
          return (
            <DropdownMenuCheckboxItem
              key={keyExtractor(opt.value)}
              checked={isSelected}
              onCheckedChange={() => {
                if (isSelected) {
                  onChange(
                    value.filter(
                      (val) => keyExtractor(val) !== keyExtractor(opt.value),
                    ),
                  );
                } else {
                  onChange([...value, opt.value]);
                }
              }}
            >
              {renderOption?.(opt)}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MultiSelect;
