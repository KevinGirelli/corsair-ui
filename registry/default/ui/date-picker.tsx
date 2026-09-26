"use client";

import type { DateRange } from "@daypicker/react";
import { CalendarIcon } from "lucide-react";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Calendar, type CalendarProps } from "@/registry/default/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/default/ui/popover";

type PassThroughCalendarProps = Omit<CalendarProps, "mode" | "selected" | "onSelect" | "required">;

interface PickerTriggerProps extends Omit<
  ComponentProps<typeof Button>,
  "value" | "defaultValue" | "onChange" | "children" | "asChild" | "loading"
> {
  placeholder?: ReactNode;
  /** Controlled open state of the calendar. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Props for the Calendar inside, e.g. `disabled` matchers, `locale`, `captionLayout`
   * or `defaultMonth` (used while nothing is picked).
   */
  calendarProps?: PassThroughCalendarProps;
  contentClassName?: string;
}

const defaultFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** `yyyy-mm-dd` in local time, the format of `<input type="date">`. */
function toDateString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Controlled when the prop is passed at all, even as undefined (react-hook-form starts that way). */
function useValue<T>(controlled: boolean, value: T, defaultValue: T, onChange?: (next: T) => void) {
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const set = (next: T) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

function useOpen(open: boolean | undefined, onOpenChange?: (open: boolean) => void) {
  const [internal, setInternal] = useState(false);
  const current = open ?? internal;
  const set = (next: boolean) => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  return [current, set] as const;
}

const triggerClassName = cn(
  "w-full justify-between font-normal sm:w-[16rem]",
  "data-[empty=true]:text-muted-foreground",
  "[&>[data-slot=date-picker-icon]]:text-muted-foreground"
);

interface DatePickerProps extends PickerTriggerProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | undefined) => void;
  /** Text on the trigger. Defaults to the browser's medium date style. */
  formatValue?: (date: Date) => string;
  /** Submits the date as `yyyy-mm-dd` in a native form. */
  name?: string;
}

/**
 * A button that opens a calendar in a popover and shows the chosen date.
 * Picking a day closes it; picking the same day again clears it.
 *
 * With server rendering, pass `formatValue` with a fixed locale so the server
 * and the browser print the date the same way.
 */
function DatePicker(props: DatePickerProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    placeholder = "Pick a date",
    formatValue = (date: Date) => defaultFormat.format(date),
    name,
    open,
    onOpenChange,
    calendarProps,
    contentClassName,
    className,
    ...buttonProps
  } = props;
  const [date, setDate] = useValue<Date | undefined>(
    "value" in props,
    value ?? undefined,
    defaultValue ?? undefined,
    onValueChange
  );
  const [isOpen, setOpen] = useOpen(open, onOpenChange);

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-slot="date-picker"
          data-empty={!date || undefined}
          className={cn(triggerClassName, className)}
          {...buttonProps}
        >
          <span className="truncate">{date ? formatValue(date) : placeholder}</span>
          <CalendarIcon aria-hidden="true" data-slot="date-picker-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto overflow-hidden p-0", contentClassName)} align="start">
        <Calendar
          {...calendarProps}
          mode="single"
          selected={date}
          defaultMonth={date ?? calendarProps?.defaultMonth}
          onSelect={(next) => {
            setDate(next);
            if (next) setOpen(false);
          }}
        />
      </PopoverContent>
      {name ? <input type="hidden" name={name} value={date ? toDateString(date) : ""} /> : null}
    </Popover>
  );
}

interface DateRangePickerProps extends PickerTriggerProps {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (range: DateRange | undefined) => void;
  /** Text on the trigger. Defaults to the browser's medium date style, as a range. */
  formatValue?: (range: DateRange) => string;
  /** Submits `from` and `to` as `yyyy-mm-dd` in a native form. */
  names?: { from: string; to: string };
  /** Months shown side by side. */
  numberOfMonths?: number;
}

function formatRange({ from, to }: DateRange) {
  if (!from) return "";
  if (!to) return defaultFormat.format(from);
  return defaultFormat.formatRange(from, to);
}

/**
 * Like DatePicker, for a start and an end date. It closes after the second
 * pick since it opened, once both ends are set.
 */
function DateRangePicker(props: DateRangePickerProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    placeholder = "Pick a date range",
    formatValue = formatRange,
    names,
    numberOfMonths = 2,
    open,
    onOpenChange,
    calendarProps,
    contentClassName,
    className,
    ...buttonProps
  } = props;
  const [range, setRange] = useValue<DateRange | undefined>(
    "value" in props,
    value ?? undefined,
    defaultValue ?? undefined,
    onValueChange
  );
  const [isOpen, setOpenState] = useOpen(open, onOpenChange);
  // DayPicker turns the first click into a one-day range, so "complete" means
  // the second pick since the calendar opened.
  const picks = useRef(0);
  const setOpen = (next: boolean) => {
    if (next) picks.current = 0;
    setOpenState(next);
  };

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-slot="date-range-picker"
          data-empty={!range?.from || undefined}
          className={cn(triggerClassName, "sm:w-[18rem]", className)}
          {...buttonProps}
        >
          <span className="truncate">{range?.from ? formatValue(range) : placeholder}</span>
          <CalendarIcon aria-hidden="true" data-slot="date-picker-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto overflow-hidden p-0", contentClassName)} align="start">
        <Calendar
          {...calendarProps}
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={range}
          defaultMonth={range?.from ?? calendarProps?.defaultMonth}
          onSelect={(next) => {
            picks.current += 1;
            setRange(next);
            if (picks.current >= 2 && next?.from && next.to) setOpen(false);
          }}
        />
      </PopoverContent>
      {names ? (
        <>
          <input
            type="hidden"
            name={names.from}
            value={range?.from ? toDateString(range.from) : ""}
          />
          <input type="hidden" name={names.to} value={range?.to ? toDateString(range.to) : ""} />
        </>
      ) : null}
    </Popover>
  );
}

export {
  DatePicker,
  DateRangePicker,
  type DatePickerProps,
  type DateRange,
  type DateRangePickerProps,
};
