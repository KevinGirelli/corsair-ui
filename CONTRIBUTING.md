# Contributing

Thanks for helping out. This guide covers how the registry is organised, how to add an item, and the rules every item follows so it can be dropped into any project. By taking part you agree to the [code of conduct](./CODE_OF_CONDUCT.md); security issues go through [SECURITY.md](./SECURITY.md), not public issues.

## Setup

- Node.js 22.18 or newer (the scripts run TypeScript directly through Node's type stripping)
- pnpm 9

```bash
pnpm install
pnpm test
```

## How the registry is organised

`registry.json` at the root is what the shadcn CLI reads. It does not list items itself; it `include`s one `registry.json` per folder, so an item's definition sits next to its source:

```text
registry/default/
  theme/
    registry.json          the theme item: CSS variables for Tailwind 3 and 4
  ui/
    registry.json          items in this folder
    button.tsx
    button.test.tsx
  hooks/
    registry.json
    use-media-query.ts
  lib/
    registry.json
    utils.ts
```

`default` is the style name. It is part of the import path the CLI understands (see below), so keep every item under it.

## Adding an item

1. Put the source in the folder that matches what it is: `ui/` for primitives and form controls, `components/<area>/` for larger pieces, `hooks/`, or `lib/`.
2. Add the item to that folder's `registry.json`: `name`, `type`, `title`, `description` and `files`. List npm packages in `dependencies` with a version range (`"motion@^12.0.0"`) and other Corsair items in `registryDependencies` by their full address (`"KevinGirelli/corsair-ui/utils"`); a bare `"utils"` would pull shadcn's item instead. `verify:fixtures` points these addresses at the local build, so new items are tested together before they reach `main`.
3. Write tests next to the source (`*.test.ts` / `*.test.tsx`). They are never shipped: only the paths listed in `files` are.
4. Run `pnpm registry:validate`, `pnpm check:tailwind` and `pnpm verify:fixtures` before opening the PR.

### Imports

Import other registry files through `@/registry/default/...`:

```ts
import { cn } from "@/registry/default/lib/utils";
import { useMediaQuery } from "@/registry/default/hooks/use-media-query";
```

On install, the CLI rewrites these to the aliases in the consumer's `components.json` (`@/lib/utils`, `@/hooks/use-media-query`, …). A relative import or any other alias would break in their project.

## Rules for components

Corsair items are generic building blocks. Anything specific to one product stays in that product.

- **Controlled and uncontrolled.** Accept `value` / `defaultValue` / `onValueChange` (or the equivalent) and pass the remaining native props and the `ref` through to the real element.
- **No form library inside controls.** Signal invalid state with `aria-invalid`. Integration with a form library ships as its own item.
- **Composition over configuration.** Prefer `Field` + `Label` + `Control` + `Message` parts to one component with a dozen props.
- **No business logic.** No data fetching, SDK calls, hard-coded locale, currency or time zone, and no copy the consumer cannot change. User-facing strings come from props with English defaults.
- **Style through tokens.** Use the theme's semantic colours, never hex values, and expose state through `data-*` / `aria-*` attributes so it can be restyled without editing the component. Tints come from opacity modifiers (`bg-destructive/15`, `ring-ring/50`), not extra tokens. Components do not list `theme` as a dependency: it is installed once, and re-installing it with every component would overwrite the consumer's brand colours.
- **Same building blocks.** Radix primitives for behaviour, `class-variance-authority` for variants, `lucide-react` for icons, `cn` for class merging, and a `data-slot` attribute on every part.
- **Accessible by default.** Registry code is linted with `eslint-plugin-jsx-a11y` in strict mode. Interactive components need keyboard support and visible focus.
- **Motion is optional.** Anything that animates respects `prefers-reduced-motion`.

## Tailwind 3 and 4

Every item has to render the same in a Tailwind 3.4 project and a Tailwind 4 project, and neither compiler warns about a class it does not know. `pnpm check:tailwind` fills that gap. It flags:

- variants that only exist in v4: `data-open:`, `aria-invalid:`, `not-*:`, `in-*:`, `nth-*:`, `starting:`, `@md:` … Use the bracket forms (`data-[state=open]:`, `aria-[invalid=true]:`) or an arbitrary variant.
- utilities that only exist in v4: `bg-linear-*`, `field-sizing-*`, `mask-*`, `shadow-xs`, `outline-hidden` …
- CSS variable shorthands: `bg-(--x)` is v4-only and `bg-[--x]` is v3-only. `bg-[var(--x)]` works in both.
- names whose value changed between versions: `shadow-sm`, `blur-sm`, `drop-shadow-sm`, `backdrop-blur-sm`, `rounded-sm`, bare `ring` and bare `outline`.
- numbers outside the v3 scales, which v4 accepts but v3 silently drops: `p-13`, `z-60`, `duration-250`, `bg-black/8` …
- Tailwind 4 theme variables inside arbitrary values: `var(--spacing)`, `var(--color-*)`, `var(--radius-*)`, `--spacing(4)`. They do not exist in a v3 project; use a literal (`grid-cols-[1rem_1fr]`) or a variable the theme declares (`var(--radius)`).

If a flagged class is intentional, put `// tailwind-compat-ignore-next-line` on the line above it and explain why in the PR.

### Theme values, animations and CSS

When an item needs CSS variables or keyframes, declare them for both versions in its registry entry:

- **Colours:** full colour values (hex, `rgb()` or `oklch()`) in `cssVars.light` / `cssVars.dark`, mapped for v4 in `cssVars.theme` (`"color-brand": "var(--brand)"`) and for v3 in `tailwind.config` as `"color-mix(in oklab, var(--brand) calc(<alpha-value> * 100%), transparent)"`, which keeps opacity modifiers like `bg-brand/50` working. The `theme` item is the reference for this.
- **Keyframes:** in `css` for v4 and in `tailwind.config.theme.extend.keyframes` (plus `animation`) for v3. The CLI also writes the `css` block into v3 projects wrapped in `@theme`, which v3 ignores, so the config entry is what makes the animation work there.

`pnpm verify:fixtures` installs everything into `tests/fixtures/tailwind-v3` and `tests/fixtures/tailwind-v4`, typechecks the result, compiles the CSS and checks that utilities built on the theme (`bg-primary`, `bg-field`, `focus-visible:ring-ring/50`…) made it into both outputs.

## Credits and releases

Many components follow the structure and API of [shadcn/ui](https://ui.shadcn.com) (MIT); see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Code adapted from another project keeps its license notice there.

Releases are git tags (`v0.2.0`) with an entry in [CHANGELOG.md](./CHANGELOG.md). Consumers pin an item to a release with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## Pull requests

- Branch off `main` and open a PR. `main` is protected: direct pushes and force pushes are rejected.
- Keep a PR to one item or one change. The template asks what changed, why, and how you checked it.
- CI runs formatting, lint, types, tests, the registry schema, the Tailwind check and the fixtures. Both jobs have to pass before merging.
- PRs are squash-merged, so write the PR title as the commit you want on `main`.
- Dependabot opens dependency updates on Mondays; they go through the same checks.
