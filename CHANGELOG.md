# Changelog

`@corsair-ui/<item>` serves what is on `main`. Each release is also a git tag; install an item from one with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## 0.12.0

Application pieces: the shell around an app and the parts dashboards and settings pages are made of. Nothing from earlier releases changes.

### Added

- Shell:
  - `sidebar`: an application sidebar that collapses to icons (with tooltips) or off canvas, becomes a sheet below 768px, and toggles with ⌘B / Ctrl+B. `SidebarProvider`, `useSidebar`, menus with `asChild` links and an active page.
  - `drawer`: a bottom sheet for phones on the Radix dialog, dragged down by its handle or header to close, with a spring back that reduced motion turns off.
  - `resizable`: panels resized by dragging or the arrow keys, on `react-resizable-panels`.
- Data and input:
  - `data-table`: sorting, a text filter, pagination and row selection on TanStack Table v9, rendered with `table`, `pagination` and `checkbox`, with a live region for the selection and row counts.
  - `dropzone`: drop or pick files on a native file input, checked against `accept`, `maxSize` and `maxFiles`, listed with their size and a remove button, and submitted with forms.
- Small parts:
  - `stepper`: the steps of a flow in a named `<nav>`, with `aria-current="step"` and optional buttons to move between steps.
  - `timeline`: events in an ordered list, with a status colour and a `<time>`.
  - `empty-state`: icon, title, description and actions for an empty view.
  - `kbd`: keyboard keys and shortcuts.

## 0.11.0

Theme presets, and a theme editor on the docs site that writes the variables for any other palette.

### Added

- `theme-blue`, `theme-violet`, `theme-rose`, `theme-emerald`, `theme-amber`: the theme with a brand colour on a neutral base (slate, zinc or stone) and a radius, for light and dark mode. Each one installs `theme` first and then sets the colours, so `shadcn add @corsair-ui/theme-blue` is the whole setup. Every text pair (text, muted text on the background and on muted surfaces, primary and destructive buttons, cards) meets WCAG AA in both modes.

### Fixed

- `theme`: light-mode `--muted-foreground` is `#6f6f6f` (was `#737373`), which reaches 4.5:1 on the muted surface too (4.6:1; it was 4.3:1), so inactive tabs and text on muted chips meet AA. On white it goes from 4.7:1 to 5.0:1. Installed themes do not change; update the variable to pick it up.

## 0.10.1

Accessibility fixes found by running axe on every docs page.

### Fixed

- `theme`: in dark mode, `--destructive-foreground` is dark (`#0a0a0a`). White on the dark-mode red (`#ef4444`) was 3.8:1, under the 4.5:1 AA needs for button text; dark text is 5.3:1. The red itself stays, since it has to read as text on the dark background too. Already installed themes do not change; update the variable by hand to pick it up.
- `command`: `CommandSeparator` is `role="none"`. A `separator` inside the listbox broke its structure (a listbox may only hold groups and options). It still hides while searching, unless `alwaysRender`.
- `scroll-area`: the viewport takes keyboard focus, so it can be scrolled with the keys even when nothing inside is focusable.
- `marquee`: with `prefers-reduced-motion` it becomes a box you scroll by hand; it is now also a focusable region named by the new `label` prop (default "Scrolling content"). While it moves it stays out of the tab order. It now depends on `use-media-query`.

## 0.10.0

Fixes from projects that migrated to Corsair UI. Nothing is removed or renamed.

### Changed

- Installing an item no longer upgrades packages the project already has. `lucide-react`, `@radix-ui/*`, `class-variance-authority`, `clsx` and `tailwind-merge` are listed without a version, which is what makes the shadcn CLI skip them when they are installed: a project on lucide-react 0.x stays on it, and its `package.json` is not rewritten with `^` ranges. Projects without them get the current release.
- `separator`: its length is a plain class, so `className="w-8"` (or `h-4` when vertical) replaces the default without `data-[orientation=…]:`.

### Added

- `dialog`, `alert-dialog`, `sheet`: `overlayClassName` on the content, for the overlay's tint, blur or z-index without rebuilding it from the primitives.
- `carousel`: `data-slot="carousel-dot-indicator"` on the visible part of each dot.
- `copy-button`: `data-slot="copy-button-copy-icon"` and `"copy-button-check-icon"` on the icons.
- `rating`: `size="xs"` (12px stars).
- `youtube-embed`: `setVolume(0–100)` on the handle.

### Fixed

- `custom-cursor`: a `data-cursor` on `<html>` or `<body>` (a page-wide label) no longer makes the whole page count as interactive, which kept the ring in its hover state everywhere.

## 0.9.0

The namespace is now `@corsair-ui` (it was `@corsair`), so the registry is not confused with the Corsair peripherals brand, which this project has no relation to. `@corsair-ui` is listed in the shadcn registry directory, so the CLI resolves it with no setup: `shadcn add @corsair-ui/<item>` works in any project with a `components.json`. The registry URL and the items stay the same.

### Changed

- Items depend on each other through `@corsair-ui/<item>`.
- No `registry add` step anymore. Projects set up with `@corsair` install with `@corsair-ui/<item>` from now on; code already installed does not change, and the old `@corsair` entry in `components.json` can be removed.

## 0.8.0

Blocks: whole page sections built from the components, installed into `components/blocks/`. Each one renders a complete example with no props and takes every piece of content (text, lists, links, labels) through props, so it can be filled in and restyled in the project that installs it. Nothing from earlier releases changes.

### Added

- Landing sections:
  - `hero`: eyebrow, the page's `<h1>`, description, actions and an optional media slot, centred or side by side.
  - `feature-grid`: features with an icon, title and description in two to four columns; a feature with `href` becomes a card-sized link.
  - `stats`: key figures on `stat`, counting up with `number-ticker` when they scroll into view.
  - `logo-cloud`: named logos or wordmarks in a grid or a `marquee`.
  - `cta`: a closing band in muted, primary or outline, centred or split.
- Content:
  - `pricing`: plan cards with a featured plan, and a monthly or yearly switch when prices differ per period (controlled or uncontrolled).
  - `testimonials`: quotes as figures with name, role and an avatar or initials, in masonry or a grid.
  - `faq`: questions in an `accordion`, header beside or above them.
- Forms and footer:
  - `contact-form`: name, email and message with native validation; `onSubmit` gets the values and the block reports pending, success and error through `data-status` and live regions.
  - `newsletter`: an inline email sign-up with the same states, through `onSubscribe`.
  - `site-footer`: brand, link columns in one navigation landmark, a bottom line and social icon links.

## 0.7.0

Menus, disclosure and data: the pieces applications need next to the site chrome of 0.6.0. Nothing from earlier releases changes.

### Added

- Menus:
  - `dropdown-menu`: actions and options from a button, with checkbox and radio items, submenus, shortcuts and a destructive variant.
  - `context-menu`: the same menu on right click, long press or the context menu key.
  - `navigation-menu`: site navigation with panels of links in a shared, resizing viewport or under each trigger; `active` marks the current page.
  - `hover-card`: a preview while a link is hovered or focused, for supplementary content only.
- Disclosure:
  - `accordion`: sections that open one at a time or several, with a height animation.
  - `collapsible`: one area that expands and collapses.
  - `scroll-area`: a scroll box with scroll bars in the theme.
- Feedback and data:
  - `progress`: a determinate or indeterminate progress bar.
  - `table`: native table parts, a focusable scroll region with `scrollLabel`, and a sort button whose direction the head announces through `aria-sort`.
- Navigation:
  - `breadcrumb`: the trail to the current page, with `aria-current`, custom separators and an ellipsis.
  - `pagination`: page links with previous and next, `asChild` for router links, and `getPaginationRange` to work out which numbers to show.

## 0.6.0

Overlays, site chrome, media and page effects: what a portfolio or marketing site is usually rebuilt from. Every item is generic and meant to be restyled in the project that installs it, and follows the same rules as before: CSS animations, no animation library, paused off screen, still or finished with `prefers-reduced-motion`.

### Added

- Overlays:
  - `dialog` and `alert-dialog`: modal windows with a trapped focus, Escape and scroll lock; the alert version asks for a decision and does not close on an outside click.
  - `sheet`: a dialog that slides in from any edge, for mobile menus and side panels.
  - `toast`: `toast()` from anywhere and one `Toaster`, announced to screen readers, paused on hover and focus, swipe to dismiss, at most three at a time.
- Navigation:
  - `site-header`: a sticky header with brand, nav, actions and a mobile menu in a sheet. `data-scrolled` tells when the page has left the top, from an observer rather than a scroll listener.
  - `nav-link`: a link that marks the current page with `aria-current`; `asChild` for your router's link.
  - `dock`: a floating bar of icon links with tooltips, shown after a scroll distance and out of the tab order while hidden.
  - `tabs`: pill or underline tabs, horizontal or vertical.
  - `carousel`: slides on a native scroll-snap track, with buttons, dots, keys, loop and a coverflow variant. `useCarouselItem` tells a slide whether it is active, e.g. to play a video only there.
- Display:
  - `avatar` (with a group), `rating` (read-only with fractions, or a star radio group), `stat` (label, value and trend in a description list).
  - `number-ticker`: counts up to a number once in view; the server HTML has the final value.
  - `code-block`: a code sample with a title, language and copy button.
  - `corner-frame`: bracket corners around any box.
- Media: `youtube-embed`, a poster and play button that load the player only when wanted, controlled through `ref` without the IFrame API script; embeds in a `group` pause each other.
- Page effects:
  - `preloader`: a first-load screen with progress, a `ready` gate and an exit, as an accessible progress bar.
  - `custom-cursor`: a dot and ring following fine pointers, with hover states and labels from `data-cursor`; the native cursor comes back on touch and with reduced motion.
  - `scroll-progress`: a reading progress bar on a CSS scroll timeline, with no JavaScript.
  - `smooth-scroll`: smooth wheel scrolling with Lenis, off with reduced motion, and a `scrollTo` that works with or without it.
- Surfaces: `grain` (film grain, server-safe), `hover-reveal` (a second layer under a pointer-following circle), `particles` (seeded drifting dots), `topography` (animated contour lines from one WebGL2 shader).
- Text: `roll-text`, characters rolling to a copy of themselves on hover and focus.

### Changed

- `signature`: `trigger="manual"` follows a `progress` value from 0 to 1, for drawings driven by your own timeline. With `ink` and `strokeWidth={0}` only the fill is drawn.
- `highlight-text`: `variant="scribble"` draws a hand-drawn underline (single or double) instead of the marker.
- `theme`: the smaller radii never go below 0, so `--radius: 0` gives square corners without invalid values.

## 0.5.0

Animated text, backgrounds, a chart and embeds. They follow the same rules as 0.4.0: CSS animations, no animation library, paused off screen, and still or finished with `prefers-reduced-motion`.

### Added

- `use-entrance`: decides when a one-shot entrance plays, on first paint (`trigger="load"`, CSS only) or once in view, without hiding server-rendered content that is already on screen. A `play` prop takes manual control.
- Text:
  - `blur-text`: characters come into focus one at a time, and blur back out with `show={false}`.
  - `slide-text`: words, characters or lines rise from below their baseline, from the first, the last or the centre.
  - `dissolve-text`: words or characters surface at scattered moments, seeded by the text so the server and the browser agree.
  - `highlight-text`: a marker slides in behind a phrase and inverts the text where it passes.
  - `scramble-text`: noise sweeps across, then the real characters lock in. The text is in the server HTML.
  - `shimmer-text`: a band of light sweeps across text now and then.
  - `wave-text`: bands of colour wash through text, on one CSS animation of a registered custom property.
  - `text-signature`: writes any text in any TTF, OTF or WOFF font as a signature, with opentype.js loaded on demand.
- `marquee`: a seamless loop that stops while a link inside has focus, with the copies hidden from screen readers.
- Backgrounds:
  - `light-rays`: soft beams from above, from a small WebGL2 shader, with a CSS fallback.
  - `warp-gradient`: a liquid field of two to five colours over bands, cells or a divide, carried along by layered noise, with presets and optional grain.
- Actions and controls:
  - `copy-button`: copies a value, swaps to a check mark and announces it; never claims success when the clipboard refused.
  - `dash-button`: a pill button whose fill gives way to a marching dashed outline.
  - `color-swatches`: one colour from a row of swatches, as a radio group with arrow keys and form support.
  - `bars-spinner`: twelve bars around a hub, with no JavaScript.
- Data and embeds:
  - `line-chart`: one series with a cursor that snaps to points, smooth or straight. Keyboards and screen readers use it as a slider over the points.
  - `qr-code`: an SVG QR code in dots, rounded or square modules, rendered on the server.
  - `tweet-card`: a post from X drawn with the theme, no embed script. `Tweet` fetches by id in a server component, `ClientTweet` in the browser.
  - `spotify-card`: a track card that plays the preview clip, and `spotify-track` (`getSpotifyTrack`) to read the track on the server.

### Changed

- `signature`: `ink` fills closed shapes in behind the pen, for lettering.
- `text-reveal` also belongs to the `text` category, and `aurora` to `background`, so they group with the new items.

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
