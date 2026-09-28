import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { CopyButton } from "@/registry/default/ui/copy-button";

interface CodeBlockProps extends Omit<ComponentProps<"figure">, "children" | "title"> {
  /** The source. Rendered as is unless `children` is given, and always what the copy button copies. */
  code: string;
  /** Shown as a small label in the corner and exposed as `data-language`. */
  language?: string;
  /** A caption above the code, such as a file name. */
  title?: ReactNode;
  showCopyButton?: boolean;
  /** Accessible name of the copy button. */
  copyLabel?: string;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
  /**
   * Highlighted content to render inside `<code>` in place of the raw
   * `code`, such as the token spans from a syntax highlighter.
   */
  children?: ReactNode;
  /** Extra classes for the `<pre>`. */
  preClassName?: string;
}

/**
 * A block of code with an optional caption, a language label and a copy
 * button. The code sits in a `<pre>` that takes keyboard focus, so a long
 * line can be scrolled with the arrow keys; the caption names the figure
 * for screen readers. The copy button announces
 * "Copied" once the text is on the clipboard. It animates nothing.
 *
 * @example
 * <CodeBlock title="Install" language="bash" code="pnpm dlx shadcn@latest add @corsair-ui/code-block" />
 */
function CodeBlock({
  code,
  language,
  title,
  showCopyButton = true,
  copyLabel = "Copy code",
  wrap = false,
  children,
  className,
  preClassName,
  ...props
}: CodeBlockProps) {
  const toolbar = showCopyButton || Boolean(language);
  const titleId = useId();

  return (
    <figure
      data-slot="code-block"
      data-language={language}
      data-wrap={wrap}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        "bg-muted/50 text-foreground relative overflow-hidden rounded-lg border text-sm",
        className
      )}
      {...props}
    >
      {title ? (
        <figcaption
          id={titleId}
          data-slot="code-block-title"
          className={cn(
            "text-muted-foreground border-b px-4 py-2.5 text-xs font-medium",
            toolbar && "pr-24"
          )}
        >
          {title}
        </figcaption>
      ) : null}
      {toolbar ? (
        <div
          data-slot="code-block-toolbar"
          className="absolute top-1 right-1 flex items-center gap-1"
        >
          {language ? (
            <span
              data-slot="code-block-language"
              className="text-muted-foreground px-1.5 font-mono text-xs select-none"
            >
              {language}
            </span>
          ) : null}
          {showCopyButton ? <CopyButton size="sm" value={code} label={copyLabel} /> : null}
        </div>
      ) : null}
      <pre
        data-slot="code-block-pre"
        // A scrolling region has to take focus so keyboard users can scroll
        // it (WCAG 2.1.1, axe "scrollable-region-focusable"); a `<pre>` has no
        // interactive role to give it, so the rule does not apply here.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className={cn(
          "overflow-x-auto p-4 font-mono text-sm leading-relaxed outline-none",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset",
          wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre",
          toolbar && !title && "pr-24",
          preClassName
        )}
      >
        <code data-slot="code-block-code">{children ?? code}</code>
      </pre>
    </figure>
  );
}

export { CodeBlock, type CodeBlockProps };
