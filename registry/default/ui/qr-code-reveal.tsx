"use client";

import { useId, type ReactNode } from "react";

import { useEntrance, type EntranceTrigger } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

interface QRCodeRevealProps {
  /** The dark modules to reveal. The background stays outside, so the quiet zone always shows. */
  children: ReactNode;
  /** Width and height of the code in viewBox units, quiet zone included. */
  total: number;
  /** "load" plays on first paint with CSS alone; "in-view" when the code scrolls into view. */
  trigger: EntranceTrigger;
  /** How long the reveal takes, in ms. */
  duration: number;
}

/**
 * The client half of `QRCode reveal`: masks the modules with a circle that
 * grows from the centre, so the code seems to draw itself. At rest the circle
 * covers every corner, so server HTML, reduced motion and the end of the
 * animation all show the complete, scannable code. `QRCode` renders it for
 * you when `reveal` is set.
 *
 * @example
 * <QRCodeReveal total={29} trigger="in-view" duration={800}>
 *   <g fill="currentColor">…</g>
 * </QRCodeReveal>
 */
function QRCodeReveal({ children, total, trigger, duration }: QRCodeRevealProps) {
  const [observe, phase] = useEntrance<SVGGElement>({ trigger, once: true });
  // useId can contain characters url(#…) does not accept.
  const maskId = `qr-code-reveal-${useId().replace(/[^\w-]/g, "")}`;
  const centre = total / 2;

  return (
    <g ref={observe} data-slot="qr-code-reveal" data-state={phase}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={total} height={total}>
          {/* Half the diagonal: the full circle reaches every corner. */}
          <circle
            data-slot="qr-code-reveal-shape"
            cx={centre}
            cy={centre}
            r={centre * Math.SQRT2}
            fill="white"
            className={cn(
              "origin-center [transform-box:fill-box]",
              phase !== "static" && "motion-safe:animate-qr-code-reveal"
            )}
            style={
              phase === "static"
                ? undefined
                : {
                    animationDuration: `${duration}ms`,
                    animationPlayState: phase === "armed" ? "paused" : undefined,
                  }
            }
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>{children}</g>
    </g>
  );
}

export { QRCodeReveal, type QRCodeRevealProps };
