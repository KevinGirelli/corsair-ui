"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/registry/default/ui/field";

type FormControlProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = ControllerRenderProps<TFieldValues, TName> & {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label?: ReactNode;
  description?: ReactNode;
  /** Horizontal puts the control before its label (checkboxes, switches). */
  orientation?: "vertical" | "horizontal";
  className?: string;
  /**
   * Render the control. Spread `field` on inputs; for Checkbox, Switch or
   * Select map `field.value` / `field.onChange` to their own props.
   */
  render: (props: {
    field: FormControlProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
  }) => ReactElement;
}

/**
 * A react-hook-form field laid out with Field. It generates the id, points the
 * label at it, and sets aria-invalid and aria-describedby on the control so
 * the description and error are announced with it.
 *
 * @example
 * <FormField
 *   control={form.control}
 *   name="email"
 *   label="Email"
 *   description="We only use it to reply to you."
 *   render={({ field }) => <Input type="email" {...field} />}
 * />
 */
function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  orientation = "vertical",
  className,
  render,
  ...controller
}: FormFieldProps<TFieldValues, TName>) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      {...controller}
      render={({ field, fieldState }) => {
        const describedBy =
          [description ? descriptionId : null, fieldState.invalid ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined;

        const control = render({
          field: {
            ...field,
            id,
            "aria-invalid": fieldState.invalid,
            "aria-describedby": describedBy,
          },
          fieldState,
        });
        const labelNode = label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null;
        const descriptionNode = description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null;
        const errorNode = <FieldError id={errorId} errors={[fieldState.error]} />;

        return (
          <Field
            orientation={orientation}
            data-invalid={fieldState.invalid || undefined}
            data-disabled={field.disabled || undefined}
            className={className}
          >
            {orientation === "horizontal" ? (
              <>
                {control}
                <FieldContent>
                  {labelNode}
                  {descriptionNode}
                  {errorNode}
                </FieldContent>
              </>
            ) : (
              <>
                {labelNode}
                {control}
                {descriptionNode}
                {errorNode}
              </>
            )}
          </Field>
        );
      }}
    />
  );
}

export { FormField, type FormControlProps, type FormFieldProps };
