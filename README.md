<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-white.png" />
    <img src="./.github/assets/logo-black.png" alt="Corsair UI logo: a bearded pirate in a tricorn hat" width="120" />
  </picture>
</p>

# Corsair UI

A UI component library built to be copied, adapted, and owned by whoever uses it — not locked behind an install.

Components live as code you bring into your own project and modify freely. The goal is a broad, well-built catalog that covers what most projects end up rebuilding from scratch: not just basic UI primitives, but forms, data display, navigation, motion, and more creative/visual pieces too.

Early days: the foundation layer (theme, buttons, inputs, form layout, cards and the like), the richer inputs (date pickers, combobox, one-time codes, sliders, number fields), overlays, menus, site chrome, tables, motion, animated text, backgrounds, a chart, embeds and ready-made page blocks are in.

## What lives in this repository

Only the components, hooks and utilities, plus the tooling that keeps them honest. There is no website or demo app here; the documentation site is a separate project that consumes this registry like any other app would.

`registry.json` at the root describes every item. On each merge to `main`, a workflow builds it into JSON and publishes it with GitHub Pages at `https://kevingirelli.github.io/corsair-ui/r/{name}.json`, which is what the `@corsair-ui` namespace points to. The namespace is listed in the [shadcn registry directory](https://ui.shadcn.com/docs/directory), so the CLI finds it without any setup. There is no server to run or package to publish.

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

- **Actions:** button, copy-button, dash-button, badge, spinner, bars-spinner
- **Form controls:** label, input, textarea, input-group, checkbox, radio-group, switch, select, color-swatches
- **Richer inputs:** calendar, date-picker (single date and range), combobox, input-otp, slider, number-input, password-input, toggle, toggle-group, segmented-control, dropzone
- **Overlays:** dialog, alert-dialog, sheet, popover, hover-card, command, tooltip, toast
- **App shell:** sidebar, drawer, resizable
- **Menus:** dropdown-menu, context-menu, navigation-menu
- **Navigation:** site-header, nav-link, dock, tabs, carousel, breadcrumb, pagination
- **Disclosure:** accordion, collapsible, scroll-area
- **Text:** text-reveal, blur-text, slide-text, flip-text, split-flap, dissolve-text, highlight-text, scramble-text, shimmer-text, wave-text, text-signature, roll-text, number-ticker
- **Motion:** reveal, magnetic, parallax, marquee, preloader, custom-cursor, scroll-progress, scroll-background, scroll-scene, tilt-scroll, wipe-transition, stamp, smooth-scroll
- **Creative:** spotlight, animated-border, signature, path-beam, flip-card, hover-reveal, grain, corner-frame, phone-frame, browser-frame
- **Backgrounds:** aurora, light-rays, warp-gradient, topography, particles
- **Data and embeds:** line-chart, bar-chart, area-chart, donut-chart, qr-code, tweet-card, spotify-card (with `getSpotifyTrack` for the server), youtube-embed, code-block
- **Form layout:** field (no form library needed), form (react-hook-form)
- **Display:** card, alert, separator, skeleton, avatar, rating, stat, progress, table, data-table, timeline, empty-state, kbd, stepper
- **Blocks:** hero, feature-grid, stats, logo-cloud, pricing, testimonials, faq, cta, contact-form, newsletter, site-footer, login-form, signup-form, not-found, dashboard, settings
- **Foundations:** theme (plus the presets theme-blue, theme-violet, theme-rose, theme-emerald and theme-amber), utils (`cn`), use-media-query, use-in-view, use-entrance, use-scroll-spy

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
