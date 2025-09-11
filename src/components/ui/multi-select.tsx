import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Badge } from "./badge";
import { ChevronDown } from "lucide-react";
import { isNotNil } from "@/src/lib/utils";
import { Fragment } from "react/jsx-runtime";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  renderOption: (opt: Option) => React.ReactNode;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  renderOption,
}: MultiSelectProps) {
  const selected = value
    .map((value) => options.find((opt) => opt.value === value))
    .filter(isNotNil);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-md">
          {selected.length === 0 && placeholder && (
            <span className="text-muted-foreground font-normal">
              {placeholder}
            </span>
          )}
          {selected.map((option) => (
            <Fragment key={option.value}>{renderOption?.(option)}</Fragment>
          ))}
          <div className="flex-1" />
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={isSelected}
              onCheckedChange={() => {
                if (isSelected) {
                  onChange(value.filter((val) => val !== opt.value));
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
