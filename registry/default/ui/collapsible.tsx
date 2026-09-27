"use client";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import type { ComponentProps } from "react";
import { cn } from "@/registry/default/lib/utils";
/**
 * One region that a button shows and hides: "show more" lists, advanced
 * options, a sidebar group. The trigger is a button, so Tab reaches it and
 * Enter or Space toggles it; screen readers hear "expanded" or "collapsed"
 * and the button points at the region it controls. Controlled with `open` /
 * `onOpenChange` or uncontrolled with `defaultOpen`. With reduced motion the
 * region opens without sliding. For several sections under headings, use
 * Accordion.
 *
 * @example
 * <Collapsible>
 *   <CollapsibleTrigger asChild>
 *     <Button variant="ghost" size="sm">Advanced options</Button>
 *   </CollapsibleTrigger>
 *   <CollapsibleContent>…</CollapsibleContent>
 * </Collapsible>
 */
function Collapsible(props: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}
/** Toggles the region. Use `asChild` to turn your own button into the trigger. */
function CollapsibleTrigger(props: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}
/** The region that opens and closes. Its height animates, unless motion is reduced. */
function CollapsibleContent({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        // Behind motion-safe: so reduced motion really turns the height animation off.
        "motion-safe:data-[state=open]:animate-collapsible-open motion-safe:data-[state=closed]:animate-collapsible-close",
        className
      )}
      {...props}
    />
  );
}
export { Collapsible, CollapsibleContent, CollapsibleTrigger };
