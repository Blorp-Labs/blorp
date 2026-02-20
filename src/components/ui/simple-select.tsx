import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

interface SimpleSelectProps<O> {
  options: O[];
  value: O | undefined;
  onChange: (value: O) => void;
  valueGetter: (option: O) => string;
  labelGetter: (option: O) => string;
  placeholder?: string;
  className?: string;
}

export function SimpleSelect<O>({
  options,
  value,
  onChange,
  valueGetter,
  labelGetter,
  placeholder,
  className,
}: SimpleSelectProps<O>) {
  return (
    <Select
      value={value !== undefined ? valueGetter(value) : undefined}
      onValueChange={(key) => {
        const match = options.find((o) => valueGetter(o) === key);
        if (match !== undefined) onChange(match);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={valueGetter(o)} value={valueGetter(o)}>
            {labelGetter(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
