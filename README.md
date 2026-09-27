<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-white.png" />
    <img src="./.github/assets/logo-black.png" alt="Corsair UI logo: a bearded pirate in a tricorn hat" width="120" />
  </picture>
</p>

# Corsair UI

A UI component library built to be copied, adapted, and owned by whoever uses it — not locked behind an install.

Components live as code you bring into your own project and modify freely. The goal is a broad, well-built catalog that covers what most projects end up rebuilding from scratch: not just basic UI primitives, but forms, data display, navigation, motion, and more creative/visual pieces too.

Early days: the foundation layer (theme, buttons, inputs, form layout, cards and the like), the richer inputs (date pickers, combobox, one-time codes, sliders, number fields), motion, animated text, backgrounds, a chart and embeds are in; dialogs, menus and other overlays come next.

## What lives in this repository

Only the components, hooks and utilities, plus the tooling that keeps them honest. There is no website or demo app here; the documentation site is a separate project that consumes this registry like any other app would.

`registry.json` at the root describes every item. On each merge to `main`, a workflow builds it into JSON and publishes it with GitHub Pages at `https://kevingirelli.github.io/corsair-ui/r/{name}.json`, which is what the `@corsair` namespace points to. There is no server to run or package to publish.

## Using an item

In a project that already has a `components.json` (run `shadcn init` first if it does not; it also sets up the animation utilities overlays use):

```bash
# once per project: add the @corsair namespace to components.json
pnpm dlx shadcn@latest registry add "@corsair=https://kevingirelli.github.io/corsair-ui/r/{name}.json"

# once per project: colours, radius and base styles
pnpm dlx shadcn@latest add @corsair/theme

# then any item; it is copied into your project as source code
pnpm dlx shadcn@latest add @corsair/button @corsair/field

# see everything that is available
pnpm dlx shadcn@latest list @corsair
```

`@corsair/<item>` always serves what is on `main`. To install a release instead, use the item's GitHub address with the tag, e.g. `KevinGirelli/corsair-ui/button#v0.2.0`; the Corsair items it depends on still come from `@corsair`.

Dark mode follows the `dark` class on `<html>`; to brand it, override `--primary`, `--primary-foreground` and `--ring` in your CSS.

Every item is checked against both **Tailwind CSS 3.4** and **Tailwind CSS 4**, so it works whichever one your project uses.

## What is in it

- **Actions:** button, copy-button, dash-button, badge, spinner, bars-spinner
- **Form controls:** label, input, textarea, input-group, checkbox, radio-group, switch, select, color-swatches
- **Richer inputs:** calendar, date-picker (single date and range), combobox, input-otp, slider, number-input, password-input, toggle, toggle-group
- **Overlays:** popover, command, tooltip
- **Text:** text-reveal, blur-text, slide-text, dissolve-text, highlight-text, scramble-text, shimmer-text, wave-text, text-signature
- **Motion:** reveal, magnetic, parallax, marquee
- **Creative:** spotlight, animated-border, signature
- **Backgrounds:** aurora, light-rays, warp-gradient
- **Data and embeds:** line-chart, qr-code, tweet-card, spotify-card (with `getSpotifyTrack` for the server)
- **Form layout:** field (no form library needed), form (react-hook-form)
- **Display:** card, alert, separator, skeleton
- **Foundations:** theme, utils (`cn`), use-media-query, use-in-view, use-entrance

See [CHANGELOG.md](./CHANGELOG.md) for what changed in each release.

## Repository layout

```text
registry.json              entry point read by the shadcn CLI
registry/default/
  theme/                   CSS variables and base styles for Tailwind 3 and 4
  ui/                      components
  hooks/                   React hooks
  lib/                     plain utilities
scripts/                   Tailwind compatibility check and fixture runner
tests/fixtures/            minimal Tailwind 3 and 4 projects items get installed into
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
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add an item and the rules components follow.

## License

[MIT](./LICENSE).
