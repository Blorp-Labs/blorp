import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import _ from "lodash";

interface SimpleSelectProps<O, V extends string | number> {
  options: O[];
  value: V | undefined;
  onChange: (value: O) => void;
  valueGetter: (option: O) => V;
  labelGetter: (option: O) => string;
  placeholder?: string;
  className?: string;
  side?: React.ComponentPropsWithoutRef<typeof SelectContent>["side"];
}

export function SimpleSelect<O, V extends string | number>({
  options,
  value,
  onChange,
  valueGetter,
  labelGetter,
  placeholder,
  className,
  side,
}: SimpleSelectProps<O, V>) {
  return (
    <Select
      value={_.isNil(value) ? value : String(value)}
      onValueChange={(key) => {
        const match = options.find((o) => String(valueGetter(o)) === key);
        if (match !== undefined) onChange(match);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side={side}>
        {options.map((o) => (
          <SelectItem key={valueGetter(o)} value={String(valueGetter(o))}>
            {labelGetter(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
