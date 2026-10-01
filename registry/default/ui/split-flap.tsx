"use client";

import { useMemo, useState, type ComponentProps, type CSSProperties, type Ref } from "react";

import { useInView } from "@/registry/default/hooks/use-in-view";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
import { cn } from "@/registry/default/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

// One splitter for the module: user-perceived characters, so emoji and
// accents stay whole wherever the runtime can tell them apart.
const characterSplitter =
  typeof Intl === "object" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(text: string) {
  if (!characterSplitter) return [...text];
  const pieces: string[] = [];
  for (const { segment } of characterSplitter.segment(text)) pieces.push(segment);
  return pieces;
}

type SplitFlapTag = "span" | "div" | "p" | "time";

interface SplitFlapProps extends Omit<ComponentProps<"span">, "children" | "ref"> {
  /** The text on the board. Each character is a cell. */
  value: string;
  ref?: Ref<HTMLElement>;
  as?: SplitFlapTag;
  /** With `as="time"`: the machine-readable value. */
  dateTime?: string;
  /**
   * Number of cells to reserve. Shorter values are padded at the start with
   * `pad`; longer ones are shown in full, with the extra cells.
   */
  length?: number;
  /** The character that fills the reserved cells. A space shows as a blank cell. */
  pad?: string;
  /**
   * The characters a cell steps through, in order and wrapping, on its way
   * from the old character to the new one, one flip per step. A character that
   * is not in the cycle flips straight to the new one.
   */
  cycle?: string;
  /** Which end flips first. */
  from?: "first" | "last";
  /** Time between the cells that flip, in ms. */
  stagger?: number;
  /** How long one flip takes, both halves together, in ms. */
  duration?: number;
  /** Distance to the viewer, in px: lower values give a deeper fold. */
  perspective?: number;
  /** Classes for every cell, such as `bg-card rounded-sm px-1` for tiles. */
  cellClassName?: string;
  /** A thin line across the middle of each cell, where the flaps meet. */
  divider?: boolean;
  /** "polite" announces each new value to screen readers. */
  live?: "off" | "polite";
}

interface Flip {
  /** Remounts the flaps when a cell starts over. */
  key: number;
  /** The characters the cell shows on its way, old first, new last. */
  sequence: string[];
  /** The flip in progress: from `sequence[step]` to `sequence[step + 1]`. */
  step: number;
  /** Wait before the first flip, in ms. */
  delay: number;
}

interface Board {
  signature: string;
  cells: string[];
  flips: (Flip | undefined)[];
  nextKey: number;
}

function toCells(value: string, length: number | undefined, pad: string) {
  const cells = graphemes(value);
  if (length === undefined || cells.length >= length) return cells;
  const filler = graphemes(pad)[0] ?? " ";
  return [...Array<string>(length - cells.length).fill(filler), ...cells];
}

// The way from one character to the next: straight there, or through the cycle.
function route(from: string, to: string, cycle: string[]) {
  const start = cycle.indexOf(from);
  const end = cycle.indexOf(to);
  if (start < 0 || end < 0) return [from, to];
  const sequence = [from];
  for (let index = start; index !== end && sequence.length <= cycle.length;) {
    index = (index + 1) % cycle.length;
    sequence.push(cycle[index] ?? to);
  }
  return sequence;
}

function flipTo(
  board: Board,
  cells: string[],
  signature: string,
  { cycle, from, stagger }: { cycle: string[]; from: "first" | "last"; stagger: number }
): Board {
  let nextKey = board.nextKey;
  const flips: (Flip | undefined)[] = [];
  const changed: number[] = [];
  cells.forEach((character, index) => {
    const previous = board.cells[index];
    const running = board.flips[index];
    if (character === previous) {
      flips[index] = running;
      return;
    }
    // A cell caught mid-flip starts over from the character it was revealing.
    const shown = running ? (running.sequence[running.step + 1] ?? previous) : previous;
    const start = shown ?? " ";
    if (start === character) return;
    changed.push(index);
    flips[index] = { key: nextKey++, sequence: route(start, character, cycle), step: 0, delay: 0 };
  });
  if (from === "last") changed.reverse();
  changed.forEach((index, rank) => {
    const flip = flips[index];
    if (flip) flip.delay = rank * stagger;
  });
  return { signature, cells, flips, nextKey };
}

const blank = (character: string) => (character === " " ? "\u00a0" : character);

interface HalfProps extends ComponentProps<"span"> {
  character: string;
  half: "top" | "bottom";
}

// Half a cell: clipped to its height, with the whole glyph inside lined up
// so only its own half shows. It takes the cell's background, so tiles hide
// what is behind a flap.
function Half({ character, half, className, ...props }: HalfProps) {
  return (
    <span
      data-half={half}
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden [border-radius:inherit] [background:inherit]",
        half === "top" ? "top-0" : "bottom-0",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute inset-x-0 flex h-[200%] items-center justify-center",
          half === "top" ? "top-0" : "bottom-0"
        )}
      >
        {blank(character)}
      </span>
    </span>
  );
}

/**
 * A split-flap board, like the departure boards in stations and airports.
 * When `value` changes, only the cells whose character changed flip: the top
 * half of the old character falls away and the bottom half of the new one
 * drops into place, one cell after another, optionally stepping through
 * `cycle` on the way. The server HTML already shows the value, the first
 * render never animates, and changes only flip while the board is on screen
 * and motion is allowed; otherwise the characters swap in place. Cells are
 * `1ch` wide and a fixed height, so nothing around them moves. Screen
 * readers get the value in one piece.
 *
 * @example
 * <SplitFlap value={minute} length={3} stagger={60} cellClassName="bg-card rounded-sm px-1" />
 */
function SplitFlap({
  value,
  as: Tag = "span",
  length,
  pad = " ",
  cycle,
  from = "first",
  stagger = 40,
  duration = 300,
  perspective = 400,
  cellClassName,
  divider = false,
  live = "off",
  className,
  style,
  ref,
  ...props
}: SplitFlapProps) {
  const [observe, inView] = useInView<HTMLElement>();
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mergedRef = useMemo(() => mergeRefs(ref, observe), [ref, observe]);

  const cells = useMemo(() => toCells(value, length, pad), [value, length, pad]);
  const steps = useMemo(() => (cycle ? graphemes(cycle) : []), [cycle]);
  const signature = cells.join("\u0000");

  const [board, setBoard] = useState<Board>(() => ({
    signature,
    cells,
    flips: [],
    nextKey: 0,
  }));

  // Follow the value during render, so the new characters and their flaps
  // reach the screen in the same paint.
  if (board.signature !== signature) {
    setBoard(
      inView && !reduced
        ? flipTo(board, cells, signature, { cycle: steps, from, stagger })
        : { signature, cells, flips: [], nextKey: board.nextKey }
    );
  } else if (reduced && board.flips.some(Boolean)) {
    setBoard({ ...board, flips: [] });
  }

  const flipping = board.flips.some(Boolean);
  const half = duration / 2;

  // The bottom flap lands last: take the next step, or settle.
  const advance = (index: number, key: number) =>
    setBoard((current) => {
      const flip = current.flips[index];
      if (!flip || flip.key !== key) return current;
      const flips = current.flips.slice();
      flips[index] =
        flip.step + 2 < flip.sequence.length
          ? { ...flip, step: flip.step + 1, delay: 0 }
          : undefined;
      return { ...current, flips };
    });

  return (
    <Tag
      ref={mergedRef as Ref<never>}
      data-slot="split-flap"
      data-state={flipping ? "flipping" : "idle"}
      className={cn("inline-flex", className)}
      style={{ "--split-flap-perspective": `${perspective}px`, ...style } as CSSProperties}
      {...props}
    >
      <span
        className="sr-only"
        aria-live={live === "polite" ? "polite" : undefined}
        aria-atomic={live === "polite" ? "true" : undefined}
      >
        {value}
      </span>
      {board.cells.map((character, index) => {
        const flip = board.flips[index];
        const old = flip?.sequence[flip.step] ?? character;
        const next = flip?.sequence[flip.step + 1] ?? character;
        return (
          <span
            key={index}
            aria-hidden="true"
            data-slot="split-flap-cell"
            data-flipping={flip ? "" : undefined}
            className={cn(
              "relative box-content inline-block h-[1.2em] w-[1ch] text-center leading-[1.2em] tabular-nums",
              cellClassName
            )}
          >
            <span data-slot="split-flap-character" className={cn(flip && "invisible")}>
              {blank(character)}
            </span>
            {flip ? (
              <>
                <Half data-slot="split-flap-half" half="top" character={next} />
                <Half data-slot="split-flap-half" half="bottom" character={old} />
                <Half
                  key={`top-${flip.key}-${flip.step}`}
                  data-slot="split-flap-flap"
                  half="top"
                  character={old}
                  className="motion-safe:animate-split-flap-top origin-bottom [backface-visibility:hidden]"
                  style={{ animationDuration: `${half}ms`, animationDelay: `${flip.delay}ms` }}
                />
                <Half
                  key={`bottom-${flip.key}-${flip.step}`}
                  data-slot="split-flap-flap"
                  half="bottom"
                  character={next}
                  className="motion-safe:animate-split-flap-bottom origin-top [backface-visibility:hidden]"
                  style={{
                    animationDuration: `${half}ms`,
                    animationDelay: `${flip.delay + half}ms`,
                  }}
                  onAnimationEnd={() => advance(index, flip.key)}
                />
              </>
            ) : null}
            {divider ? (
              <span
                data-slot="split-flap-divider"
                className="bg-border pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
              />
            ) : null}
          </span>
        );
      })}
    </Tag>
  );
}

export { SplitFlap, type SplitFlapProps };
