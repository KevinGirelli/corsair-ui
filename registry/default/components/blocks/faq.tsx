import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/default/ui/accordion";

interface FaqItem {
  /** Used as the React key and the accordion value; falls back to `item-<index>`. */
  id?: string;
  question: ReactNode;
  answer: ReactNode;
}

interface FaqProps extends Omit<ComponentProps<"section">, "title" | "defaultValue"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  items?: FaqItem[];
  /** "split" puts the header on the left and the questions on the right on large screens. */
  layout?: "stacked" | "split";
  /** "single" keeps one answer open at a time; "multiple" lets several stay open. */
  type?: "single" | "multiple";
  /** Item value(s) open on first render: an item's `id`, or `item-<index>`. */
  defaultValue?: string | string[];
  /** Shown under the header, e.g. a link to contact. Pass `null` to hide. */
  footer?: ReactNode;
}

const DEFAULT_ITEMS: FaqItem[] = [
  {
    id: "trial",
    question: "Is there a free trial?",
    answer:
      "Yes. Every paid plan starts with a 14-day trial with all features included. No card is needed to start.",
  },
  {
    id: "change-plan",
    question: "Can I change plans later?",
    answer:
      "You can upgrade or downgrade at any time from your account settings. Changes apply from the next billing period.",
  },
  {
    id: "team",
    question: "How do I invite my team?",
    answer:
      "Open the workspace settings and add people by email. They get an invitation link and join with the role you pick.",
  },
  {
    id: "data",
    question: "Where is my data stored?",
    answer:
      "Your data is encrypted in transit and at rest, and backed up daily. You can export everything at any time.",
  },
  {
    id: "cancel",
    question: "What happens if I cancel?",
    answer:
      "Your workspace stays available until the end of the billing period. After that it switches to the free plan and nothing is deleted.",
  },
  {
    id: "support",
    question: "Do you offer support?",
    answer:
      "All plans include help by email. Pro and Enterprise plans get priority replies and a dedicated contact.",
  },
];

const DEFAULT_FOOTER = (
  <>
    Still have questions?{" "}
    <a
      href="#contact"
      className="text-foreground focus-visible:ring-ring/50 rounded font-medium underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-[3px]"
    >
      Contact us
    </a>
  </>
);

/**
 * A frequently asked questions section: a header and the questions in an
 * accordion. The default "split" layout puts the header on the left and the
 * questions on the right on large screens; "stacked" centres the header above
 * a narrower list. `type="single"` (the default) keeps one answer open and
 * lets it close again; `type="multiple"` lets several stay open.
 * `defaultValue` opens items by `id` (or `item-<index>` when there is none).
 * `footer` replaces the "Still have questions?" line.
 *
 * Accessibility: the title is an `<h2>` and each question is a button inside
 * an `<h3>`; Tab reaches the questions, Enter or Space toggles them, and Up,
 * Down, Home and End move between them.
 *
 * @example
 * <Faq
 *   title="Questions"
 *   layout="stacked"
 *   items={[{ question: "Can I pay yearly?", answer: "Yes, with two months free." }]}
 * />
 */
function Faq({
  className,
  eyebrow = "FAQ",
  title = "Frequently asked questions",
  description = "Answers to the questions we hear most. Cannot find what you are looking for? Reach out.",
  items = DEFAULT_ITEMS,
  layout = "split",
  type = "single",
  defaultValue,
  footer = DEFAULT_FOOTER,
  ...props
}: FaqProps) {
  const split = layout === "split";
  const hasHeader = eyebrow != null || title != null || description != null || footer != null;

  const entries = items.map((item, index) => (
    <AccordionItem key={item.id ?? index} value={item.id ?? `item-${index}`} data-slot="faq-item">
      <AccordionTrigger data-slot="faq-question" className="text-base">
        {item.question}
      </AccordionTrigger>
      <AccordionContent data-slot="faq-answer" className="text-muted-foreground text-base">
        {item.answer}
      </AccordionContent>
    </AccordionItem>
  ));

  const listClassName = cn("w-full", !split && "mx-auto max-w-3xl", !split && hasHeader && "mt-12");

  return (
    <section
      data-slot="faq"
      data-layout={layout}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div
        data-slot="faq-container"
        className={cn(
          "mx-auto w-full max-w-6xl px-4 sm:px-6",
          split && "grid gap-12 lg:grid-cols-[1fr_2fr]"
        )}
      >
        {hasHeader ? (
          <div data-slot="faq-header" className={cn("max-w-2xl", !split && "mx-auto text-center")}>
            {eyebrow != null ? (
              <p data-slot="faq-eyebrow" className="text-muted-foreground text-sm font-medium">
                {eyebrow}
              </p>
            ) : null}
            {title != null ? (
              <h2
                data-slot="faq-title"
                className={cn(
                  "text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
                  eyebrow != null && "mt-2"
                )}
              >
                {title}
              </h2>
            ) : null}
            {description != null ? (
              <p
                data-slot="faq-description"
                className="text-muted-foreground mt-4 text-lg text-pretty"
              >
                {description}
              </p>
            ) : null}
            {footer != null ? (
              <p data-slot="faq-footer" className="text-muted-foreground mt-6 text-sm">
                {footer}
              </p>
            ) : null}
          </div>
        ) : null}
        {type === "multiple" ? (
          <Accordion
            type="multiple"
            data-slot="faq-list"
            className={listClassName}
            defaultValue={
              defaultValue === undefined
                ? undefined
                : Array.isArray(defaultValue)
                  ? defaultValue
                  : [defaultValue]
            }
          >
            {entries}
          </Accordion>
        ) : (
          <Accordion
            type="single"
            collapsible
            data-slot="faq-list"
            className={listClassName}
            defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : defaultValue}
          >
            {entries}
          </Accordion>
        )}
      </div>
    </section>
  );
}

export { Faq, type FaqItem, type FaqProps };
