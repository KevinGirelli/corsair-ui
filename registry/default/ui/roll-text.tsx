import { Fragment, type ComponentProps, type Ref } from "react";
import { cn } from "@/registry/default/lib/utils";

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

type RollTextTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface RollTextProps extends Omit<ComponentProps<"span">, "children"> {
  /** Plain text. */
  children: string;
  /** The element to render. */
  as?: RollTextTag;
  /** Time between one character starting to roll and the next, in ms. */
  stagger?: number;
  /** How long each character takes to roll, in ms. */
  duration?: number;
}

/**
 * Text whose characters roll up, one after another, to reveal a copy of
 * themselves: a small flourish for links and buttons. It rolls when the
 * text is hovered, or when a parent with Tailwind's `group` class is
 * hovered or has keyboard focus, so it follows the link or button it sits
 * in. It is CSS transitions only and works as a server component. Screen
 * readers get the text once; with `prefers-reduced-motion` it holds still.
 * Characters are clipped to the line box, so keep a line height with room
 * for descenders.
 *
 * @example
 * <a href="/about" className="group">
 *   <RollText>About us</RollText>
 * </a>
 */
function RollText({
  children,
  as: Tag = "span",
  stagger = 20,
  duration = 400,
  className,
  ref,
  ...props
}: RollTextProps) {
  // Words and the whitespace between them, whitespace kept as it is.
  const parts = children.split(/(\s+)/).filter(Boolean);
  let next = 0;

  return (
    <Tag
      ref={ref as Ref<never>}
      data-slot="roll-text"
      className={cn("group inline-block whitespace-pre-wrap", className)}
      {...props}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" data-slot="roll-text-visual">
        {parts.map((part, partIndex) =>
          /^\s+$/.test(part) ? (
            <Fragment key={partIndex}>{part}</Fragment>
          ) : (
            // A word never breaks between its characters.
            <span key={partIndex} className="inline-block whitespace-nowrap">
              {graphemes(part).map((character) => {
                const index = next++;
                return (
                  <span
                    key={index}
                    data-slot="roll-text-character"
                    className="relative inline-block overflow-clip align-top"
                  >
                    <span
                      className="relative inline-block transition-transform ease-[cubic-bezier(0.65,0,0.35,1)] motion-safe:group-hover:-translate-y-full motion-safe:group-focus-visible:-translate-y-full motion-reduce:transition-none"
                      style={{
                        transitionDuration: `${duration}ms`,
                        transitionDelay: `${index * stagger}ms`,
                      }}
                    >
                      {character}
                      <span className="absolute top-full left-0">{character}</span>
                    </span>
                  </span>
                );
              })}
            </span>
          )
        )}
      </span>
    </Tag>
  );
}

export { RollText, type RollTextProps };
