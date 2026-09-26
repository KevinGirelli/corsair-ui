# Corsair UI

A UI component library built to be copied, adapted, and owned by whoever uses it — not locked behind an install.

Components live as code you bring into your own project and modify freely, in the spirit of libraries like shadcn/ui. The goal is a broad, well-built catalog that covers what most projects end up rebuilding from scratch: not just basic UI primitives, but forms, data display, navigation, motion, and more creative/visual pieces too.

Early days — starting with a solid foundation layer (buttons, inputs, cards, and the like) before growing from there.

## What lives in this repository

Only the components, hooks and utilities, plus the tooling that keeps them honest. There is no website or demo app here; the documentation site is a separate project that consumes this registry like any other app would.

The repository itself is the registry: `registry.json` at the root is read by the [shadcn CLI](https://ui.shadcn.com/docs/registry/github) straight from GitHub, so there is no server to run or package to publish.

## Using an item

In a project that already has a `components.json` (run `shadcn init` first if it does not):

```bash
# see what is available
pnpm dlx shadcn@latest list KevinGirelli/corsair-ui

# install an item; it is copied into your project as source code
pnpm dlx shadcn@latest add KevinGirelli/corsair-ui/use-media-query
```

Append `#<tag-or-commit>` to an address to pin it, e.g. `KevinGirelli/corsair-ui/use-media-query#v0.1.0`.

Every item is checked against both **Tailwind CSS 3.4** and **Tailwind CSS 4**, so it works whichever one your project uses.

## Repository layout

```text
registry.json              entry point read by the shadcn CLI
registry/default/
  ui/                      primitives and form controls (planned)
  components/              larger pieces grouped by area: motion, media, … (planned)
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
pnpm verify:fixtures    # install every item into the fixtures and build them
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add an item and the rules components follow.

## License

[MIT](./LICENSE)
