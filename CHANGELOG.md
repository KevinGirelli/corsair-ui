# Changelog

`@corsair/<item>` serves what is on `main`. Each release is also a git tag; install an item from one with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## 0.4.0

A first set of motion and visual effects, all CSS-first: transforms and opacity only, IntersectionObserver instead of scroll listeners, CSS scroll-driven animations for scroll-linked effects, loops paused off screen, and everything still or finished with `prefers-reduced-motion`. No animation library is needed.

### Added

- `use-in-view`: whether an element is in the viewport, with `once`, `rootMargin`, `amount` and an `onChange` callback.
- Motion:
  - `reveal`: content fades and moves into place when it scrolls into view. `RevealGroup` staggers its children. Server-rendered content stays visible until the browser confirms it is below the fold, so nothing blinks on load and it works without JavaScript.
  - `text-reveal`: text revealed word by word, either when it comes into view or tied to the scroll position with no JavaScript. Screen readers get the sentence in one piece.
  - `magnetic`: content pulled toward the mouse, springing back on leave.
  - `parallax`: content that drifts at its own speed while scrolling past, on CSS scroll-driven animations. It works in server components.
- Creative:
  - `spotlight`: a light that follows the pointer across a surface and along its edge.
  - `animated-border`: a light travelling around a border.
  - `aurora`: slow light drifting behind content.
  - `signature`: SVG strokes drawn as if by hand, on view or with the scroll.
- `tooltip`: a short label on hover and keyboard focus.
- Motion and effects items carry `categories` (`motion`, `creative`) for grouping.

### Tooling

- `verify:fixtures` checks that every keyframe the new items use is compiled in both fixtures.

## 0.3.0

Richer inputs, and the popover and command pieces they are built from. Checked against Tailwind 3.4 and Tailwind 4 like everything else, and all of them work inside `FormField` by mapping `value` / `onValueChange`.

### Added

- `popover`: floating panel with header, title and description parts.
- `command`: searchable list driven by the keyboard, on cmdk. The dialog version comes with `dialog`.
- `calendar`: month grid for a date, several dates or a range, on DayPicker 10 (`@daypicker/react`), with dropdown captions and week numbers. Day and month names follow DayPicker's `locale`.
- `date-picker`: `DatePicker` and `DateRangePicker`, a calendar in a popover behind a button. Picking a date (or the second end of a range) closes it, `formatValue` controls the text, and `name` / `names` submit `yyyy-mm-dd` in a native form.
- `combobox`: a select with a search box; options are data, with optional keywords and disabled entries.
- `input-otp`: one-time code slots with paste and autofill support and a blinking caret (keyframes for both Tailwind versions).
- `slider`: one value or a range, horizontal or vertical, with a name per thumb.
- `number-input`: − and + around a spinbutton that clamps to `min` / `max`, steps exactly with decimals, accepts a comma as the decimal separator and supports Page Up / Page Down, Home and End.
- `password-input`: a pressed toggle that shows what was typed.
- `toggle` and `toggle-group`: pressed buttons, single or multiple, joined or spaced apart.

### Tooling

- `check:tailwind` no longer reads plain JSX prop values such as `variant="outline"` as classes; class attributes (`className`, `containerClassName`…) are still checked.
- `verify:fixtures` also checks that input-otp's caret animation is compiled in both fixtures.

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
