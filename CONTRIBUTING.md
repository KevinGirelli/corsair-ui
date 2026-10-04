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
  components/blocks/
    registry.json          page sections (type registry:block)
    pricing.tsx
```

`default` is the style name. It is part of the import path the CLI understands (see below), so keep every item under it.

The React Native items live apart, in their own registry with its own root file (the CLI only accepts a root named `registry.json`, so it sits in the folder):

```text
registry/native/
  registry.json            root of the React Native registry: includes the three below
  package.json             the development harness: Expo SDK 57, Jest, Testing Library (not published)
  lib/registry.json        theme (tokens), haptics
  hooks/registry.json      use-reduced-motion
  ui/registry.json         components, with the same names as their web counterparts
```

It is built into `r/native/` and installed with the `@corsair-native` namespace. See [React Native items](#react-native-items).

## Adding an item

1. Put the source in the folder that matches what it is: `ui/` for primitives and form controls, `components/<area>/` for larger pieces, `hooks/`, or `lib/`.
2. Add the item to that folder's `registry.json`: `name`, `type`, `title`, `description` and `files`. List npm packages in `dependencies` with a version range (`"motion@^12.0.0"`), except the ones most projects already have from `shadcn init`: `lucide-react`, `@radix-ui/*`, `class-variance-authority`, `clsx` and `tailwind-merge` go without a version. The CLI skips a package that is already installed only when it has no version, so a range would upgrade the project's copy (a lucide 0.x project would jump to 1.x) and rewrite its `package.json`; `scripts/registry-deps.test.ts` checks this. List other Corsair items in `registryDependencies` with the namespace (`"@corsair-ui/utils"`); a bare `"utils"` would pull shadcn's item instead. `verify:fixtures` points the namespace at the local build, so new items are tested together before they reach `main`. Motion and visual effects also get `"categories": ["motion"]` or `["creative"]`, which the docs site uses to group them. Blocks are `registry:block` items whose file has type `registry:component`; they install into the consumer's `components/blocks/`, render a complete example with no props, and never import another block.
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
- **Style through tokens.** Use the theme's semantic colours, never hex values, and expose state through `data-*` / `aria-*` attributes so it can be restyled without editing the component. Tints come from opacity modifiers (`hover:bg-primary/90`, `ring-ring/50`), not extra tokens. Components do not list `theme` as a dependency: it is installed once, and re-installing it with every component would overwrite the consumer's brand colours.
- **Same building blocks.** Radix primitives for behaviour, `class-variance-authority` for variants, `lucide-react` for icons, `cn` for class merging, and a `data-slot` attribute on every part.
- **Accessible by default.** Registry code is linted with `eslint-plugin-jsx-a11y` in strict mode. Interactive components need keyboard support and visible focus.
- **Motion is optional.** Anything that animates respects `prefers-reduced-motion`. Put enter and exit animations behind `motion-safe:` (`motion-safe:data-[state=open]:animate-in`): `motion-reduce:animate-none` has lower specificity than a `data-[state=…]:` variant, so it does not stop them. Transitions can keep `motion-reduce:transition-none`. Leave animation durations at the library default, since `duration-*` sets the animation duration in Tailwind 3 but not in Tailwind 4.
- **Motion is cheap.** Animate `transform` and `opacity`. Never listen to `scroll`: use `useInView` (IntersectionObserver) for "when it shows up", and CSS scroll-driven animations for "as it scrolls", gated with `supports-[animation-timeline:view()]:` so other browsers get the finished state. The `animation` shorthand resets `animation-timeline`, so put the timeline and range in `style`, which always wins over the utility. Pointer effects write CSS variables inside `requestAnimationFrame` instead of setting state. Anything that loops pauses while off screen.

## Variations

A component can have animated variations: `wave-rating` is the rating whose stars rise in a wave under a sweeping finger. The base stays lean and still; each variation is a separate item that changes how the component looks and moves, never what it does.

- **Name it after the effect:** `<effect>-<base>`, like `wave-rating`. Do not reuse names from other libraries.
- **Same props as the base.** Its props type extends the base's, so swapping one for the other is a one-word change. Extra props are only about the motion (`showTip`, `haptics`).
- **Same behaviour and accessibility.** Keyboard, screen readers, forms, controlled and uncontrolled, read-only: all as in the base. Reuse the base's parts where you can (`RatingStar`, `ratingVariants`) and list the base in `registryDependencies`.
- **Mark it** with `"meta": { "variantOf": "<base>" }` and `"categories": ["motion"]`. The docs site lists variations on the base's page.
- **Still optional motion.** Reduced motion keeps the variation usable and still, like the base.

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
- **Keyframes:** in `css` for v4 and in `tailwind.config.theme.extend.keyframes` (plus `animation`) for v3. The CLI also writes the `css` block into v3 projects wrapped in `@theme`, which v3 ignores, so the config entry is what makes the animation work there. Both versions only output keyframes that an `animate-*` utility in use refers to, so an item that picks its animation in `style` still needs the utility in its classes.

`pnpm verify:fixtures` installs everything into `tests/fixtures/tailwind-v3` and `tests/fixtures/tailwind-v4`, typechecks the result, compiles the CSS and checks that utilities built on the theme (`bg-primary`, `bg-field`, `focus-visible:ring-ring/50`…) made it into both outputs.

## React Native items

Corsair Native brings the components to React Native apps, built and tested for Expo. An item has the same name, parts, variants and tokens as its web counterpart, so an app and its site speak the same language, but it is written for phones: touch targets, haptics, the platform's accessibility.

```bash
pnpm native:install     # once: the harness in registry/native (npm, Expo SDK 57)
pnpm native:test        # Jest with jest-expo and React Native Testing Library
pnpm native:typecheck   # no DOM types, so a browser API fails here
pnpm registry:native:validate
pnpm verify:native      # install every item into Expo SDK 54 and 57 apps, typecheck, bundle for Android and web
```

To try items on a phone, run the fixtures with `pnpm verify:native --keep` and `npx expo start` inside the copy it leaves, or install them into an Expo app of your own from a local build.

- **Styles from the theme.** `StyleSheet` plus the tokens in `lib/theme.ts` through `useTheme()`; no Tailwind, no hex values in components. Opacity modifiers become `withAlpha(colors.primary, 0.2)`. Variants are maps with the web's names.
- **Imports through `@/registry/native/...`.** The CLI rewrites them to the app's aliases, like on the web. Other items go in `registryDependencies` as `@corsair-native/<item>`; `theme` is safe to list, since the CLI skips files that already exist unless told to overwrite.
- **Dependencies:** packages with native code (`react-native-*`, `expo-*`) are listed without a version, because the app's Expo SDK decides it (`npx expo install`); add an item `docs` line with that command. Plain JavaScript packages get a range. Web building blocks (Radix, lucide-react, cva, Tailwind) never appear. `scripts/registry-deps.test.ts` checks all of this.
- **Expo first, two SDKs.** Every item works on Expo SDK 54 and the newest SDK, the way web items work on Tailwind 3 and 4. Use APIs both have; `verify:native` proves it.
- **Accessible on phones.** Use `role` and `aria-*` (React Native maps them to VoiceOver and TalkBack). Touch targets reach 44 px, with `hitSlop` when the visual is smaller. Values that step (ratings, sliders) are one adjustable control with increment and decrement actions, not a row of buttons. Modals keep screen readers inside and close with the Android back button and the iOS escape gesture. Announce what appears after an action with `AccessibilityInfo`.
- **Motion on the native thread.** Simple motion (fades, springs, loops on `transform` and `opacity`) uses React Native's `Animated` with the native driver, so the item needs nothing else. Gestures and gesture-linked motion use Gesture Handler and Reanimated; run gesture callbacks on the JavaScript thread (`.runOnJS(true)`) unless the frame rate really needs worklets. Every animated item follows `useReducedMotion()`.
- **Haptics are an extra.** `lib/haptics.ts` wraps expo-haptics; base items do not vibrate, variations may, with a prop to turn it off.
- **No DOM.** ESLint rejects `document`, `matchMedia` and friends in `registry/native`, and the harness typechecks without DOM types.
- **The web too.** Expo apps also run in browsers through react-native-web, which lacks a few React Native APIs: `useAnimatedValue` (use `useState(() => new Animated.Value(x))`, which ESLint suggests), `AccessibilityInfo.announceForAccessibilityWithOptions` and `sendAccessibilityEvent` (check that they exist first).

## Licences and releases

Code adapted from another project keeps its license notice in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

Other libraries can inspire an item, but read their licence before you read their code. [React Bits](https://github.com/DavidHDev/react-bits) is MIT with the Commons Clause, which forbids redistributing its components, alone, in a bundle or as a ported version, and a registry is redistribution. Take the idea of an interaction from its demos, then design and write the item without opening its source, and give it a name of its own.

Every merge to `main` that touches the registry is published to GitHub Pages by the "Publish registry" workflow, so `@corsair-ui/<item>` always serves `main`. Releases are git tags (`v0.2.0`) with an entry in [CHANGELOG.md](./CHANGELOG.md); consumers can install a release with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## Pull requests

- Branch off `main` and open a PR. `main` is protected: direct pushes and force pushes are rejected.
- Keep a PR to one item or one change. The template asks what changed, why, and how you checked it.
- CI runs formatting, lint, types, tests, the registry schema, the Tailwind check and the fixtures, then the React Native harness (types, tests, schema) and the Expo fixtures. Every job has to pass before merging. A third workflow, "shadcn latest", runs both sets of fixtures with the newest shadcn CLI every Monday and on PRs that touch the registry, so CLI changes show up here first.
- PRs are squash-merged, so write the PR title as the commit you want on `main`.
- Dependabot opens dependency updates on Mondays; they go through the same checks.
