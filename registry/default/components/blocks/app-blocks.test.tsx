import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/registry/default/components/blocks/login-form";
import { NotFound } from "@/registry/default/components/blocks/not-found";
import { SignupForm } from "@/registry/default/components/blocks/signup-form";

/** A promise the test settles by hand, to observe the pending state. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Records whether a submit reached the document un-cancelled (a native
 * submit), then cancels it so jsdom does not try to navigate.
 */
function watchNativeSubmits() {
  const submits: boolean[] = [];
  const listener = (event: Event) => {
    submits.push(!event.defaultPrevented);
    event.preventDefault();
  };
  document.addEventListener("submit", listener);
  return { submits, stop: () => document.removeEventListener("submit", listener) };
}

function password(name = "Password") {
  return screen.getByLabelText(name, { selector: "input" }) as HTMLInputElement;
}

describe("LoginForm", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: "Email" }), "sam@example.com");
    await user.type(password(), "hunter22");
  }

  it("renders a complete sign-in card with no props", () => {
    const { container } = render(<LoginForm />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("login-form");
    expect(root.dataset.status).toBe("idle");
    expect(root.querySelector("[data-slot=login-form-card]")!.className).toContain("max-w-sm");

    const heading = screen.getByRole("heading", { level: 1, name: "Sign in to your account" });
    expect(screen.getByRole("region", { name: "Sign in to your account" })).toBe(root);
    expect(heading).toBeTruthy();
    expect(screen.getByText("Enter your email and password to continue.")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Forgot password?" }).getAttribute("href")).toBe(
      "#forgot-password"
    );
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("#sign-up");
    expect(screen.getByText(/Don't have an account\?/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" }).getAttribute("type")).toBe("submit");
    // No providers by default.
    expect(root.querySelector("[data-slot=login-form-providers]")).toBeNull();
    expect(screen.queryByText("or continue with")).toBeNull();
  });

  it("uses labelled, required fields with autocomplete hints", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const email = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(email.autocomplete).toBe("email");

    const pass = password();
    expect(pass.type).toBe("password");
    expect(pass.required).toBe(true);
    expect(pass.autocomplete).toBe("current-password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);
    expect(pass.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the live regions mounted and empty while idle", () => {
    render(<LoginForm />);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("goes from pending to success with the values, then resets", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onSubmit = vi.fn(() => request.promise);
    const { container } = render(<LoginForm onSubmit={onSubmit} />);
    const root = container.firstElementChild as HTMLElement;

    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: "Remember me" }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "hunter22",
      remember: true,
    });
    expect(root.dataset.status).toBe("pending");
    expect(root.querySelector("form")!.dataset.status).toBe("pending");
    expect(
      (screen.getByRole("button", { name: "Signing in…" }) as HTMLButtonElement).disabled
    ).toBe(true);

    await act(async () => request.resolve());

    expect(root.dataset.status).toBe("success");
    expect(screen.getByRole("status").textContent).toBe("You're signed in.");
    expect(screen.getByRole("alert").textContent).toBe("");
    expect(password().value).toBe("");
    expect(screen.getByRole("checkbox", { name: "Remember me" }).getAttribute("aria-checked")).toBe(
      "false"
    );
  });

  it("reports remember as false when unchecked or hidden", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm showRemember={false} onSubmit={onSubmit} />);
    expect(screen.queryByRole("checkbox")).toBeNull();

    await fill(user);
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "hunter22",
      remember: false,
    });
  });

  it("goes from pending to error and keeps the values", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const { container } = render(<LoginForm onSubmit={() => request.promise} />);

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await act(async () => request.reject(new Error("Wrong password")));

    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("error");
    expect(screen.getByRole("alert").textContent).toBe(
      "Could not sign you in. Check your email and password and try again."
    );
    expect(screen.getByRole("status").textContent).toBe("");
    expect(password().value).toBe("hunter22");
  });

  it("does not bypass native validation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.type(screen.getByRole("textbox", { name: "Email" }), "not-an-email");
    await user.type(password(), "hunter22");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("idle");
  });

  it("submits natively without onSubmit and passes form props through", async () => {
    const user = userEvent.setup();
    const native = watchNativeSubmits();
    const formSubmit = vi.fn();
    try {
      render(<LoginForm formProps={{ action: "/login", method: "post", onSubmit: formSubmit }} />);
      const form = screen.getByRole("button", { name: "Sign in" }).closest("form")!;
      expect(form.getAttribute("action")).toBe("/login");
      expect(form.getAttribute("method")).toBe("post");

      await fill(user);
      await user.click(screen.getByRole("button", { name: "Sign in" }));
      expect(formSubmit).toHaveBeenCalledTimes(1);
      expect(native.submits).toEqual([true]);
    } finally {
      native.stop();
    }
  });

  it("renders providers as outline buttons and links under a separator", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <LoginForm
        providers={[
          { id: "sso", label: "Continue with SSO", icon: <svg data-testid="sso" />, onClick },
          { label: "Continue with Email link", href: "#magic" },
        ]}
      />
    );
    const providers = container.querySelector("[data-slot=login-form-providers]") as HTMLElement;
    expect(within(providers).getByText("or continue with")).toBeTruthy();

    const sso = within(providers).getByRole("button", { name: "Continue with SSO" });
    expect(sso.getAttribute("type")).toBe("button");
    expect(sso.dataset.variant).toBe("outline");
    expect(screen.getByTestId("sso").closest("[aria-hidden=true]")).toBeTruthy();
    await user.click(sso);
    expect(onClick).toHaveBeenCalledTimes(1);

    const link = within(providers).getByRole("link", { name: "Continue with Email link" });
    expect(link.getAttribute("href")).toBe("#magic");
    expect(link.dataset.variant).toBe("outline");
    // Provider buttons are not submit buttons.
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("replaces content and labels through props", async () => {
    const user = userEvent.setup();
    render(
      <LoginForm
        title="Welcome back"
        description={null}
        forgotHref={null}
        signupHref="/join"
        labels={{
          email: "Work email",
          submit: "Continue",
          success: "Done",
          signup: "Create one",
          or: "or",
          showPassword: "Reveal",
        }}
        providers={[{ label: "SSO", onClick: () => {} }]}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeTruthy();
    expect(screen.queryByText("Enter your email and password to continue.")).toBeNull();
    expect(screen.queryByRole("link", { name: "Forgot password?" })).toBeNull();
    expect(screen.getByRole("link", { name: "Create one" }).getAttribute("href")).toBe("/join");
    expect(screen.getByText("or")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reveal" })).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Work email" }), "sam@example.com");
    await user.type(password(), "hunter22");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Done"));
  });

  it("merges className and forwards native props and the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<LoginForm ref={ref} id="login" className="custom" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("login");
    expect(root.className).toContain("custom");
    expect(root.className).toContain("py-16");
  });
});

describe("SignupForm", () => {
  // jsdom does not enforce `minLength` (validity.tooShort), so the attribute is checked instead.
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Sam Lee");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "sam@example.com");
    await user.type(password(), "correct-horse");
  }

  it("renders a complete sign-up card with no props", () => {
    const { container } = render(<SignupForm />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("signup-form");
    expect(root.dataset.status).toBe("idle");

    expect(screen.getByRole("heading", { level: 1, name: "Create an account" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Create an account" })).toBe(root);
    expect(screen.getByRole("button", { name: "Create account" }).getAttribute("type")).toBe(
      "submit"
    );
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("#sign-in");
    expect(screen.getByText(/Already have an account\?/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("#terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe(
      "#privacy"
    );
    expect(root.querySelector("[data-slot=signup-form-providers]")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("uses required fields, a described password with minLength and a required terms box", () => {
    render(<SignupForm />);
    const name = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
    const email = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
    expect(name.required && email.required).toBe(true);
    expect(name.autocomplete).toBe("name");
    expect(email.type).toBe("email");

    const pass = password();
    expect(pass.required).toBe(true);
    expect(pass.minLength).toBe(8);
    expect(pass.autocomplete).toBe("new-password");
    const hint = document.getElementById(pass.getAttribute("aria-describedby")!)!;
    expect(hint.textContent).toBe("At least 8 characters");

    const terms = screen.getByRole("checkbox", {
      name: "I agree to the Terms and Privacy Policy",
    });
    expect(terms.getAttribute("aria-required")).toBe("true");
  });

  it("blocks the submit until the terms are accepted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sam Lee",
      email: "sam@example.com",
      password: "correct-horse",
    });
  });

  it("goes from pending to success, then resets", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const { container } = render(<SignupForm onSubmit={() => request.promise} />);
    const root = container.firstElementChild as HTMLElement;

    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(root.dataset.status).toBe("pending");
    expect(
      (screen.getByRole("button", { name: "Creating account…" }) as HTMLButtonElement).disabled
    ).toBe(true);

    await act(async () => request.resolve());

    expect(root.dataset.status).toBe("success");
    expect(screen.getByRole("status").textContent).toBe("Your account is ready.");
    expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("checkbox", { name: /I agree/ }).getAttribute("aria-checked")).toBe(
      "false"
    );
  });

  it("goes from pending to error and keeps the values", async () => {
    const user = userEvent.setup();
    const request = deferred();
    const { container } = render(<SignupForm onSubmit={() => request.promise} />);

    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await act(async () => request.reject(new Error("Taken")));

    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("error");
    expect(screen.getByRole("alert").textContent).toBe(
      "Could not create your account. Please try again."
    );
    expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe(
      "sam@example.com"
    );
  });

  it("submits natively without onSubmit and passes form props through", async () => {
    const user = userEvent.setup();
    const native = watchNativeSubmits();
    try {
      render(<SignupForm formProps={{ action: "/signup", method: "post" }} />);
      const form = screen.getByRole("button", { name: "Create account" }).closest("form")!;
      expect(form.getAttribute("action")).toBe("/signup");

      await fill(user);
      await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
      await user.click(screen.getByRole("button", { name: "Create account" }));
      expect(native.submits).toEqual([true]);
    } finally {
      native.stop();
    }
  });

  it("replaces content, terms, minLength and labels through props", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    const onClick = vi.fn();
    const { container } = render(
      <SignupForm
        ref={ref}
        className="custom"
        title="Join Acme"
        minLength={12}
        signinHref={null}
        terms={
          <>
            I accept the <a href="/tos">service terms</a>
          </>
        }
        labels={{ passwordHint: "At least 12 characters", submit: "Join" }}
        providers={[{ label: "Continue with SSO", onClick }]}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toContain("custom");
    expect(screen.getByRole("heading", { level: 1, name: "Join Acme" })).toBeTruthy();
    expect(password().minLength).toBe(12);
    expect(screen.getByText("At least 12 characters")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "I accept the service terms" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "service terms" }).getAttribute("href")).toBe("/tos");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("button", { name: "Join" })).toBeTruthy();
    expect(screen.getByText("or continue with")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue with SSO" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("NotFound", () => {
  it("renders a complete 404 section with no props", () => {
    const { container } = render(<NotFound />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.dataset.slot).toBe("not-found");

    const code = root.querySelector("[data-slot=not-found-code]") as HTMLElement;
    expect(code.textContent).toBe("404");
    expect(code.getAttribute("aria-hidden")).toBe("true");

    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.getByText(/couldn't find the page/)).toBeTruthy();

    const home = screen.getByRole("link", { name: "Go home" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.dataset.variant).toBe("default");
    const support = screen.getByRole("link", { name: "Contact support" });
    expect(support.getAttribute("href")).toBe("#contact");
    expect(support.dataset.variant).toBe("outline");
    expect(root.querySelector("[data-slot=not-found-search]")).toBeNull();
  });

  it("replaces content through props and renders the search slot", () => {
    const { container } = render(
      <NotFound
        code="500"
        title="Something broke"
        description="Try again in a minute."
        search={
          <form role="search">
            <input type="search" aria-label="Search the docs" />
          </form>
        }
        actions={<a href="/status">Status page</a>}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.querySelector("[data-slot=not-found-code]")!.textContent).toBe("500");
    expect(screen.getByRole("heading", { level: 1, name: "Something broke" })).toBeTruthy();
    expect(screen.getByText("Try again in a minute.")).toBeTruthy();
    const search = within(root.querySelector("[data-slot=not-found-search]") as HTMLElement);
    expect(search.getByRole("searchbox", { name: "Search the docs" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Status page" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Go home" })).toBeNull();
  });

  it("hides the code and the actions with null", () => {
    const { container } = render(<NotFound code={null} actions={null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.querySelector("[data-slot=not-found-code]")).toBeNull();
    expect(root.querySelector("[data-slot=not-found-actions]")).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("merges className and forwards native props and the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<NotFound ref={ref} id="missing" className="custom" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.id).toBe("missing");
    expect(root.className).toContain("custom");
    expect(root.className).toContain("py-16");
  });
});
