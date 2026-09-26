/**
 * Rules for class names that behave differently, or only exist, in one of the
 * two Tailwind majors we support. Registry code has to render the same in a
 * Tailwind 3.4 project and in a Tailwind 4 project, and neither compiler warns
 * about a class it does not know: it just emits nothing. These rules are the
 * warning Tailwind does not give.
 *
 * Each check looks at a single class token, e.g. `data-[state=open]:bg-accent/50`.
 */

export type RuleId =
  | "v4-only-variant"
  | "v4-only-utility"
  | "css-var-parens"
  | "css-var-bracket"
  | "important-suffix"
  | "ambiguous-scale"
  | "off-scale-value";

export interface TokenFinding {
  rule: RuleId;
  token: string;
  message: string;
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));

const setOf = (...values: (string | number)[]) => new Set(values.map(String));

/* -------------------------------------------------------------------------- */
/* Variants                                                                   */
/* -------------------------------------------------------------------------- */

/** `aria-*` variants that ship with Tailwind 3. Anything else needs brackets there. */
const V3_ARIA_VARIANTS = setOf(
  "busy",
  "checked",
  "disabled",
  "expanded",
  "hidden",
  "pressed",
  "readonly",
  "required",
  "selected"
);

const V4_ONLY_VARIANTS = setOf(
  "starting",
  "inert",
  "details-content",
  "user-valid",
  "user-invalid",
  "noscript",
  "inverted-colors",
  "pointer-fine",
  "pointer-coarse",
  "pointer-none",
  "any-pointer-fine",
  "any-pointer-coarse",
  "any-pointer-none"
);

/** `group-data-open/item` → `data-open`: the part that decides compatibility. */
function normalizeVariant(variant: string) {
  const withoutName = variant.replace(/\/[\w-]+$/, "");
  return withoutName.replace(/^(group|peer)-/, "");
}

function checkVariant(variant: string, token: string): TokenFinding | null {
  const name = normalizeVariant(variant);

  if (name.startsWith("@")) {
    return {
      rule: "v4-only-variant",
      token,
      message: `Container query variant "${variant}:" needs a plugin on Tailwind 3. Use a media query variant, or a CSS container query in the item's css.`,
    };
  }

  if (/^data-(?!\[)/.test(name)) {
    return {
      rule: "v4-only-variant",
      token,
      message: `"${variant}:" is Tailwind 4 shorthand. Use the bracket form, e.g. "data-[state=open]:".`,
    };
  }

  const aria = /^aria-([a-z-]+)$/.exec(name);
  if (aria?.[1] && !V3_ARIA_VARIANTS.has(aria[1])) {
    return {
      rule: "v4-only-variant",
      token,
      message: `"${variant}:" is not built into Tailwind 3. Use the bracket form, e.g. "aria-[${aria[1]}=true]:".`,
    };
  }

  if (
    /^(not|in|nth|nth-last|nth-of-type|nth-last-of-type)-/.test(name) ||
    V4_ONLY_VARIANTS.has(name)
  ) {
    return {
      rule: "v4-only-variant",
      token,
      message: `"${variant}:" only exists in Tailwind 4. Use an arbitrary variant such as "[&:not(:first-child)]:" instead.`,
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

const V4_ONLY_UTILITIES = [
  "field-sizing",
  "inset-shadow",
  "inset-ring",
  "text-shadow",
  "mask",
  "perspective",
  "perspective-origin",
  "rotate-x",
  "rotate-y",
  "rotate-z",
  "scale-z",
  "translate-z",
  "transform-3d",
  "transform-flat",
  "backface",
  "scheme",
  "font-stretch",
  "bg-linear",
  "bg-radial",
  "bg-conic",
  "outline-hidden",
  "wrap-break-word",
  "wrap-anywhere",
  "shadow-xs",
  "blur-xs",
  "drop-shadow-xs",
  "backdrop-blur-xs",
];

/**
 * Tailwind 4 shifted the small end of these scales one step, so the same class
 * name compiles to a different value (checked against the real compilers):
 *
 *   shadow-sm         v3: 0 1px 2px 0 / 5%       v4: what v3 called `shadow`
 *   blur-sm           v3: 4px                    v4: 8px
 *   drop-shadow-sm    v3: 0 1px 1px / 5%         v4: 0 1px 2px / 15%
 *   backdrop-blur-sm  v3: 4px                    v4: 8px
 *   rounded-sm        v3: 0.125rem               v4: 0.25rem
 *   ring              v3: 3px                    v4: 1px
 *   outline           v3: style only             v4: style + 1px width
 *
 * The bare `shadow`, `blur`, `drop-shadow`, `backdrop-blur` and `rounded`
 * kept their v3 values in v4, so they are safe.
 */
const AMBIGUOUS_UTILITIES = setOf(
  "shadow-sm",
  "blur-sm",
  "drop-shadow-sm",
  "backdrop-blur-sm",
  "ring",
  "outline"
);

const ROUNDED_SIDES = "(-(t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?";
const ROUNDED_SM = new RegExp(`^rounded${ROUNDED_SIDES}-sm$`);
const ROUNDED_XS = new RegExp(`^rounded${ROUNDED_SIDES}-xs$`);

const V3_SPACING = setOf(
  0,
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  ...range(4, 12),
  14,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
  44,
  48,
  52,
  56,
  60,
  64,
  72,
  80,
  96
);

const SPACING_UTILITY =
  /^(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|inset|inset-x|inset-y|top|right|bottom|left|start|end|translate-x|translate-y|scroll-m[xytrblse]?|scroll-p[xytrblse]?|indent|basis|border-spacing(?:-x|-y)?)-(\d+(?:\.\d+)?)$/;

const WIDTHS_0_1_2_4_8 = setOf(0, 1, 2, 4, 8);
const FIVE_STEPS = setOf(...Array.from({ length: 21 }, (_, step) => step * 5));

/** Numeric utilities whose Tailwind 3 scale is a fixed list; Tailwind 4 accepts any number. */
const NUMERIC_SCALES: [RegExp, Set<string>][] = [
  [/^z-(\d+)$/, setOf(0, 10, 20, 30, 40, 50)],
  [/^(grid-cols|grid-rows|col-span|row-span|columns|order)-(\d+)$/, setOf(...range(1, 12))],
  [/^(col-start|col-end|row-start|row-end)-(\d+)$/, setOf(...range(1, 13))],
  [/^(duration|delay)-(\d+)$/, setOf(0, 75, 100, 150, 200, 300, 500, 700, 1000)],
  [/^line-clamp-(\d+)$/, setOf(...range(1, 6))],
  [/^leading-(\d+)$/, setOf(...range(3, 10))],
  [/^(border|divide)(-[xytrblse])?-(\d+)$/, setOf(0, 2, 4, 8)],
  [
    /^(ring|ring-offset|outline|outline-offset|underline-offset|decoration)-(\d+)$/,
    WIDTHS_0_1_2_4_8,
  ],
  [/^stroke-(\d+)$/, setOf(0, 1, 2)],
  [/^opacity-(\d+)$/, FIVE_STEPS],
  [/^rotate-(\d+)$/, setOf(0, 1, 2, 3, 6, 12, 45, 90, 180)],
  [/^scale(-x|-y)?-(\d+)$/, setOf(0, 50, 75, 90, 95, 100, 105, 110, 125, 150)],
  [/^skew-(x|y)-(\d+)$/, setOf(0, 1, 2, 3, 6, 12)],
  [/^(grow|shrink)-(\d+)$/, setOf(0)],
  [/^(backdrop-)?brightness-(\d+)$/, setOf(0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200)],
  [/^(backdrop-)?contrast-(\d+)$/, setOf(0, 50, 75, 100, 125, 150, 200)],
  [/^(backdrop-)?saturate-(\d+)$/, setOf(0, 50, 100, 150, 200)],
  [/^(backdrop-)?hue-rotate-(\d+)$/, setOf(0, 15, 30, 60, 90, 180)],
  [/^(backdrop-)?(grayscale|invert|sepia)-(\d+)$/, setOf(0)],
];

const FONT_SIZE = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/;
const V3_LINE_HEIGHTS = setOf(
  ...range(3, 10),
  "none",
  "tight",
  "snug",
  "normal",
  "relaxed",
  "loose"
);

/** Splits on `separator` outside of `[]` and `()`, so arbitrary values stay whole. */
export function splitTopLevel(value: string, separator: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "[" || char === "(") depth += 1;
    if (char === "]" || char === ")") depth = Math.max(0, depth - 1);

    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts;
}

function lastNumber(match: RegExpExecArray) {
  return match[match.length - 1] ?? "";
}

function checkUtility(rawUtility: string, token: string): TokenFinding[] {
  const findings: TokenFinding[] = [];
  let utility = rawUtility.replace(/^!/, "");

  if (utility.endsWith("!")) {
    findings.push({
      rule: "important-suffix",
      token,
      message: `Trailing "!" only works in Tailwind 4. Put it in front instead: "!${utility.slice(0, -1)}".`,
    });
    utility = utility.slice(0, -1);
  }

  utility = utility.replace(/^-/, "");

  // `(--x)` and `(length:--x)`, but not the `var(--x)` inside an arbitrary value.
  if (/(?<!var)\((?:[a-z-]+:)?--[\w-]+\)/.test(utility)) {
    findings.push({
      rule: "css-var-parens",
      token,
      message: `The "(--var)" shorthand only exists in Tailwind 4. Use "[var(--var)]", which works in both.`,
    });
  }

  if (/-\[--[\w-]+\](\/.*)?$/.test(utility)) {
    findings.push({
      rule: "css-var-bracket",
      token,
      message: `"[--var]" is read as var() only by Tailwind 3. Use "[var(--var)]", which works in both.`,
    });
  }

  // Arbitrary values and properties compile the same way in both versions.
  if (utility.startsWith("[") || utility.includes("[") || utility.includes("(")) {
    return findings;
  }

  const [base = "", modifier] = splitTopLevel(utility, "/");

  if (modifier !== undefined) {
    const isFraction = /^[a-z-]+-\d+$/.test(base) && /^\d+$/.test(modifier);

    if (isFraction && base.startsWith("aspect-")) {
      findings.push({
        rule: "v4-only-utility",
        token,
        message: `Ratio shorthand "${utility}" only exists in Tailwind 4. Use "aspect-[${base.slice(7)}/${modifier}]".`,
      });
    } else if (FONT_SIZE.test(base)) {
      if (!V3_LINE_HEIGHTS.has(modifier)) {
        findings.push({
          rule: "off-scale-value",
          token,
          message: `Line-height modifier "/${modifier}" is not on the Tailwind 3 scale (3–10 or a named leading).`,
        });
      }
    } else if (!isFraction && /^\d+$/.test(modifier) && !FIVE_STEPS.has(modifier)) {
      findings.push({
        rule: "off-scale-value",
        token,
        message: `Opacity "/${modifier}" is not on the Tailwind 3 scale (steps of 5). Use a step of 5 or "/[.${modifier.padStart(2, "0")}]".`,
      });
    }
  }

  const isV4Only =
    ROUNDED_XS.test(base) ||
    V4_ONLY_UTILITIES.some((prefix) => base === prefix || base.startsWith(`${prefix}-`));

  if (isV4Only) {
    findings.push({
      rule: "v4-only-utility",
      token,
      message: `"${base}" only exists in Tailwind 4.`,
    });
  }

  if (AMBIGUOUS_UTILITIES.has(base) || ROUNDED_SM.test(base)) {
    findings.push({
      rule: "ambiguous-scale",
      token,
      message: `"${base}" compiles to a different value in Tailwind 3 and 4 (the scale was renamed). Use a size both agree on, e.g. "shadow", "shadow-md", "rounded", "ring-1", "ring-2".`,
    });
  }

  const spacing = SPACING_UTILITY.exec(base);
  if (spacing && !V3_SPACING.has(lastNumber(spacing))) {
    findings.push({
      rule: "off-scale-value",
      token,
      message: `"${base}" is not on the Tailwind 3 spacing scale. Use a scale value or an arbitrary value like "[3.25rem]".`,
    });
  }

  for (const [pattern, allowed] of NUMERIC_SCALES) {
    const match = pattern.exec(base);
    if (match && !allowed.has(lastNumber(match))) {
      findings.push({
        rule: "off-scale-value",
        token,
        message: `"${base}" is not on the Tailwind 3 scale. Use one of ${[...allowed].join(", ")} or an arbitrary value.`,
      });
      break;
    }
  }

  return findings;
}

/**
 * Checks one class token. Returns an empty array when the token means the same
 * thing in Tailwind 3.4 and Tailwind 4, or does not look like a class at all.
 */
export function checkClassToken(token: string): TokenFinding[] {
  const parts = splitTopLevel(token, ":");
  const utility = parts.pop() ?? "";
  const findings: TokenFinding[] = [];

  for (const variant of parts) {
    const finding = checkVariant(variant, token);
    if (finding) findings.push(finding);
  }

  if (utility) findings.push(...checkUtility(utility, token));

  return findings;
}
