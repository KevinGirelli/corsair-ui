"use client";

import { DayPicker, getDefaultClassNames, type DayButton } from "@daypicker/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button, buttonVariants } from "@/registry/default/ui/button";

type CalendarProps = ComponentProps<typeof DayPicker> & {
  /** Variant of the previous and next month buttons. */
  buttonVariant?: ComponentProps<typeof Button>["variant"];
};

/**
 * A month grid for picking a date, several dates or a range (`mode`), built
 * on DayPicker. Day and month names come from DayPicker's `locale` prop (a
 * date-fns locale), English by default.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn(
        "group/calendar bg-background p-3 [--cell-size:2rem]",
        // Inside a popover or card, take that surface instead of painting over it.
        "[[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        className
      )}
      formatters={{
        // Short month names in the month dropdown, in DayPicker's locale.
        formatMonthDropdown: (month, dateLib) =>
          dateLib
            ? dateLib.format(month, "LLL")
            : month.toLocaleString(undefined, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaults.months),
        month: cn("flex w-full flex-col gap-4", defaults.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaults.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[var(--cell-size)] p-0 select-none aria-disabled:opacity-50",
          defaults.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[var(--cell-size)] p-0 select-none aria-disabled:opacity-50",
          defaults.button_next
        ),
        month_caption: cn(
          "flex h-[var(--cell-size)] w-full items-center justify-center px-[var(--cell-size)]",
          defaults.month_caption
        ),
        dropdowns: cn(
          "flex h-[var(--cell-size)] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaults.dropdowns
        ),
        dropdown_root: cn(
          "border-input relative cursor-pointer rounded-md border",
          "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
          defaults.dropdown_root
        ),
        dropdown: cn("bg-popover absolute inset-0 cursor-pointer opacity-0", defaults.dropdown),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5",
          defaults.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 rounded-md text-[0.8rem] font-normal select-none",
          defaults.weekday
        ),
        week: cn("mt-2 flex w-full", defaults.week),
        week_number_header: cn("w-[var(--cell-size)] select-none", defaults.week_number_header),
        week_number: cn("text-muted-foreground text-[0.8rem] select-none", defaults.week_number),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none",
          "[&:last-child[data-selected=true]_button]:rounded-r-md",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaults.day
        ),
        range_start: cn("bg-accent rounded-l-md", defaults.range_start),
        range_middle: cn("rounded-none", defaults.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaults.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaults.today
        ),
        outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaults.outside),
        disabled: cn("text-muted-foreground opacity-50", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...rootProps} />
        ),
        Chevron: ({
          className,
          orientation,
          size: _size,
          disabled: _disabled,
          ...chevronProps
        }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : ChevronDownIcon;
          return <Icon aria-hidden="true" className={cn("size-4", className)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, week: _week, ...cellProps }) => (
          <th {...cellProps}>
            <div className="flex size-[var(--cell-size)] items-center justify-center text-center">
              {children}
            </div>
          </th>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

/** One day in the grid. Exposed so a custom calendar can wrap or restyle it. */
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const defaults = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);

  // DayPicker moves focus between days by flagging them; follow it.
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const single =
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.isoDate}
      data-selected-single={single || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      className={cn(
        "flex aspect-square size-auto w-full min-w-[var(--cell-size)] flex-col gap-1 leading-none font-normal",
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:rounded-md",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:rounded-md",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-middle=true]:rounded-none",
        "[&>span]:text-xs [&>span]:opacity-70",
        defaults.day_button,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton, type CalendarProps };
