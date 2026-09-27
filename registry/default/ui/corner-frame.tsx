import { Slot, Slottable } from "@radix-ui/react-slot";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/registry/default/lib/utils";

type CornerFrameCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: CornerFrameCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

const LINE = "var(--corner-frame-thickness)";
const INSET = "var(--corner-frame-inset)";

/** Where each bracket sits and which two edges it draws. */
const CORNER_STYLES: Record<CornerFrameCorner, CSSProperties> = {
  "top-left": { top: INSET, left: INSET, borderTopWidth: LINE, borderLeftWidth: LINE },
  "top-right": { top: INSET, right: INSET, borderTopWidth: LINE, borderRightWidth: LINE },
  "bottom-left": { bottom: INSET, left: INSET, borderBottomWidth: LINE, borderLeftWidth: LINE },
  "bottom-right": { bottom: INSET, right: INSET, borderBottomWidth: LINE, borderRightWidth: LINE },
};

interface CornerFrameProps extends Omit<ComponentProps<"div">, "color"> {
  /** Which corners get a bracket: "all", or a list of them. */
  corners?: "all" | CornerFrameCorner[];
  /** Length of each arm of a bracket. Any CSS length. */
  size?: string;
  /** Line width of the brackets. Any CSS length. */
  thickness?: string;
  /**
   * Bracket colour: any CSS colour or theme variable. Sets
   * `--corner-frame-color`; without it the brackets use that variable when an
   * ancestor sets it, and `var(--primary)` otherwise.
   */
  color?: string;
  /** How far the brackets sit inside the edges. Negative values move them outside. */
  inset?: string;
  /** Render the single child element as the frame instead of a `<div>`. */
  asChild?: boolean;
}

/**
 * A box with bracket marks on its corners, like a viewfinder. The brackets
 * are decoration: they are hidden from screen readers and ignore the
 * pointer, so the content inside works as usual. It renders no motion and
 * needs no JavaScript.
 *
 * @example
 * <CornerFrame corners={["top-left", "bottom-right"]} size="16px" className="p-6">
 *   <p>Framed content</p>
 * </CornerFrame>
 */
function CornerFrame({
  corners = "all",
  size = "12px",
  thickness = "2px",
  color,
  inset = "0px",
  asChild = false,
  className,
  style,
  children,
  ...props
}: CornerFrameProps) {
  const Comp = asChild ? Slot : "div";
  const shown = corners === "all" ? CORNERS : CORNERS.filter((corner) => corners.includes(corner));

  return (
    <Comp
      data-slot="corner-frame"
      className={cn("relative", className)}
      style={
        {
          "--corner-frame-size": size,
          "--corner-frame-thickness": thickness,
          "--corner-frame-inset": inset,
          ...(color ? { "--corner-frame-color": color } : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <Slottable>{children}</Slottable>
      {shown.map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          data-slot="corner-frame-corner"
          data-corner={corner}
          className="pointer-events-none absolute border-0 border-solid"
          style={{
            width: "var(--corner-frame-size)",
            height: "var(--corner-frame-size)",
            borderColor: "var(--corner-frame-color, var(--primary))",
            ...CORNER_STYLES[corner],
          }}
        />
      ))}
    </Comp>
  );
}

export { CornerFrame, type CornerFrameCorner, type CornerFrameProps };
