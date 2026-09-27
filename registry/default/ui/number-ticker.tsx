"use client";

import { useEffect, useMemo, useRef, type ComponentProps, type Ref } from "react";
import { useEntrance, type EntranceTrigger } from "@/registry/default/hooks/use-entrance";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Digits after the decimal point, so 12.5 counts in tenths rather than in noisy thousandths. */
function decimalsOf(value: number) {
  if (!Number.isFinite(value)) return 0;
  const [, fraction = ""] = String(value).split(".");
  return Math.min(fraction.length, 20);
}

/**
 * Options for the formatter. Without any digit settings of their own, plain
 * numbers keep the precision of `value` and `from` on every frame, so the
 * width does not jump between frames.
 */
function formatOptions(value: number, from: number, format?: Intl.NumberFormatOptions) {
  const style = format?.style ?? "decimal";
  const hasDigits =
    format?.minimumFractionDigits !== undefined ||
    format?.maximumFractionDigits !== undefined ||
    format?.minimumSignificantDigits !== undefined ||
    format?.maximumSignificantDigits !== undefined;
  if (hasDigits || (style !== "decimal" && style !== "unit")) return format;
  const decimals = Math.max(decimalsOf(value), decimalsOf(from));
  return { minimumFractionDigits: decimals, maximumFractionDigits: decimals, ...format };
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

interface NumberTickerProps extends Omit<ComponentProps<"span">, "children"> {
  /** The number it counts to. */
  value: number;
  /** The number it counts from. */
  from?: number;
  /** Length of the count, in ms. */
  duration?: number;
  /** Wait before it starts, in ms. */
  delay?: number;
  /** Locale for the digits, separators and currency. */
  locale?: string;
  /** Passed to `Intl.NumberFormat`: currency, percent, compact notation, digits… */
  format?: Intl.NumberFormatOptions;
  /** "load" counts as soon as the page runs; "in-view" when the number scrolls into view. */
  trigger?: EntranceTrigger;
  /** In-view: count the first time only. */
  once?: boolean;
  /** Takes over from `trigger`: `false` holds it at `from`, `true` counts. */
  play?: boolean;
}

/**
 * A number that counts up (or down) to its value with an ease-out. It
 * writes straight to the text once per frame instead of re-rendering
 * React. The server HTML holds the final, formatted value for search
 * engines and browsers without JavaScript; screen readers only ever hear
 * the final value, since the moving digits are hidden from them; and with
 * `prefers-reduced-motion` the final value just shows. Digits are tabular,
 * so the width holds still while it counts.
 *
 * @example
 * <NumberTicker value={12840} format={{ style: "currency", currency: "USD" }} />
 */
function NumberTicker({
  value,
  from = 0,
  duration = 1600,
  delay = 0,
  locale = "en-US",
  format,
  trigger = "in-view",
  once = true,
  play,
  className,
  ref,
  ...props
}: NumberTickerProps) {
  const [observe, phase] = useEntrance<HTMLSpanElement>({ trigger, once, play });
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);
  const output = useRef<HTMLSpanElement>(null);

  // A new `format` object on every render must not restart the count.
  const optionsKey = JSON.stringify(formatOptions(value, from, format) ?? null);
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(
        locale,
        (JSON.parse(optionsKey) as Intl.NumberFormatOptions | null) ?? undefined
      ),
    [locale, optionsKey]
  );
  const finalText = formatter.format(value);

  useEffect(() => {
    const node = output.current;
    if (!node) return;
    // Change the value of React's own text node rather than replacing it,
    // so React's later updates still land on the node that is on screen.
    const write = (text: string) => {
      const child = node.firstChild;
      if (child?.nodeType === Node.TEXT_NODE) child.nodeValue = text;
      else node.textContent = text;
      node.style.visibility = "visible";
    };
    const settle = () => write(formatter.format(value));
    if (phase === "static" || prefersReducedMotion()) return settle();
    if (phase === "armed") return write(formatter.format(from));

    const length = Math.max(duration, 1);
    write(formatter.format(from));
    // Timed from the first frame's own timestamp, so it never mixes clocks.
    let start: number | undefined;
    let id = 0;
    const tick = (now: number) => {
      start ??= now + delay;
      const progress = Math.min(Math.max((now - start) / length, 0), 1);
      if (progress >= 1) return settle();
      write(formatter.format(from + (value - from) * easeOutCubic(progress)));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase, formatter, value, from, duration, delay]);

  return (
    <span
      ref={mergedRef}
      data-slot="number-ticker"
      data-state={phase}
      className={cn("inline-block tabular-nums", className)}
      {...props}
    >
      <span className="sr-only">{finalText}</span>
      {/* Hidden until the script takes over when it is about to play, so the final value does not flash first; shown as is without JavaScript. */}
      <span
        ref={output}
        aria-hidden="true"
        data-slot="number-ticker-value"
        className={cn(phase === "play" && "[@media(scripting:enabled)]:invisible")}
      >
        {finalText}
      </span>
    </span>
  );
}

export { NumberTicker, type NumberTickerProps };
