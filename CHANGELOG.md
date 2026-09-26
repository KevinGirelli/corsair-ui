# Changelog

Each release is a git tag. Pin an item to one with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## 0.2.0

The foundation: a theme and the everyday components, all checked against Tailwind 3.4 and Tailwind 4.

### Added

- `theme`: light and dark colours, radius and base styles, the same tokens as the Figma library. Override `--primary`, `--primary-foreground` and `--ring` for your brand.
- Actions: `button` (six variants, three sizes plus three icon sizes, `asChild`, `loading`), `badge` (six tones, `BadgeDot`), `spinner`.
- Form controls: `label`, `input`, `textarea`, `input-group`, `checkbox` (with indeterminate), `radio-group`, `switch`, `select`.
- Form layout: `field` (field, label, description, error, fieldset, legend, group), independent of any form library, and `form` with a `FormField` for react-hook-form that wires the id, label and ARIA attributes.
- Display: `card`, `alert` (default, destructive, success, warning), `separator`, `skeleton`.

### Tooling

- `check:tailwind` flags Tailwind 4 theme variables (`var(--spacing)`, `var(--color-*)`…) used inside arbitrary values.
- `verify:fixtures` resolves items' dependencies on each other from the local build, and checks that utilities built on the theme exist in both fixtures' compiled CSS.

## 0.1.0

- The repository as a shadcn registry installable from GitHub.
- `utils` (`cn`) and `use-media-query`.
- `check:tailwind` and `verify:fixtures`.
