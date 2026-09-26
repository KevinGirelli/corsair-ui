# Changelog

`@corsair/<item>` serves what is on `main`. Each release is also a git tag; install an item from one with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## 0.2.0

The foundation: a theme and the everyday components, all checked against Tailwind 3.4 and Tailwind 4, installed with `shadcn add @corsair/<item>`.

### Added

- `theme`: light and dark colours, radius and base styles, the same tokens as the Figma library. Override `--primary`, `--primary-foreground` and `--ring` for your brand.
- Actions: `button` (six variants, three sizes plus three icon sizes, `asChild`, `loading`), `badge` (solid, secondary and outline, plus success, warning and destructive statuses shown as a coloured dot), `spinner`.
- Form controls: `label`, `input`, `textarea`, `input-group`, `checkbox` (with indeterminate), `radio-group`, `switch`, `select` (the chevron turns up while the list is open). Every clickable control shows a pointer cursor, which Tailwind 4 no longer does for buttons by default.
- Motion, all switched off by `prefers-reduced-motion`: the radio dot grows in and shrinks out and the ring takes the primary colour, the checkbox mark scales in and out, field errors ease in, text controls fade their border between states, and the switch thumb changes colour as it slides.
- Form layout: `field` (field, label, description, error, fieldset, legend, group), independent of any form library, and `form` with a `FormField` for react-hook-form that wires the id, label and ARIA attributes.
- Display: `card`, `alert` (a neutral surface; default, success, warning and destructive tones colour the icon), `separator`, `skeleton`.

### Tooling

- The registry is published to GitHub Pages on every merge to `main`, which is what the `@corsair` namespace points to. Items depend on each other through `@corsair/<item>`.

- `check:tailwind` flags Tailwind 4 theme variables (`var(--spacing)`, `var(--color-*)`…) used inside arbitrary values.
- `verify:fixtures` installs every item through the `@corsair` namespace, pointed at the local build, and checks that utilities built on the theme exist in both fixtures' compiled CSS.

## 0.1.0

- The repository as a shadcn registry installable from GitHub.
- `utils` (`cn`) and `use-media-query`.
- `check:tailwind` and `verify:fixtures`.
