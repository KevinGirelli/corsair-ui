import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";

interface BrowserFrameProps extends ComponentProps<"div"> {
  /** Address shown in the bar, as plain text (it is not a link). */
  url?: string;
  /**
   * Let screen readers read the address. By default the address is
   * decoration, like the window dots, and is hidden from them.
   */
  announceUrl?: boolean;
  /** Content at the right end of the bar, such as buttons. It stays accessible. */
  actions?: ReactNode;
  /**
   * Width / height of the whole window, as a number (`16 / 10`) or a CSS ratio
   * (`"16 / 10"`). The viewport fills what the bar leaves. Without it the
   * content sets the height.
   */
  aspect?: number | string;
  /** Classes for the top bar. */
  barClassName?: string;
  /** Classes for the viewport that holds the children. */
  viewportClassName?: string;
}

/**
 * A browser window drawn in CSS around a page or a screenshot: a top bar
 * with three window dots and an address field, and a viewport for the
 * children. The dots are always hidden from screen readers; the address is
 * too unless `announceUrl` is set, and the whole bar is hidden when it holds
 * nothing to read or use. `actions` keep the bar in the accessibility tree.
 * A server component with no motion.
 *
 * @example
 * <BrowserFrame url="app.example.com/dashboard" aspect="16 / 10" className="w-full max-w-4xl">
 *   <Image src="/screens/dashboard.png" alt="The dashboard" fill className="object-cover" />
 * </BrowserFrame>
 */
function BrowserFrame({
  url,
  announceUrl = false,
  actions,
  aspect,
  barClassName,
  viewportClassName,
  className,
  style,
  children,
  ...props
}: BrowserFrameProps) {
  const hasActions = actions != null && actions !== false;
  const barHidden = !announceUrl && !hasActions;

  return (
    <div
      data-slot="browser-frame"
      className={cn(
        "border-border bg-card flex flex-col overflow-hidden rounded-lg border",
        className
      )}
      style={aspect != null ? { aspectRatio: String(aspect), ...style } : style}
      {...props}
    >
      <div
        data-slot="browser-frame-bar"
        aria-hidden={barHidden ? "true" : undefined}
        className={cn(
          "border-border flex h-11 shrink-0 items-center gap-3 border-b px-3",
          barClassName
        )}
      >
        <span
          aria-hidden="true"
          data-slot="browser-frame-dots"
          className="flex shrink-0 items-center gap-1.5"
        >
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              data-slot="browser-frame-dot"
              className="bg-muted-foreground/40 size-2.5 rounded-full"
            />
          ))}
        </span>
        <span
          aria-hidden={announceUrl || barHidden ? undefined : "true"}
          data-slot="browser-frame-address"
          className="bg-muted text-muted-foreground flex h-7 min-w-0 flex-1 items-center rounded-md px-3 text-xs"
        >
          <span className="truncate">{url}</span>
        </span>
        {hasActions && (
          <div data-slot="browser-frame-actions" className="flex shrink-0 items-center gap-1">
            {actions}
          </div>
        )}
      </div>
      <div
        data-slot="browser-frame-viewport"
        className={cn(
          "bg-background relative overflow-hidden",
          aspect != null && "min-h-0 flex-1",
          viewportClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { BrowserFrame, type BrowserFrameProps };
