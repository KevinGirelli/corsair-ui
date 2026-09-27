"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * A menu of actions or options that opens from a button. The trigger is
 * announced as a button with a menu popup; Enter, Space or ArrowDown open
 * the menu and focus the first item. Inside, the arrow keys move between
 * items, typing a letter jumps to the item that starts with it, ArrowRight
 * opens a submenu and ArrowLeft closes it, and Escape closes the menu and
 * returns focus to the trigger. Screen readers hear menu items, checkbox
 * items and radio items with their checked state. With reduced motion it
 * appears without fading or zooming.
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <Button variant="outline">Options</Button>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuLabel>My account</DropdownMenuLabel>
 *     <DropdownMenuItem>
 *       Profile
 *       <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
 *     </DropdownMenuItem>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

/** Opens the menu. Use `asChild` to turn your own button into the trigger. */
function DropdownMenuTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuPortal(props: ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

/**
 * The floating list, rendered in a portal. It never grows taller than the
 * space the viewport leaves it and scrolls instead.
 */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md outline-none",
          // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup(props: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

interface DropdownMenuLabelProps extends ComponentProps<typeof DropdownMenuPrimitive.Label> {
  /** Indents the label to line up with items that have an icon or indicator. */
  inset?: boolean;
}

/** A heading inside the menu. It is not focusable and cannot be selected. */
function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

interface DropdownMenuItemProps extends ComponentProps<typeof DropdownMenuPrimitive.Item> {
  /** Indents the item to line up with items that have an icon or indicator. */
  inset?: boolean;
  /** `destructive` colours the item for actions that delete or cannot be undone. */
  variant?: "default" | "destructive";
}

/** An action. `onSelect` runs on click, Enter or Space and then the menu closes. */
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/** An item that toggles on and off, announced with its checked state. */
function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        data-slot="dropdown-menu-checkbox-item-indicator"
        className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

/** Groups radio items so exactly one is checked. Controlled with `value` / `onValueChange`. */
function DropdownMenuRadioGroup(props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

/** One option of a DropdownMenuRadioGroup, announced with its checked state. */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        data-slot="dropdown-menu-radio-item-indicator"
        className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon aria-hidden="true" className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

/**
 * The keyboard shortcut shown at the end of an item. It is only a hint: the
 * shortcut itself is yours to handle, and `aria-keyshortcuts` on the item
 * tells screen readers about it.
 */
function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

/** A nested menu: wraps a DropdownMenuSubTrigger and a DropdownMenuSubContent. */
function DropdownMenuSub(props: ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

interface DropdownMenuSubTriggerProps extends ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  /** Indents the item to line up with items that have an icon or indicator. */
  inset?: boolean;
}

/** The item that opens a submenu, on hover, Enter, Space or ArrowRight. */
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

/** The submenu's list, rendered in a portal next to its trigger. */
function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        className={cn(
          "bg-popover text-popover-foreground z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-lg outline-none",
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSubTriggerProps,
};
