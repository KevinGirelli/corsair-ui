import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Label } from "@/registry/default/ui/label";

/**
 * Layout for a form control with its label, description and error. It does
 * not depend on any form library: wire `id`, `htmlFor`, `aria-invalid` and
 * `aria-describedby` yourself, or use FormField from the form item.
 */

function FieldSet({ className, ...props }: ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("flex min-w-0 flex-col gap-6", className)}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    />
  );
}

const fieldVariants = cva("group data-[invalid=true]:text-destructive flex w-full gap-3", {
  variants: {
    orientation: {
      vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
      // The label may sit inside FieldContent, out of reach of `peer-enabled`.
      horizontal:
        "flex-row items-center [&:has(>.peer:enabled)_[data-slot=field-label]]:cursor-pointer [&>[data-slot=field-label]]:flex-auto",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

/**
 * Set `data-invalid` to colour the label and `data-disabled` to dim it.
 * Horizontal puts the control and its label side by side (checkboxes, switches).
 */
function Field({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

/** Stacks a label and description next to a control in a horizontal Field. */
function FieldContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-1 flex-col gap-1.5 leading-snug", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return (
    <Label data-slot="field-label" className={cn("w-fit leading-snug", className)} {...props} />
  );
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-sm leading-normal font-normal",
        "[&>a:hover]:text-foreground [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

interface FieldErrorProps extends ComponentProps<"div"> {
  /** Errors in the shape most form libraries use; duplicates and empty entries are dropped. */
  errors?: ({ message?: string } | undefined)[];
}

/** Renders nothing when there is no message, so it can always be mounted. */
function FieldError({ className, children, errors, ...props }: FieldErrorProps) {
  const messages = [
    ...new Set(errors?.map((error) => error?.message).filter((m): m is string => !!m)),
  ];
  const content =
    children ??
    (messages.length > 1 ? (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    ) : (
      messages[0]
    ));

  if (!content) return null;

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        "text-destructive text-sm font-normal",
        // Errors show up in response to input, so ease them in instead of popping.
        "fade-in-0 slide-in-from-top-1 motion-safe:animate-in ease-out",
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  fieldVariants,
  type FieldErrorProps,
};
