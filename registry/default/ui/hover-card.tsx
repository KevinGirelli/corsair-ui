"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * A preview card that appears while the pointer rests on a link, or while
 * the link has keyboard focus, and goes away when either leaves. Use it for
 * supplementary content only: touch and screen reader users may never see
 * the card, so the trigger must lead somewhere on its own (a profile page,
 * the full article) and nothing in the card may be the only way to do
 * something. The card opens after `openDelay` (400ms) and closes after
 * `closeDelay` (150ms), long enough to move the pointer onto it. With
 * reduced motion it appears without fading or zooming.
 *
 * @example
 * <HoverCard>
 *   <HoverCardTrigger asChild>
 *     <a href="/users/ada">@ada</a>
 *   </HoverCardTrigger>
 *   <HoverCardContent>
 *     <p className="font-medium">Ada Lovelace</p>
 *     <p className="text-muted-foreground">Writes about analytical engines.</p>
 *   </HoverCardContent>
 * </HoverCard>
 */
function HoverCard({
  openDelay = 400,
  closeDelay = 150,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.Root>) {
  return (
    <HoverCardPrimitive.Root
      data-slot="hover-card"
      openDelay={openDelay}
      closeDelay={closeDelay}
      {...props}
    />
  );
}

/** The link the card belongs to. It renders an `<a>`; use `asChild` for your router's link. */
function HoverCardTrigger(props: ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

/** The card, rendered in a portal next to the trigger. */
function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground z-50 w-64 origin-[var(--radix-hover-card-content-transform-origin)] rounded-md border p-4 shadow-md outline-none",
          // animate-in/out sit behind motion-safe: so reduced motion really turns them off.
          "motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
