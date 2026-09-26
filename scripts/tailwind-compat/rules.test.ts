// @vitest-environment node
import { describe, expect, it } from "vitest";

import { checkClassToken, splitTopLevel } from "./rules.ts";

const rulesFor = (token: string) => checkClassToken(token).map((finding) => finding.rule);

describe("splitTopLevel", () => {
  it("keeps arbitrary values and variants whole", () => {
    expect(splitTopLevel("data-[state=open]:[&_svg:not(.x)]:size-4", ":")).toEqual([
      "data-[state=open]",
      "[&_svg:not(.x)]",
      "size-4",
    ]);
  });
});

describe("checkClassToken", () => {
  it.each([
    // The kind of class list a shadcn-style component is made of.
    "inline-flex",
    "items-center",
    "gap-1.5",
    "rounded",
    "rounded-t",
    "rounded-md",
    "rounded-t-lg",
    "rounded-full",
    "px-2.5",
    "-mt-0.5",
    "h-9",
    "size-4",
    "w-1/2",
    "-translate-y-1/2",
    "shadow",
    "shadow-md",
    "shadow-none",
    "blur",
    "backdrop-blur",
    "ring-1",
    "ring-2",
    "ring-offset-2",
    "ring-[3px]",
    "border",
    "border-2",
    "outline-none",
    "bg-primary/90",
    "hover:bg-accent/50",
    "text-sm/6",
    "z-50",
    "z-[60]",
    "duration-200",
    "opacity-50",
    "data-[state=open]:animate-in",
    "group-data-[disabled=true]:opacity-50",
    "aria-disabled:pointer-events-none",
    "aria-[invalid=true]:border-destructive",
    "has-[>svg]:px-3",
    "[&_svg]:pointer-events-none",
    "*:data-[slot=icon]:size-4",
    "supports-[backdrop-filter]:bg-background/60",
    "focus-visible:ring-[3px]",
    "dark:bg-input/30",
    "max-sm:hidden",
    "[--sidebar-width:16rem]",
    "w-[var(--sidebar-width)]",
    "rounded-[calc(var(--radius)-2px)]",
    "max-h-[var(--radix-select-content-available-height)]",
    "has-[>svg]:grid-cols-[1rem_1fr]",
    "!flex",
    "fade-in-0",
    "zoom-in-95",
    "slide-in-from-top-2",
    // Things that are not classes at all must stay quiet.
    "(min-width:",
    "768px)",
    "Loading...",
  ])("accepts %s", (token) => {
    expect(checkClassToken(token)).toEqual([]);
  });

  it.each([
    ["data-open:block", "v4-only-variant"],
    ["group-data-open/item:flex", "v4-only-variant"],
    ["aria-invalid:border-destructive", "v4-only-variant"],
    ["not-first:mt-2", "v4-only-variant"],
    ["in-data-[side=left]:ml-2", "v4-only-variant"],
    ["nth-3:underline", "v4-only-variant"],
    ["starting:opacity-0", "v4-only-variant"],
    ["pointer-coarse:p-4", "v4-only-variant"],
    ["@md:flex", "v4-only-variant"],
    ["bg-linear-to-r", "v4-only-utility"],
    ["field-sizing-content", "v4-only-utility"],
    ["inset-shadow-sm", "v4-only-utility"],
    ["mask-radial-from-50%", "v4-only-utility"],
    ["shadow-xs", "v4-only-utility"],
    ["rounded-xs", "v4-only-utility"],
    ["outline-hidden", "v4-only-utility"],
    ["aspect-3/2", "v4-only-utility"],
    ["has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]", "v4-theme-variable"],
    ["w-[calc(100%-var(--spacing)*2)]", "v4-theme-variable"],
    ["rounded-[var(--radius-lg)]", "v4-theme-variable"],
    ["shadow-[0_0_0_1px_var(--color-border)]", "v4-theme-variable"],
    ["p-[--spacing(3)]", "v4-theme-variable"],
    ["bg-(--brand)", "css-var-parens"],
    ["w-(--sidebar-width)", "css-var-parens"],
    ["bg-[--brand]", "css-var-bracket"],
    ["flex!", "important-suffix"],
    ["shadow-sm", "ambiguous-scale"],
    ["blur-sm", "ambiguous-scale"],
    ["drop-shadow-sm", "ambiguous-scale"],
    ["backdrop-blur-sm", "ambiguous-scale"],
    ["ring", "ambiguous-scale"],
    ["focus-visible:ring", "ambiguous-scale"],
    ["outline", "ambiguous-scale"],
    ["rounded-sm", "ambiguous-scale"],
    ["rounded-tl-sm", "ambiguous-scale"],
    ["p-13", "off-scale-value"],
    ["w-128", "off-scale-value"],
    ["-mt-4.5", "off-scale-value"],
    ["bg-black/8", "off-scale-value"],
    ["text-sm/11", "off-scale-value"],
    ["z-60", "off-scale-value"],
    ["duration-250", "off-scale-value"],
    ["grid-cols-16", "off-scale-value"],
    ["border-3", "off-scale-value"],
    ["opacity-33", "off-scale-value"],
    ["grow-2", "off-scale-value"],
  ])("flags %s as %s", (token, rule) => {
    expect(rulesFor(token)).toContain(rule);
  });

  it("reports every problem in a token, not just the first", () => {
    expect(rulesFor("aria-invalid:shadow-sm")).toEqual(["v4-only-variant", "ambiguous-scale"]);
  });

  it("explains how to write the class so both versions agree", () => {
    const [finding] = checkClassToken("aria-invalid:ring-destructive/20");
    expect(finding?.message).toContain('"aria-[invalid=true]:"');
  });
});
