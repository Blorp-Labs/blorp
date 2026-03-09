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
}

export function SimpleSelect<O, V extends string | number>({
  options,
  value,
  onChange,
  valueGetter,
  labelGetter,
  placeholder,
  className,
}: SimpleSelectProps<O, V>) {
  return (
    <Select
      value={_.isNil(value) ? value : String(value)}
      onValueChange={(key) => {
        const match = options.find(
          (o) => valueGetter(o) === key || String(valueGetter(o)) === key,
        );
        if (match !== undefined) onChange(match);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={valueGetter(o)} value={String(valueGetter(o))}>
            {labelGetter(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
