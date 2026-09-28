"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

const SIZES = { sm: "icon-sm", default: "icon", lg: "icon-lg" } as const;

interface CopyButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "value" | "size" | "children" | "asChild" | "loading"
> {
  /** The text that lands on the clipboard. */
  value: string;
  size?: keyof typeof SIZES;
  /** How long the check mark stays before the button resets, in ms. */
  timeout?: number;
  /** Called after the text was copied, not when the browser refused. */
  onCopied?: (value: string) => void;
  /** Accessible name of the button. */
  label?: string;
  /** Announced to screen readers once the text is on the clipboard. */
  copiedLabel?: string;
}

/**
 * An icon button that copies `value` and swaps its icon for a check mark.
 * "Copied" is announced through a live region and only claimed when the
 * clipboard accepted the text. The button stays enabled while it shows the
 * check, so keyboard focus is never dropped.
 *
 * @example
 * <CopyButton value="pnpm dlx shadcn@latest add @corsair-ui/copy-button" />
 */
function CopyButton({
  value,
  size = "default",
  timeout = 1600,
  onCopied,
  label = "Copy to clipboard",
  copiedLabel = "Copied",
  variant = "ghost",
  className,
  onClick,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Refused, or not a secure context: nothing was copied, so claim nothing.
      return;
    }
    setCopied(true);
    onCopied?.(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), timeout);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) void copy();
  };

  const icon =
    "col-start-1 row-start-1 motion-safe:transition-[opacity,transform,filter] motion-safe:duration-200 motion-safe:ease-out";

  return (
    <>
      <Button
        type="button"
        data-slot="copy-button"
        data-state={copied ? "copied" : "idle"}
        variant={variant}
        size={SIZES[size]}
        aria-label={label}
        className={cn("grid place-items-center active:scale-95", className)}
        onClick={handleClick}
        {...props}
      >
        <CheckIcon
          aria-hidden="true"
          className={cn(icon, copied ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]")}
        />
        <CopyIcon
          aria-hidden="true"
          className={cn(icon, copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100")}
        />
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}

export { CopyButton, type CopyButtonProps };
