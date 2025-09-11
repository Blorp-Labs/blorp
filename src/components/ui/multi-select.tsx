"use client";

import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/src/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/src/components/ui/command";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  setSelectedValues: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  setSelectedValues,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const toggleSelection = (value: string) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter((item) => item !== value));
    } else {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const removeSelected = (value: string) => {
    setSelectedValues(selectedValues.filter((item) => item !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex justify-between px-2 pb-2 items-center min-w-[200px] rounded-lg"
          variant="outline"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedValues.length > 0 ? (
              selectedValues.map((val, index) => (
                <Badge
                  key={val}
                  // className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-black dark:bg-gray-700 dark:text-white rounded-md"
                  variant="brand"
                >
                  {options.find((opt) => opt.value === val)?.label}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelected(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeSelected(val);
                      }
                    }}
                    className="ml-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))
            ) : (
              <span className="text-gray-500">
                {placeholder || "Select options..."}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>No options found.</CommandEmpty>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleSelection(option.value)}
                  >
                    <div className="flex items-center">
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          isSelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {option.label}
                    </div>
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelect;
