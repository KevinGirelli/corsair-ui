"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";

const avatarVariants = cva("relative flex shrink-0 overflow-hidden rounded-full", {
  variants: {
    size: {
      sm: "size-6 text-[0.625rem]",
      default: "size-8 text-xs",
      lg: "size-12 text-base",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface AvatarProps
  extends ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {}

/**
 * A round picture of a person or an account, with a fallback (initials or an
 * icon) shown while the image loads or when it fails. Give the image an
 * `alt` with the person's name; when the fallback shows instead, its text is
 * what screen readers read, so keep it meaningful or add an `aria-label`.
 *
 * @example
 * <Avatar>
 *   <AvatarImage src="/people/ada.jpg" alt="Ada Lovelace" />
 *   <AvatarFallback>AL</AvatarFallback>
 * </Avatar>
 */
function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size ?? "default"}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

/** Shown until the image has loaded, and in its place when it cannot load. */
function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full font-medium uppercase select-none",
        className
      )}
      {...props}
    />
  );
}

/**
 * A row of overlapping avatars. Each one gets a ring in the background
 * colour so the edges stay readable where they overlap.
 */
function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "[&>[data-slot=avatar]]:ring-background flex -space-x-2 [&>[data-slot=avatar]]:ring-2",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarGroup, AvatarImage, avatarVariants, type AvatarProps };
