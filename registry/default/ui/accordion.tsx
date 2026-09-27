"use client";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
/**
 * A stack of sections that open and close under their headings: FAQs,
 * settings groups, long forms. `type="single"` keeps one section open at a
 * time (add `collapsible` to let it close again); `type="multiple"` lets
 * several stay open. Each trigger is a button inside a heading, so Tab
 * reaches it and Enter or Space toggles it; Up and Down move between
 * triggers, Home and End jump to the first and last. Screen readers hear
 * "expanded" or "collapsed", and the open panel is labelled by its trigger.
 * With reduced motion the panels open without sliding.
 *
 * @example
 * <Accordion type="single" collapsible defaultValue="shipping">
 *   <AccordionItem value="shipping">
 *     <AccordionTrigger>How long does shipping take?</AccordionTrigger>
 *     <AccordionContent>Three to five working days.</AccordionContent>
 *   </AccordionItem>
 *   <AccordionItem value="returns">
 *     <AccordionTrigger>Can I return an order?</AccordionTrigger>
 *     <AccordionContent>Within 30 days of delivery.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 */
function Accordion(props: ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}
/** One section: a trigger and its content. `value` identifies it for `value` / `defaultValue`. */
function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}
/**
 * The button that opens and closes the section. It sits in an `<h3>`, so the
 * sections show up in the page outline; change the level in your copy if the
 * surrounding headings need it.
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium hover:underline",
          "transition-[color,box-shadow] outline-none motion-reduce:transition-none",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:opacity-50",
          // The chevron flips while the section is open.
          "[&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          data-slot="accordion-icon"
          className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 motion-safe:transition-transform"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
/**
 * The panel under a trigger. Its height animates open and closed, unless
 * motion is reduced. `className` goes to the inner box that holds the padding.
 */
function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        "overflow-hidden text-sm",
        // Behind motion-safe: so reduced motion really turns the height animation off.
        "motion-safe:data-[state=open]:animate-accordion-open motion-safe:data-[state=closed]:animate-accordion-close"
      )}
      {...props}
    >
      <div data-slot="accordion-content-inner" className={cn("pt-0 pb-4", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
