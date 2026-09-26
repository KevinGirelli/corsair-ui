"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/registry/default/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/default/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/default/ui/popover";

interface ComboboxOption {
  value: string;
  label: string;
  /** Extra words the search matches, e.g. an abbreviation or another spelling. */
  keywords?: string[];
  disabled?: boolean;
}

interface ComboboxProps extends Omit<
  ComponentProps<"button">,
  "value" | "defaultValue" | "onChange" | "children"
> {
  options: ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: ReactNode;
  searchPlaceholder?: string;
  /** Shown when the search matches no option. */
  emptyMessage?: ReactNode;
  /** Submits the value in a native form. */
  name?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
}

/**
 * A select with a search box, for lists long enough that scrolling gets in
 * the way. Options are data (`options`), so it can be fed from an API.
 */
function Combobox(props: ComboboxProps) {
  const {
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder = "Select an option",
    searchPlaceholder = "Search…",
    emptyMessage = "No results.",
    name,
    open,
    onOpenChange,
    contentClassName,
    className,
    disabled,
    ...buttonProps
  } = props;
  const controlled = "value" in props;
  const listId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? null);
  const [internalOpen, setInternalOpen] = useState(false);
  const current = controlled ? (value ?? null) : internalValue;
  const isOpen = open ?? internalOpen;
  const selected = options.find((option) => option.value === current);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const select = (next: string) => {
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);
    setOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Points at the listbox rather than the popover, like a native combobox would. */}
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          data-slot="combobox-trigger"
          data-empty={!selected || undefined}
          disabled={disabled}
          className={cn(
            "border-input bg-field flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap sm:w-[16rem]",
            "transition-[color,border-color,box-shadow] outline-none motion-reduce:transition-none",
            "data-[empty=true]:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&[data-state=open]>[data-slot=combobox-icon]]:rotate-180",
            className
          )}
          {...buttonProps}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDownIcon
            aria-hidden="true"
            data-slot="combobox-icon"
            className="text-muted-foreground size-4 shrink-0 opacity-50 transition-transform duration-200 motion-reduce:transition-none"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0", contentClassName)}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList id={listId}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  disabled={option.disabled}
                  onSelect={() => select(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      "ml-auto",
                      option.value === current ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
    </Popover>
  );
}

export { Combobox, type ComboboxOption, type ComboboxProps };
