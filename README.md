<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-white.png" />
    <img src="./.github/assets/logo-black.png" alt="Corsair UI logo: a bearded pirate in a tricorn hat" width="120" />
  </picture>
</p>

<h1 align="center">Corsair UI</h1>

<p align="center">
  <strong>Open-source React components, motion effects and page blocks for shadcn/ui and Tailwind CSS.</strong><br />
  145 accessible items you install as source code with the shadcn CLI, checked against Tailwind CSS 3.4 and 4.
</p>

<p align="center">
  <a href="https://corsairui.vercel.app">Website</a> ·
  <a href="https://corsairui.vercel.app/docs">Docs</a> ·
  <a href="https://corsairui.vercel.app/docs/installation">Installation</a> ·
  <a href="https://corsairui.vercel.app/themes">Themes</a> ·
  <a href="https://corsairui.vercel.app/showcase">Showcase</a> ·
  <a href="./CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <a href="https://github.com/KevinGirelli/corsair-ui/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/KevinGirelli/corsair-ui?label=release" /></a>
  <a href="https://ui.shadcn.com/docs/directory"><img alt="Listed in the shadcn registry directory as @corsair-ui" src="https://img.shields.io/badge/shadcn%20registry-%40corsair--ui-black" /></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/github/license/KevinGirelli/corsair-ui" /></a>
</p>

<p align="center">
  <a href="https://corsairui.vercel.app"><img src="./.github/assets/social-preview.png" alt="Corsair UI: Forge your interface. Copy-and-own React components on a dark sea chart, with a ship and a compass rose." width="720" /></a>
</p>

## Quick start

In a React or Next.js project with a `components.json` (run `pnpm dlx shadcn@latest init` first if it has none):

```bash
# once per project: colours, radius and base styles
pnpm dlx shadcn@latest add @corsair-ui/theme

# then any item, copied into your project as source code
pnpm dlx shadcn@latest add @corsair-ui/button @corsair-ui/split-flap @corsair-ui/scroll-scene
```

No account, package or config: `@corsair-ui` is listed in the [shadcn registry directory](https://ui.shadcn.com/docs/directory), so the CLI finds it. Every item has a page with live examples, its API and accessibility notes at [corsairui.vercel.app/docs](https://corsairui.vercel.app/docs).

## Why Corsair UI

- **The code is yours.** Items land in your project as plain React and Tailwind code, like shadcn/ui: change anything, keep no dependency on this repository.
- **More than primitives.** Alongside the usual inputs, overlays and menus there are animated text, scroll-driven motion, creative effects, backgrounds, charts, device frames and ready-made page blocks.
- **Tailwind CSS 3.4 and 4.** Every item is installed into a Tailwind 3 and a Tailwind 4 project on each change, and a checker flags classes that differ between them.
- **Accessible by default.** Radix primitives for behaviour, strict `eslint-plugin-jsx-a11y`, keyboard support, and axe run on every docs page.
- **Motion with a reason.** Only `transform` and `opacity` animate, scroll effects use CSS scroll-driven animations instead of scroll listeners, loops pause off screen, and `prefers-reduced-motion` is respected everywhere.
- **Themes.** A theme editor and five presets with WCAG AA contrast in light and dark mode.
- **Variations with more motion.** Some components come in an animated take with the same props, like `wave-rating`, whose stars rise in a wave under your finger. Swap one for the other by name.
- **Ready for AI assistants.** `llms.txt`, Markdown docs for every item, and the shadcn MCP server work out of the box.

## What lives in this repository

Only the components, hooks and utilities, plus the tooling that keeps them honest. There is no website or demo app here; the documentation site is a separate project that consumes this registry like any other app would.

`registry.json` at the root describes every item. On each merge to `main`, a workflow builds it into JSON and publishes it with GitHub Pages at `https://kevingirelli.github.io/corsair-ui/r/{name}.json`, which is what the `@corsair-ui` namespace points to. The namespace is listed in the [shadcn registry directory](https://ui.shadcn.com/docs/directory), so the CLI finds it without any setup. There is no server to run or package to publish. The React Native items have their own registry, `registry/native/registry.json`, published next to it at `https://kevingirelli.github.io/corsair-ui/r/native/{name}.json` for the `@corsair-native` namespace.

## Using an item

In a project that already has a `components.json` (run `shadcn init` first if it does not; it also sets up the animation utilities overlays use):

```bash
# once per project: colours, radius and base styles
pnpm dlx shadcn@latest add @corsair-ui/theme

# then any item; it is copied into your project as source code
pnpm dlx shadcn@latest add @corsair-ui/button @corsair-ui/field

# see everything that is available
pnpm dlx shadcn@latest list @corsair-ui
```

`@corsair-ui/<item>` always serves what is on `main`. To install a release instead, use the item's GitHub address with the tag, e.g. `KevinGirelli/corsair-ui/button#v0.2.0`; the Corsair items it depends on still come from `@corsair-ui`.

Dark mode follows the `dark` class on `<html>`; to brand it, override `--primary`, `--primary-foreground` and `--ring` in your CSS. Items are generic on purpose: restyle them in your own project, through the theme variables, `className` and the `data-*` attributes every part exposes. `--radius: 0` gives square corners everywhere, and a page that paints its own background behind the content (a canvas, a fixed layer) can set `body { background: transparent; }` after the theme.

Every item is checked against both **Tailwind CSS 3.4** and **Tailwind CSS 4**, so it works whichever one your project uses.

## What is in it

Every name links to its docs page, with live examples.

- **Actions:** [button](https://corsairui.vercel.app/docs/button), [copy-button](https://corsairui.vercel.app/docs/copy-button), [dash-button](https://corsairui.vercel.app/docs/dash-button), [badge](https://corsairui.vercel.app/docs/badge), [spinner](https://corsairui.vercel.app/docs/spinner), [bars-spinner](https://corsairui.vercel.app/docs/bars-spinner)
- **Form controls:** [label](https://corsairui.vercel.app/docs/label), [input](https://corsairui.vercel.app/docs/input), [textarea](https://corsairui.vercel.app/docs/textarea), [input-group](https://corsairui.vercel.app/docs/input-group), [checkbox](https://corsairui.vercel.app/docs/checkbox), [radio-group](https://corsairui.vercel.app/docs/radio-group), [switch](https://corsairui.vercel.app/docs/switch), [select](https://corsairui.vercel.app/docs/select), [color-swatches](https://corsairui.vercel.app/docs/color-swatches)
- **Richer inputs:** [calendar](https://corsairui.vercel.app/docs/calendar), [date-picker](https://corsairui.vercel.app/docs/date-picker) (single date and range), [combobox](https://corsairui.vercel.app/docs/combobox), [input-otp](https://corsairui.vercel.app/docs/input-otp), [slider](https://corsairui.vercel.app/docs/slider), [number-input](https://corsairui.vercel.app/docs/number-input), [password-input](https://corsairui.vercel.app/docs/password-input), [toggle](https://corsairui.vercel.app/docs/toggle), [toggle-group](https://corsairui.vercel.app/docs/toggle-group), [segmented-control](https://corsairui.vercel.app/docs/segmented-control), [dropzone](https://corsairui.vercel.app/docs/dropzone)
- **Overlays:** [dialog](https://corsairui.vercel.app/docs/dialog), [alert-dialog](https://corsairui.vercel.app/docs/alert-dialog), [sheet](https://corsairui.vercel.app/docs/sheet), [popover](https://corsairui.vercel.app/docs/popover), [hover-card](https://corsairui.vercel.app/docs/hover-card), [command](https://corsairui.vercel.app/docs/command), [tooltip](https://corsairui.vercel.app/docs/tooltip), [toast](https://corsairui.vercel.app/docs/toast)
- **App shell:** [sidebar](https://corsairui.vercel.app/docs/sidebar), [drawer](https://corsairui.vercel.app/docs/drawer), [resizable](https://corsairui.vercel.app/docs/resizable)
- **Menus:** [dropdown-menu](https://corsairui.vercel.app/docs/dropdown-menu), [context-menu](https://corsairui.vercel.app/docs/context-menu), [navigation-menu](https://corsairui.vercel.app/docs/navigation-menu)
- **Navigation:** [site-header](https://corsairui.vercel.app/docs/site-header), [nav-link](https://corsairui.vercel.app/docs/nav-link), [dock](https://corsairui.vercel.app/docs/dock), [tabs](https://corsairui.vercel.app/docs/tabs), [carousel](https://corsairui.vercel.app/docs/carousel), [breadcrumb](https://corsairui.vercel.app/docs/breadcrumb), [pagination](https://corsairui.vercel.app/docs/pagination)
- **Disclosure:** [accordion](https://corsairui.vercel.app/docs/accordion), [collapsible](https://corsairui.vercel.app/docs/collapsible), [scroll-area](https://corsairui.vercel.app/docs/scroll-area)
- **Text:** [text-reveal](https://corsairui.vercel.app/docs/text-reveal), [blur-text](https://corsairui.vercel.app/docs/blur-text), [slide-text](https://corsairui.vercel.app/docs/slide-text), [flip-text](https://corsairui.vercel.app/docs/flip-text), [split-flap](https://corsairui.vercel.app/docs/split-flap), [dissolve-text](https://corsairui.vercel.app/docs/dissolve-text), [highlight-text](https://corsairui.vercel.app/docs/highlight-text), [scramble-text](https://corsairui.vercel.app/docs/scramble-text), [shimmer-text](https://corsairui.vercel.app/docs/shimmer-text), [wave-text](https://corsairui.vercel.app/docs/wave-text), [text-signature](https://corsairui.vercel.app/docs/text-signature), [roll-text](https://corsairui.vercel.app/docs/roll-text), [number-ticker](https://corsairui.vercel.app/docs/number-ticker)
- **Motion:** [reveal](https://corsairui.vercel.app/docs/reveal), [magnetic](https://corsairui.vercel.app/docs/magnetic), [parallax](https://corsairui.vercel.app/docs/parallax), [marquee](https://corsairui.vercel.app/docs/marquee), [preloader](https://corsairui.vercel.app/docs/preloader), [custom-cursor](https://corsairui.vercel.app/docs/custom-cursor), [scroll-progress](https://corsairui.vercel.app/docs/scroll-progress), [scroll-background](https://corsairui.vercel.app/docs/scroll-background), [scroll-scene](https://corsairui.vercel.app/docs/scroll-scene), [tilt-scroll](https://corsairui.vercel.app/docs/tilt-scroll), [wipe-transition](https://corsairui.vercel.app/docs/wipe-transition), [stamp](https://corsairui.vercel.app/docs/stamp), [smooth-scroll](https://corsairui.vercel.app/docs/smooth-scroll)
- **Creative:** [spotlight](https://corsairui.vercel.app/docs/spotlight), [animated-border](https://corsairui.vercel.app/docs/animated-border), [signature](https://corsairui.vercel.app/docs/signature), [path-beam](https://corsairui.vercel.app/docs/path-beam), [flip-card](https://corsairui.vercel.app/docs/flip-card), [hover-reveal](https://corsairui.vercel.app/docs/hover-reveal), [grain](https://corsairui.vercel.app/docs/grain), [corner-frame](https://corsairui.vercel.app/docs/corner-frame), [phone-frame](https://corsairui.vercel.app/docs/phone-frame), [browser-frame](https://corsairui.vercel.app/docs/browser-frame)
- **Backgrounds:** [aurora](https://corsairui.vercel.app/docs/aurora), [light-rays](https://corsairui.vercel.app/docs/light-rays), [warp-gradient](https://corsairui.vercel.app/docs/warp-gradient), [topography](https://corsairui.vercel.app/docs/topography), [particles](https://corsairui.vercel.app/docs/particles)
- **Data and embeds:** [line-chart](https://corsairui.vercel.app/docs/line-chart), [bar-chart](https://corsairui.vercel.app/docs/bar-chart), [area-chart](https://corsairui.vercel.app/docs/area-chart), [donut-chart](https://corsairui.vercel.app/docs/donut-chart), [qr-code](https://corsairui.vercel.app/docs/qr-code), [tweet-card](https://corsairui.vercel.app/docs/tweet-card), [spotify-card](https://corsairui.vercel.app/docs/spotify-card) (with [`getSpotifyTrack`](https://corsairui.vercel.app/docs/spotify-track) for the server), [youtube-embed](https://corsairui.vercel.app/docs/youtube-embed), [code-block](https://corsairui.vercel.app/docs/code-block)
- **Form layout:** [field](https://corsairui.vercel.app/docs/field) (no form library needed), [form](https://corsairui.vercel.app/docs/form) (react-hook-form)
- **Display:** [card](https://corsairui.vercel.app/docs/card), [alert](https://corsairui.vercel.app/docs/alert), [separator](https://corsairui.vercel.app/docs/separator), [skeleton](https://corsairui.vercel.app/docs/skeleton), [avatar](https://corsairui.vercel.app/docs/avatar), [rating](https://corsairui.vercel.app/docs/rating) (and its animated variation [wave-rating](https://corsairui.vercel.app/docs/wave-rating)), [stat](https://corsairui.vercel.app/docs/stat), [progress](https://corsairui.vercel.app/docs/progress), [table](https://corsairui.vercel.app/docs/table), [data-table](https://corsairui.vercel.app/docs/data-table), [timeline](https://corsairui.vercel.app/docs/timeline), [empty-state](https://corsairui.vercel.app/docs/empty-state), [kbd](https://corsairui.vercel.app/docs/kbd), [stepper](https://corsairui.vercel.app/docs/stepper)
- **Blocks:** [hero](https://corsairui.vercel.app/docs/hero), [feature-grid](https://corsairui.vercel.app/docs/feature-grid), [stats](https://corsairui.vercel.app/docs/stats), [logo-cloud](https://corsairui.vercel.app/docs/logo-cloud), [pricing](https://corsairui.vercel.app/docs/pricing), [testimonials](https://corsairui.vercel.app/docs/testimonials), [faq](https://corsairui.vercel.app/docs/faq), [cta](https://corsairui.vercel.app/docs/cta), [contact-form](https://corsairui.vercel.app/docs/contact-form), [newsletter](https://corsairui.vercel.app/docs/newsletter), [site-footer](https://corsairui.vercel.app/docs/site-footer), [login-form](https://corsairui.vercel.app/docs/login-form), [signup-form](https://corsairui.vercel.app/docs/signup-form), [not-found](https://corsairui.vercel.app/docs/not-found), [dashboard](https://corsairui.vercel.app/docs/dashboard), [settings](https://corsairui.vercel.app/docs/settings)
- **Foundations:** [theme](https://corsairui.vercel.app/docs/theme) (plus the presets [theme-blue](https://corsairui.vercel.app/docs/theme-blue), [theme-violet](https://corsairui.vercel.app/docs/theme-violet), [theme-rose](https://corsairui.vercel.app/docs/theme-rose), [theme-emerald](https://corsairui.vercel.app/docs/theme-emerald) and [theme-amber](https://corsairui.vercel.app/docs/theme-amber)), [utils](https://corsairui.vercel.app/docs/utils) (`cn`), [use-media-query](https://corsairui.vercel.app/docs/use-media-query), [use-in-view](https://corsairui.vercel.app/docs/use-in-view), [use-entrance](https://corsairui.vercel.app/docs/use-entrance), [use-scroll-spy](https://corsairui.vercel.app/docs/use-scroll-spy)

See [CHANGELOG.md](./CHANGELOG.md) for what changed in each release.

## Repository layout

```text
registry.json              entry point read by the shadcn CLI
registry/default/
  theme/                   CSS variables and base styles for Tailwind 3 and 4
  ui/                      components
  components/blocks/       page sections built from the components
  hooks/                   React hooks
  lib/                     plain utilities
registry/native/
  registry.json            entry point of the React Native registry
  hooks/ lib/              React Native items (lib/theme.ts holds the tokens)
  package.json             the harness that tests them: Expo SDK 57, Jest, Testing Library
scripts/                   Tailwind compatibility check and fixture runners
tests/fixtures/            minimal Tailwind 3 and 4 projects items get installed into
tests/native-fixtures/     minimal Expo SDK 54 and 57 apps the React Native items get installed into
```

## Development

Requires Node.js 22.18+ and pnpm 9.

```bash
pnpm install
pnpm test               # unit tests
pnpm lint               # ESLint, with strict accessibility rules for registry code
pnpm typecheck
pnpm check:tailwind     # classes must mean the same thing in Tailwind 3 and 4
pnpm registry:validate  # registry.json and every item match the shadcn schema
pnpm registry:build     # the JSON that gets published, in dist/registry/r
pnpm verify:fixtures    # install every item into the fixtures and build them

# React Native
pnpm native:install     # the harness's dependencies (npm, in registry/native)
pnpm native:test        # Jest with jest-expo and React Native Testing Library
pnpm native:typecheck
pnpm registry:native:validate
pnpm registry:native:build   # into dist/registry/r/native
pnpm verify:native      # install every item into Expo SDK 54 and 57 apps, typecheck, bundle for Android and web
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add an item and the rules components follow.

## Support

Corsair UI is free and stays free. If it saves you time, you can [support its development](https://corsairui.vercel.app/sponsor).

## License

[MIT](./LICENSE).
