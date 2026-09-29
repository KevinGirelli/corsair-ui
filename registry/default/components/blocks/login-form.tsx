"use client";

import { useId, useState, type ComponentProps, type ReactNode, type SubmitEvent } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/default/ui/card";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";
import { PasswordInput } from "@/registry/default/ui/password-input";
import { Separator } from "@/registry/default/ui/separator";

/** What the form hands to `onSubmit`, read from its fields with FormData. */
interface LoginFormValues {
  email: string;
  password: string;
  /** Whether "Remember me" was checked; always `false` when `showRemember` is off. */
  remember: boolean;
}

/** A third-party sign-in option, rendered as an outline button under the form. */
interface LoginFormProvider {
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
interface LoginFormLabels {
  email: ReactNode;
  password: ReactNode;
  /** Accessible name of the button that reveals the password. */
  showPassword: string;
  forgot: ReactNode;
  remember: ReactNode;
  submit: ReactNode;
  /** Button text while `onSubmit` is running. */
  pending: ReactNode;
  /** Announced in the status region once `onSubmit` resolves. */
  success: ReactNode;
  /** Announced in the alert region when `onSubmit` throws. */
  error: ReactNode;
  /** Text in the separator above the providers. */
  or: ReactNode;
  /** Text before the sign-up link in the footer. */
  signupPrompt: ReactNode;
  signup: ReactNode;
}

type LoginFormStatus = "idle" | "pending" | "success" | "error";

const defaultLabels: LoginFormLabels = {
  email: "Email",
  password: "Password",
  showPassword: "Show password",
  forgot: "Forgot password?",
  remember: "Remember me",
  submit: "Sign in",
  pending: "Signing in…",
  success: "You're signed in.",
  error: "Could not sign you in. Check your email and password and try again.",
  or: "or continue with",
  signupPrompt: "Don't have an account?",
  signup: "Sign up",
};

const linkClassName =
  "text-foreground focus-visible:ring-ring/50 rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]";

interface LoginFormProps extends Omit<ComponentProps<"section">, "title" | "onSubmit"> {
  /** Card title, rendered as an `<h1>` since the form is usually the page's main content. */
  title?: ReactNode;
  description?: ReactNode;
  /** Target of the "Forgot password?" link. Pass `null` to hide the link. */
  forgotHref?: string | null;
  /** Target of the "Sign up" link in the footer. Pass `null` to hide the footer line. */
  signupHref?: string | null;
  /** Shows the "Remember me" checkbox. */
  showRemember?: boolean;
  /** Third-party sign-in options shown under a separator. None by default. */
  providers?: LoginFormProvider[];
  /** Overrides for any of the form's strings; the rest keep their English defaults. */
  labels?: Partial<LoginFormLabels>;
  /**
   * Called with the field values instead of a native submit. While it runs the
   * button is disabled; resolving resets the form and shows `labels.success`,
   * throwing keeps the values and shows `labels.error`.
   */
  onSubmit?: (values: LoginFormValues) => void | Promise<void>;
  /** Props for the `<form>`, such as `action` and `method` for a native submit. */
  formProps?: ComponentProps<"form">;
}

/**
 * A sign-in card centred in a section: a title, a description, email and
 * password fields, a "Forgot password?" link, a "Remember me" checkbox, the
 * submit button, optional third-party providers under an "or continue with"
 * separator and a "Don't have an account? Sign up" line.
 * `<LoginForm />` renders a complete example.
 *
 * Both fields are `required` with `autoComplete` ("email" and
 * "current-password"), so the browser validates them and password managers
 * fill them. The password field has a button to reveal what was typed
 * (`aria-pressed` tells its state). The section is named by its `<h1>`.
 *
 * With `onSubmit`, the form does not navigate: the section and form get
 * `data-status="pending"`, then `"success"` or `"error"`. The success message
 * goes to a `role="status"` region and the error to a `role="alert"` region;
 * both stay mounted (empty when idle) so screen readers announce them.
 * Without `onSubmit` the form submits natively: pass `action` and `method`
 * through `formProps`. The checkbox then submits `remember=on` when checked.
 *
 * @example
 * <LoginForm
 *   forgotHref="/forgot-password"
 *   signupHref="/sign-up"
 *   providers={[{ label: "Continue with SSO", href: "/sso" }]}
 *   onSubmit={async (values) => {
 *     await signIn(values);
 *   }}
 * />
 */
function LoginForm({
  title = "Sign in to your account",
  description = "Enter your email and password to continue.",
  forgotHref = "#forgot-password",
  signupHref = "#sign-up",
  showRemember = true,
  providers,
  labels: labelsProp,
  onSubmit,
  formProps,
  className,
  ...props
}: LoginFormProps) {
  const id = useId();
  const [status, setStatus] = useState<LoginFormStatus>("idle");
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
    const values: LoginFormValues = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      remember: data.get("remember") != null,
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
      data-slot="login-form"
      data-status={status}
      aria-labelledby={`${id}-title`}
      className={cn("py-16 sm:py-24", className)}
      {...props}
    >
      <div
        data-slot="login-form-container"
        className="mx-auto flex w-full max-w-6xl justify-center px-4 sm:px-6"
      >
        <Card data-slot="login-form-card" className="w-full max-w-sm">
          <CardHeader data-slot="login-form-header">
            <h1
              id={`${id}-title`}
              data-slot="login-form-title"
              className="text-xl leading-tight font-semibold tracking-tight"
            >
              {title}
            </h1>
            {description ? (
              <p data-slot="login-form-description" className="text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
          </CardHeader>
          <CardContent data-slot="login-form-content" className="flex flex-col gap-6">
            <form
              data-slot="login-form-form"
              data-status={status}
              {...formProps}
              className={cn("flex flex-col gap-6", formProps?.className)}
              onSubmit={handleSubmit}
            >
              <Field>
                <FieldLabel htmlFor={`${id}-email`}>{labels.email}</FieldLabel>
                <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={`${id}-password`}>{labels.password}</FieldLabel>
                  {forgotHref != null ? (
                    <a
                      href={forgotHref}
                      data-slot="login-form-forgot"
                      className={cn(linkClassName, "text-sm")}
                    >
                      {labels.forgot}
                    </a>
                  ) : null}
                </div>
                <PasswordInput
                  id={`${id}-password`}
                  name="password"
                  autoComplete="current-password"
                  toggleLabel={labels.showPassword}
                  required
                />
              </Field>
              {showRemember ? (
                <Field orientation="horizontal" data-slot="login-form-remember">
                  <Checkbox id={`${id}-remember`} name="remember" />
                  <FieldLabel htmlFor={`${id}-remember`} className="font-normal">
                    {labels.remember}
                  </FieldLabel>
                </Field>
              ) : null}
              <div data-slot="login-form-footer">
                <Button
                  type="submit"
                  data-slot="login-form-submit"
                  loading={pending}
                  className="w-full"
                >
                  {pending ? labels.pending : labels.submit}
                </Button>
                <p role="status" data-slot="login-form-success" className="mt-4 text-sm empty:mt-0">
                  {status === "success" ? labels.success : null}
                </p>
                <p
                  role="alert"
                  data-slot="login-form-error"
                  className="text-destructive mt-4 text-sm empty:mt-0"
                >
                  {status === "error" ? labels.error : null}
                </p>
              </div>
            </form>
            {providers && providers.length > 0 ? (
              <div data-slot="login-form-providers" className="flex flex-col gap-4">
                <div data-slot="login-form-separator" className="flex items-center gap-3">
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
                        data-slot="login-form-provider"
                        className="w-full"
                      >
                        <a href={provider.href}>{content}</a>
                      </Button>
                    ) : (
                      <Button
                        key={provider.id ?? provider.label}
                        type="button"
                        variant="outline"
                        data-slot="login-form-provider"
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
          {signupHref != null ? (
            <CardFooter data-slot="login-form-signup" className="justify-center">
              <p className="text-muted-foreground text-center text-sm">
                {labels.signupPrompt}{" "}
                <a href={signupHref} className={linkClassName}>
                  {labels.signup}
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
  LoginForm,
  type LoginFormLabels,
  type LoginFormProps,
  type LoginFormProvider,
  type LoginFormStatus,
  type LoginFormValues,
};
