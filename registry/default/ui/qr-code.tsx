import { create } from "qrcode";
import type { ComponentProps, ReactNode } from "react";

// Encoding runs where the component renders; on the server that means no
// encoder in the browser bundle.

import { cn } from "@/registry/default/lib/utils";

/** The three 7×7 corner squares scanners lock on to. */
function inFinder(row: number, column: number, size: number) {
  return (
    (row < 7 && column < 7) || (row < 7 && column >= size - 7) || (row >= size - 7 && column < 7)
  );
}

/** A rounded rectangle as path data, so a ring can be cut out with even-odd filling. */
function roundedRect(x: number, y: number, size: number, radius: number) {
  const r = Math.min(radius, size / 2);
  return `M${x + r} ${y}h${size - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${size - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${size - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${size - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

interface QRCodeProps extends Omit<ComponentProps<"svg">, "children"> {
  /** The text or URL to encode. */
  value: string;
  /** Width and height in px; the SVG scales cleanly beyond it. */
  size?: number;
  /** How the modules are drawn. Every style keeps the corner squares solid, so it scans. */
  variant?: "dots" | "rounded" | "squares";
  /**
   * How much damage the code survives: L 7%, M 15%, Q 25%, H 30%. Higher
   * levels make denser codes; use Q or H when something covers the middle.
   */
  errorCorrection?: "L" | "M" | "Q" | "H";
  /** Quiet zone around the code, in modules. Scanners want at least 2; the standard asks for 4. */
  margin?: number;
  /** Colour of the modules. Keep it dark on a light background: many scanners fail on inverted codes. */
  color?: string;
  /** Colour behind the modules. */
  background?: string;
}

/**
 * A QR code drawn as one crisp SVG, from the `qrcode` encoder. It has no
 * state and no effects, so it renders on the server with no JavaScript in
 * the page. It is an image named after what it encodes; pass `aria-label`
 * to describe it better ("QR code to download the app").
 *
 * @example
 * <QRCode value="https://github.com/KevinGirelli/corsair-ui" size={180} />
 */
function QRCode({
  value,
  size = 200,
  variant = "dots",
  errorCorrection = "M",
  margin = 2,
  color = "#0b0b0c",
  background = "#ffffff",
  className,
  "aria-label": label,
  ...props
}: QRCodeProps) {
  let modules: ReturnType<typeof create>["modules"];
  try {
    modules = create(value, { errorCorrectionLevel: errorCorrection }).modules;
  } catch {
    // Too much data for a QR code at this level.
    return null;
  }

  const count = modules.size;
  const quiet = Math.max(0, margin);
  const total = count + quiet * 2;
  const shapes: ReactNode[] = [];

  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      if (!modules.get(row, column) || inFinder(row, column, count)) continue;
      const x = column + quiet;
      const y = row + quiet;
      shapes.push(
        variant === "dots" ? (
          <circle key={`${row}-${column}`} cx={x + 0.5} cy={y + 0.5} r={0.4} />
        ) : (
          <rect
            key={`${row}-${column}`}
            x={x + (variant === "rounded" ? 0.05 : 0)}
            y={y + (variant === "rounded" ? 0.05 : 0)}
            width={variant === "rounded" ? 0.9 : 1}
            height={variant === "rounded" ? 0.9 : 1}
            rx={variant === "rounded" ? 0.3 : 0}
          />
        )
      );
    }
  }

  const corners = [
    [quiet, quiet],
    [quiet + count - 7, quiet],
    [quiet, quiet + count - 7],
  ] as const;
  const square = variant === "squares";

  return (
    <svg
      role="img"
      aria-label={label ?? `QR code: ${value}`}
      data-slot="qr-code"
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering={square ? "crispEdges" : undefined}
      className={cn("block h-auto max-w-full", className)}
      {...props}
    >
      <rect width={total} height={total} rx={square ? 0 : Math.min(quiet, 2)} fill={background} />
      <g fill={color}>
        {corners.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            {/* The ring: an outer square with the inner one cut out. */}
            <path
              fillRule="evenodd"
              d={`${roundedRect(x, y, 7, square ? 0 : 2.2)}${roundedRect(x + 1, y + 1, 5, square ? 0 : 1.4)}`}
            />
            <path d={roundedRect(x + 2, y + 2, 3, square ? 0 : 1)} />
          </g>
        ))}
        {shapes}
      </g>
    </svg>
  );
}

export { QRCode, type QRCodeProps };
