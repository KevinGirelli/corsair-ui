"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState, type ComponentProps, type KeyboardEvent } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/default/ui/input-group";

interface NumberInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step"
> {
  /** `null` when empty. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Arrow keys and the buttons move by this much. */
  step?: number;
  /** Page Up / Page Down and Shift + arrow keys move by this much. Defaults to `step * 10`. */
  largeStep?: number;
  decrementLabel?: string;
  incrementLabel?: string;
  /** Classes for the bordered group around the input and the buttons. */
  groupClassName?: string;
}

function decimalsOf(n: number) {
  const text = String(n);
  return text.includes(".") ? text.split(".")[1]!.length : 0;
}

/** Accepts a dot or a comma as the decimal separator; anything else that is not a number is null. */
function parse(text: string) {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "" || trimmed === "-" || trimmed === ".") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

/**
 * A number field with − and + buttons, following the spinbutton pattern:
 * arrow keys, Page Up / Page Down, Home and End. Typed values are checked and
 * clamped on blur or Enter. The buttons stay out of the tab order, since the
 * keys already cover them.
 */
function NumberInput(props: NumberInputProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    step = 1,
    largeStep = step * 10,
    decrementLabel = "Decrease",
    incrementLabel = "Increase",
    className,
    groupClassName,
    disabled,
    readOnly,
    onBlur,
    onKeyDown,
    ...inputProps
  } = props;
  const controlled = "value" in props;
  const [internal, setInternal] = useState<number | null>(defaultValue ?? null);
  const current = controlled ? (value ?? null) : internal;
  // What the user is typing, until it is committed; null shows `current`.
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const commit = (next: number | null) => {
    setDraft(null);
    if (next === current) return;
    if (!controlled) setInternal(next);
    onValueChange?.(next);
  };
  const base = () => (draft === null ? current : parse(draft));
  const stepBy = (delta: number) => {
    const from = base();
    const decimals = Math.max(
      decimalsOf(step),
      decimalsOf(largeStep),
      from === null ? 0 : decimalsOf(from)
    );
    const next = from === null ? clamp(min ?? 0) : clamp(from + delta);
    commit(Number(next.toFixed(decimals)));
  };

  const locked = disabled || readOnly;
  const atMin = min !== undefined && current !== null && current <= min;
  const atMax = max !== undefined && current !== null && current >= max;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || locked) return;
    const keys: Record<string, () => void> = {
      ArrowUp: () => stepBy(event.shiftKey ? largeStep : step),
      ArrowDown: () => stepBy(-(event.shiftKey ? largeStep : step)),
      PageUp: () => stepBy(largeStep),
      PageDown: () => stepBy(-largeStep),
      Home: () => min !== undefined && commit(min),
      End: () => max !== undefined && commit(max),
      Enter: () => {
        const parsed = base();
        commit(parsed === null ? null : clamp(parsed));
      },
    };
    const action = keys[event.key];
    if (!action) return;
    if (event.key !== "Enter") event.preventDefault();
    action();
  };

  const button = (label: string, delta: number, blocked: boolean, Icon: typeof PlusIcon) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      tabIndex={-1}
      aria-label={label}
      disabled={locked || blocked}
      // Keep focus (and the caret) in the input.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => stepBy(delta)}
      className="size-7"
    >
      <Icon aria-hidden="true" />
    </Button>
  );

  return (
    <InputGroup data-slot="number-input" className={groupClassName}>
      <InputGroupInput
        {...inputProps}
        type="text"
        role="spinbutton"
        inputMode={decimalsOf(step) > 0 || (min ?? -1) < 0 ? "decimal" : "numeric"}
        autoComplete="off"
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        readOnly={readOnly}
        value={draft ?? (current === null ? "" : String(current))}
        onChange={(event) => {
          // Digits, one separator and a leading minus; anything else is ignored.
          if (/^-?\d*[.,]?\d*$/.test(event.target.value)) setDraft(event.target.value);
        }}
        onBlur={(event) => {
          if (draft !== null) {
            const parsed = parse(draft);
            commit(parsed === null ? null : clamp(parsed));
          }
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        className={cn("tabular-nums", className)}
      />
      <InputGroupAddon align="inline-end" className="gap-0.5 pr-1">
        {button(decrementLabel, -step, atMin, MinusIcon)}
        {button(incrementLabel, step, atMax, PlusIcon)}
      </InputGroupAddon>
    </InputGroup>
  );
}

export { NumberInput, type NumberInputProps };
