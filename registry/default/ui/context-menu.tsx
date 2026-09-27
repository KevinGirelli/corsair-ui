"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * A menu of actions for an area of the page, opened with a right click, a
 * long press on touch screens, or the keyboard's context menu key (or
 * Shift+F10) while something inside the trigger area has focus. Inside, the
 * arrow keys move between items, typing a letter jumps to the item that
 * starts with it, ArrowRight opens a submenu and ArrowLeft closes it, and
 * Escape closes the menu. Screen readers hear menu items, checkbox items and
 * radio items with their checked state. The menu is hidden until someone
 * asks for it, so every action in it should also be reachable another way
 * (a toolbar button or a DropdownMenu). With reduced motion it appears
 * without fading or zooming.
 *
 * @example
 * <ContextMenu>
 *   <ContextMenuTrigger className="rounded-md border p-8">Right click here</ContextMenuTrigger>
 *   <ContextMenuContent>
 *     <ContextMenuItem>
 *       Copy
 *       <ContextMenuShortcut>⌘C</ContextMenuShortcut>
 *     </ContextMenuItem>
 *     <ContextMenuSeparator />
 *     <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
 *   </ContextMenuContent>
 * </ContextMenu>
 */
function ContextMenu(props: ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

/**
 * The area that opens the menu on right click or long press. It renders a
 * `<span>`; use `asChild` to make your own element the area. Keyboard users
 * reach the menu through a focusable element inside it.
 */
function ContextMenuTrigger(props: ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuPortal(props: ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

/**
 * The floating list, rendered in a portal at the pointer. It never grows
 * taller than the space the viewport leaves it and scrolls instead.
 */
function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          "bg-popover text-popover-foreground z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[8rem] origin-[var(--radix-context-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md outline-none",
          // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuGroup(props: ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

interface ContextMenuLabelProps extends ComponentProps<typeof ContextMenuPrimitive.Label> {
  /** Indents the label to line up with items that have an icon or indicator. */
  inset?: boolean;
}

/** A heading inside the menu. It is not focusable and cannot be selected. */
function ContextMenuLabel({ className, inset, ...props }: ContextMenuLabelProps) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset || undefined}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

interface ContextMenuItemProps extends ComponentProps<typeof ContextMenuPrimitive.Item> {
  /** Indents the item to line up with items that have an icon or indicator. */
  inset?: boolean;
  /** `destructive` colours the item for actions that delete or cannot be undone. */
  variant?: "default" | "destructive";
}

/** An action. `onSelect` runs on click, Enter or Space and then the menu closes. */
function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
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
function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        data-slot="context-menu-checkbox-item-indicator"
        className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"
      >
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

/** Groups radio items so exactly one is checked. Controlled with `value` / `onValueChange`. */
function ContextMenuRadioGroup(props: ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

/** One option of a ContextMenuRadioGroup, announced with its checked state. */
function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        data-slot="context-menu-radio-item-indicator"
        className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center"
      >
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon aria-hidden="true" className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
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
function ContextMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

/** A nested menu: wraps a ContextMenuSubTrigger and a ContextMenuSubContent. */
function ContextMenuSub(props: ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

interface ContextMenuSubTriggerProps extends ComponentProps<
  typeof ContextMenuPrimitive.SubTrigger
> {
  /** Indents the item to line up with items that have an icon or indicator. */
  inset?: boolean;
}

/** The item that opens a submenu, on hover, Enter, Space or ArrowRight. */
function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
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
    </ContextMenuPrimitive.SubTrigger>
  );
}

/** The submenu's list, rendered in a portal next to its trigger. */
function ContextMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        data-slot="context-menu-sub-content"
        className={cn(
          "bg-popover text-popover-foreground z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[8rem] origin-[var(--radix-context-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-lg outline-none",
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  type ContextMenuItemProps,
  type ContextMenuLabelProps,
  type ContextMenuSubTriggerProps,
};
