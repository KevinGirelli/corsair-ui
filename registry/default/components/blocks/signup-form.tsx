"use client";

import { useId, useState, type ComponentProps, type ReactNode, type SubmitEvent } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/default/ui/card";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";
import { PasswordInput } from "@/registry/default/ui/password-input";
import { Separator } from "@/registry/default/ui/separator";

/** What the form hands to `onSubmit`, read from its fields with FormData. */
interface SignupFormValues {
  name: string;
  email: string;
  password: string;
}

/** A third-party sign-up option, rendered as an outline button under the form. */
interface SignupFormProvider {
  /** React key; defaults to `label`. */
  id?: string;
  /** Visible text, such as "Continue with GitHub". */
  label: string;
  /** Decorative icon before the label; it is hidden from screen readers. */
  icon?: ReactNode;
  /** Renders a button that calls this. Ignored when `href` is set. */
  onClick?: () => void;
  /** Renders a link instead of a button. */
  href?: string;
}

/** Every string the form shows, including the button and status messages. */
interface SignupFormLabels {
  name: ReactNode;
  email: ReactNode;
  password: ReactNode;
  /** Hint under the password field, linked to it with `aria-describedby`. */
  passwordHint: ReactNode;
  /** Accessible name of the button that reveals the password. */
  showPassword: string;
  submit: ReactNode;
  /** Button text while `onSubmit` is running. */
  pending: ReactNode;
  /** Announced in the status region once `onSubmit` resolves. */
  success: ReactNode;
  /** Announced in the alert region when `onSubmit` throws. */
  error: ReactNode;
  /** Text in the separator above the providers. */
  or: ReactNode;
  /** Text before the sign-in link in the footer. */
  signinPrompt: ReactNode;
  signin: ReactNode;
}

type SignupFormStatus = "idle" | "pending" | "success" | "error";

const defaultLabels: SignupFormLabels = {
  name: "Name",
  email: "Email",
  password: "Password",
  passwordHint: "At least 8 characters",
  showPassword: "Show password",
  submit: "Create account",
  pending: "Creating account…",
  success: "Your account is ready.",
  error: "Could not create your account. Please try again.",
  or: "or continue with",
  signinPrompt: "Already have an account?",
  signin: "Sign in",
};

const linkClassName =
  "text-foreground focus-visible:ring-ring/50 rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]";

const defaultTerms = (
  <>
    I agree to the{" "}
    <a href="#terms" className={cn(linkClassName, "underline")}>
      Terms
    </a>{" "}
    and{" "}
    <a href="#privacy" className={cn(linkClassName, "underline")}>
      Privacy Policy
    </a>
  </>
);

interface SignupFormProps extends Omit<ComponentProps<"section">, "title" | "onSubmit"> {
  /** Card title, rendered as an `<h1>` since the form is usually the page's main content. */
  title?: ReactNode;
  description?: ReactNode;
  /** Label of the required terms checkbox; it can contain links. */
  terms?: ReactNode;
  /** Shortest password the field accepts (native `minLength`). */
  minLength?: number;
  /** Target of the "Sign in" link in the footer. Pass `null` to hide the footer line. */
  signinHref?: string | null;
  /** Third-party sign-up options shown under a separator. None by default. */
  providers?: SignupFormProvider[];
  /** Overrides for any of the form's strings; the rest keep their English defaults. */
  labels?: Partial<SignupFormLabels>;
  /**
   * Called with the field values instead of a native submit. While it runs the
   * button is disabled; resolving resets the form and shows `labels.success`,
   * throwing keeps the values and shows `labels.error`.
   */
  onSubmit?: (values: SignupFormValues) => void | Promise<void>;
  /** Props for the `<form>`, such as `action` and `method` for a native submit. */
  formProps?: ComponentProps<"form">;
}

/**
 * A sign-up card centred in a section: a title, a description, name, email
 * and password fields, a required terms checkbox, the submit button,
 * optional third-party providers under an "or continue with" separator and
 * an "Already have an account? Sign in" line. `<SignupForm />` renders a
 * complete example.
 *
 * Every field is `required` with `autoComplete` ("name", "email",
 * "new-password"); the password also has `minLength` (8 by default) and a
 * hint linked with `aria-describedby`, so the browser blocks a short
 * password or an unchecked terms box before `onSubmit` runs. The password
 * field has a button to reveal what was typed (`aria-pressed` tells its
 * state). The section is named by its `<h1>`.
 *
 * With `onSubmit`, the form does not navigate: the section and form get
 * `data-status="pending"`, then `"success"` or `"error"`. The success message
 * goes to a `role="status"` region and the error to a `role="alert"` region;
 * both stay mounted (empty when idle) so screen readers announce them.
 * Without `onSubmit` the form submits natively: pass `action` and `method`
 * through `formProps`.
 *
 * @example
 * <SignupForm
 *   minLength={12}
 *   labels={{ passwordHint: "At least 12 characters" }}
 *   terms={<>I accept the <a href="/terms">terms of service</a></>}
 *   onSubmit={async (values) => {
 *     await createAccount(values);
 *   }}
 * />
 */
function SignupForm({
  title = "Create an account",
  description = "Enter your details to get started.",
  terms = defaultTerms,
  minLength = 8,
  signinHref = "#sign-in",
  providers,
  labels: labelsProp,
  onSubmit,
  formProps,
  className,
  ...props
}: SignupFormProps) {
  const id = useId();
  const [status, setStatus] = useState<SignupFormStatus>("idle");
  const labels = { ...defaultLabels, ...labelsProp };
  const pending = status === "pending";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    formProps?.onSubmit?.(event);
    // No handler, or the consumer cancelled it: leave the native submit alone.
    if (!onSubmit || event.defaultPrevented) return;
    event.preventDefault();
    if (pending) return;

    // React clears currentTarget once the event is handled, so keep the form.
    const form = event.currentTarget;
    const data = new FormData(form);
    const values: SignupFormValues = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };

    setStatus("pending");
    try {
      await onSubmit(values);
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      data-slot="signup-form"
      data-status={status}
      aria-labelledby={`${id}-title`}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div
        data-slot="signup-form-container"
        className="mx-auto flex w-full max-w-6xl justify-center px-4 sm:px-6"
      >
        <Card data-slot="signup-form-card" className="w-full max-w-sm">
          <CardHeader data-slot="signup-form-header">
            <h1
              id={`${id}-title`}
              data-slot="signup-form-title"
              className="text-xl leading-tight font-semibold tracking-tight"
            >
              {title}
            </h1>
            {description ? (
              <p data-slot="signup-form-description" className="text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
          </CardHeader>
          <CardContent data-slot="signup-form-content" className="flex flex-col gap-6">
            <form
              data-slot="signup-form-form"
              data-status={status}
              {...formProps}
              className={cn("flex flex-col gap-6", formProps?.className)}
              onSubmit={handleSubmit}
            >
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>{labels.name}</FieldLabel>
                <Input id={`${id}-name`} name="name" autoComplete="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-email`}>{labels.email}</FieldLabel>
                <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-password`}>{labels.password}</FieldLabel>
                <PasswordInput
                  id={`${id}-password`}
                  name="password"
                  autoComplete="new-password"
                  minLength={minLength}
                  toggleLabel={labels.showPassword}
                  aria-describedby={`${id}-password-hint`}
                  required
                />
                <FieldDescription id={`${id}-password-hint`} data-slot="signup-form-password-hint">
                  {labels.passwordHint}
                </FieldDescription>
              </Field>
              <Field orientation="horizontal" data-slot="signup-form-terms" className="items-start">
                <Checkbox id={`${id}-terms`} name="terms" required className="mt-0.5" />
                <FieldLabel htmlFor={`${id}-terms`} className="font-normal">
                  {terms}
                </FieldLabel>
              </Field>
              <div data-slot="signup-form-footer">
                <Button
                  type="submit"
                  data-slot="signup-form-submit"
                  loading={pending}
                  className="w-full"
                >
                  {pending ? labels.pending : labels.submit}
                </Button>
                <p
                  role="status"
                  data-slot="signup-form-success"
                  className="mt-4 text-sm empty:mt-0"
                >
                  {status === "success" ? labels.success : null}
                </p>
                <p
                  role="alert"
                  data-slot="signup-form-error"
                  className="text-destructive mt-4 text-sm empty:mt-0"
                >
                  {status === "error" ? labels.error : null}
                </p>
              </div>
            </form>
            {providers && providers.length > 0 ? (
              <div data-slot="signup-form-providers" className="flex flex-col gap-4">
                <div data-slot="signup-form-separator" className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-muted-foreground text-xs">{labels.or}</span>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-2">
                  {providers.map((provider) => {
                    const content = (
                      <>
                        {provider.icon ? (
                          <span aria-hidden="true" className="contents">
                            {provider.icon}
                          </span>
                        ) : null}
                        {provider.label}
                      </>
                    );
                    return provider.href != null ? (
                      <Button
                        key={provider.id ?? provider.label}
                        asChild
                        variant="outline"
                        data-slot="signup-form-provider"
                        className="w-full"
                      >
                        <a href={provider.href}>{content}</a>
                      </Button>
                    ) : (
                      <Button
                        key={provider.id ?? provider.label}
                        type="button"
                        variant="outline"
                        data-slot="signup-form-provider"
                        className="w-full"
                        onClick={provider.onClick}
                      >
                        {content}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </CardContent>
          {signinHref != null ? (
            <CardFooter data-slot="signup-form-signin" className="justify-center">
              <p className="text-muted-foreground text-center text-sm">
                {labels.signinPrompt}{" "}
                <a href={signinHref} className={linkClassName}>
                  {labels.signin}
                </a>
              </p>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

export {
  SignupForm,
  type SignupFormLabels,
  type SignupFormProps,
  type SignupFormProvider,
  type SignupFormStatus,
  type SignupFormValues,
};
