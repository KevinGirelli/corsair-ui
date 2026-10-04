# Changelog

`@corsair-ui/<item>` serves what is on `main`. Each release is also a git tag; install an item from one with `KevinGirelli/corsair-ui/<item>#v0.2.0`.

## Unreleased

Corsair goes to phones: a React Native registry with the components an app needs every day, and the first animated variation of a component, on both platforms. Nothing from earlier releases changes unless you opt in.

### Added

- Corsair Native, a second registry for React Native apps, installed with the shadcn CLI as `@corsair-native/<item>` from `https://kevingirelli.github.io/corsair-ui/r/native/{name}.json`. Items have the names, parts, variants and colours of their web counterparts, are styled with `StyleSheet` and theme tokens (no Tailwind), and are installed into Expo SDK 54 and 57 apps, typechecked and bundled for Android and the web on every change. Packages with native code are listed without a version, so `npx expo install` picks the one your SDK expects. Each item:
  - `theme`: the web theme's colours for light and dark mode, radii from one value, type sizes, font families per weight (custom fonts in React Native ignore `fontWeight`), shadows as `boxShadow` and springs for Animated and Reanimated. `useTheme()` follows the device, `ThemeProvider` forces a scheme, and `withAlpha()` stands in for opacity modifiers.
  - `haptics`: `haptic("selection" | "light" | "success" …)` on expo-haptics, fire-and-forget and silent on the web, with `setHapticsEnabled()` for an app-wide setting.
  - `use-reduced-motion`: the device's Reduce Motion setting, followed live.
  - `text` (headings announced as such; containers pass their label colour to it), `button` (every web variant including `raised`, sizes with a 44 px touch area, `loading`), `badge`, `card`, `separator`, `avatar` (with `AvatarGroup`), `alert`, `input`, `empty-state` and `spinner`.
  - `skeleton`, `progress`, `switch`, `checkbox` and `segmented-control`, animated on the native thread and still with Reduce Motion.
  - `rating`: tapped, or adjusted by screen readers as one control, the way iOS and Android expect; read-only with fractional fills.
  - `toast`: `toast()` from anywhere and a `Toaster` at the top or bottom edge, clear of the safe area; three at a time, announced once, paused while touched or in the background, swiped away.
  - `drawer`: a bottom sheet in a Modal that springs up, follows a drag down to close, rises above the iOS keyboard, keeps screen readers inside, and closes with the back button, the escape gesture or the overlay.
  - Every item also runs in Expo's web target, on react-native-web; the toasts become a live region there.
- A gallery app with a screen for every React Native item: `npx expo start` in `registry/native` to try them on a phone. Its web build is published at `https://kevingirelli.github.io/corsair-ui/native-preview/`, where the docs site embeds one item at a time with `?item=<name>`.
- Variations: animated takes on a component with the same props, marked with `meta.variantOf` in the registry. The first is `wave-rating`, for the web and React Native: sweeping a finger (or a pen or mouse) across the stars lifts them in a wave that crests under it, a tip shows the score, and letting go pops the chosen star; on phones each star ticks with a haptic. It keeps the rating's radio group (web) or adjustable control (React Native), its form support and its read-only image, and holds still with reduced motion.

### Changed

- `rating`: a pen hovering over the stars previews them, like a mouse. The star is exported as `RatingStar` for the variations to reuse.

## 0.17.0

The finishing touches of a product page: a band that sweeps the page from one side to the other, a stamp that slams down, a button that sinks like a key and a QR code that draws itself. Everything new is opt in; nothing from earlier releases changes.

### Added

- `wipe-transition`: switches content behind a band that sweeps across it, for "for players / for venues" pages, tabs, languages or themes. When `transitionKey` changes, the cover travels in (`direction`), the old children stay until it covers them, the new ones render underneath, `onCovered` runs (a good moment to scroll to the top), and the cover travels out; `onComplete` follows. `cover`, `duration`, `easing`, `fixed` to cover the viewport for whole pages, and `mode="fade"` for a crossfade on phones. Web Animations API on `transform` and `opacity` only; keys that change mid-run are queued so it always ends on the latest. The root is `aria-busy` while it runs, and focus that was inside the old content moves to the content wrapper instead of dropping to the page. Reduced motion always crossfades, over `reducedDuration` (150 ms).
- `stamp`: a rubber stamp ("Sold out", "Paid") that slams onto the page, starting large and transparent and landing rotated with a small overshoot. `rotate`, `from`, `trigger` (`load` / `in-view`), `once`, `play`, `delay`, `duration`, `onAnimationComplete`, `as`. Content stays readable; server HTML and reduced motion show the stamp already in place.
- `button`: `variant="raised"`, opt in: the face stands on a 4 px base, darker than it, and sinks into it while pressed, like a key. The base is a pseudo-element, so only the face's transform moves, and the button keeps 4 px of margin below for it. Works with `asChild` and every size; the other variants do not change.
- `qr-code`: `reveal` ("load" or "in-view") lets the code draw itself from the centre outwards, through a growing circular mask over the dark modules only, so the background and quiet zone never move; `revealDuration` sets the time (800 ms). It only animates transform, server HTML and reduced motion show the complete, scannable code, and without `reveal` the markup is unchanged and stays server-only (the reveal lives in a small client part, `qr-code-reveal.tsx`).

## 0.16.0

Scrollytelling and the motion a product page shows its product with: a stage pinned beside steps, a screenshot that straightens as you scroll, a beam travelling through a flow, and cards that turn over. Nothing from earlier releases changes.

### Added

- `scroll-scene`: scrollytelling for landing pages. A stage stays pinned beside steps of text and crossfades (with a short rise) to the slide of the step crossing the middle of the viewport, picked by one IntersectionObserver through `use-scroll-spy`. `ScrollScene`, `ScrollSceneStage`, `ScrollSceneSlide`, `ScrollSceneSteps`, `ScrollSceneStep` and `useScrollScene()`; `step` / `defaultStep` / `onStepChange`, `pinFrom` (`sm` to `xl`, or `false` to always pin), `stageSide`, `stickyTop`, `stageHeight`, `rootMargin`, `distance`, `duration`, `easing`. Below `pinFrom` it becomes a plain sequence with each slide after its step, switched by CSS alone so the server HTML matches every screen. `--scroll-scene-progress` runs 0 to 1 across the scene on a CSS scroll timeline (`progressRange`) for scrubbed effects, and rests at 1 without scroll timelines. Inactive slides are `inert` and hidden from screen readers; with reduced motion slides swap with a short fade and the progress stays at 1.
- `tilt-scroll`: the "container scroll" hero, where a screenshot or dashboard starts tilted back in perspective and slightly smaller and straightens as you scroll. `angle`, `scale`, `perspective`, `timeline` (`view` for the element crossing the viewport, `root` for the page scroll from the top, for a hero in view at load), `range`, `flatBelow` (`sm`, `md` or `lg`, flat below that breakpoint by CSS alone) and `asChild`. CSS scroll-driven animation with no JavaScript and no scroll listener, so it works in server components; browsers without scroll timelines and reduced motion show it flat.
- `path-beam`: a beam of light that travels along the SVG paths of a flow diagram, one after another, over a faint track. `paths`, `beamLength`, `strokeWidth`, `glow` (a wider, fainter copy of the dash, no filters), `track`, `trackClassName` and `beamClassName`; `trigger` plays it once in view (`duration`, `delay`, `stagger`, `loop`, `once`), with the scroll on a CSS view timeline (`range`), or from your own `progress`. The svg and each path's group expose `data-state` (`idle`, `running`, `done`) to light up the nodes, with `onPathComplete` and `onComplete`; loops pause off screen. The svg is decorative and hidden from screen readers; with reduced motion the track shows without a beam and in-view diagrams are done at once.
- `flip-card`: a card with two faces that turns over in 3D, for stickers that flip on hover, a weekly grid whose cells turn one after another, or bento tiles. `FlipCard`, `FlipCardFront`, `FlipCardBack` and a `FlipCardTrigger` button (`asChild`, `aria-pressed`); `flipped` / `defaultFlipped` / `onFlippedChange`, `trigger` ("hover", "click", "manual"), `axis`, `duration`, `perspective` and `easing`. Both faces share one grid cell, so the card takes the size of the larger one without jumping. Hover mode is CSS alone, follows focus inside the card for the keyboard, and toggles on tap where there is no hover; in click and manual modes the face turned away is `inert` and hidden from screen readers, and focus moves to the face that turned up. Reduced motion crossfades the faces instead of turning them.

## 0.15.0

The pieces a product landing page repeats: a nav that follows the reader, a switch with a sliding thumb, a board whose characters flip, and frames for phone and browser screenshots. Nothing from earlier releases changes unless you opt in.

### Added

- `use-scroll-spy`: the id of the section on screen, for a table of contents or a page nav that follows the reader. One IntersectionObserver watches every id (no scroll listeners), and an inline array of the same ids does not rebuild it. `rootMargin` sets the line that decides the active section (the middle of the viewport by default), and `defaultValue` is the answer on the server and until a section is reached; between two sections it keeps the last one. `root` watches the sections inside a scroll box instead of the viewport. Server HTML and hydration agree, and browsers without IntersectionObserver keep `defaultValue` or the first id.
- `segmented-control`: a switch between two or more options ("For players | For venues") with one thumb that slides to the active item, on the Radix toggle group: one Tab stop, arrow keys between items, and it never goes empty when the active item is pressed again. `value` / `defaultValue` / `onValueChange`, `size`, `thumbClassName`, and `duration` and `easing` for the slide. The thumb moves by transform only (FLIP) and jumps when the control or a label resizes; until it is measured the active item paints the pill itself, so server HTML shows no flash or layout shift. Reduced motion makes the thumb jump.
- `split-flap`: a split-flap board, like the departure boards in stations and airports. When `value` changes, only the characters that changed flip: the top half of the old one falls away and the bottom half of the new one drops into place, cell after cell (`stagger`, `from`), optionally stepping through a `cycle` of characters on the way. `length` and `pad` reserve a fixed number of `1ch` cells so nothing around it moves, and `cellClassName` turns the cells into tiles. The server HTML already shows the value, the first render never flips, and changes swap in place while off screen or with reduced motion. Screen readers get the value in one piece, announced with `live="polite"`.
- `phone-frame`: a generic phone drawn in CSS around a screenshot or any content, with no brand. Set the width with a class and the bezel, corners and cut-out scale with it (container units); `aspect` (default `9 / 19.5`) reserves the box at first paint. `notch` (`island`, `notch` or `none`), `bezel`, `radius`, `buttons` and `screenClassName`. The body, cut-out and side buttons are hidden from screen readers while the content keeps its own semantics. A server component with no motion, so it sits inside parallax, magnetic or tilt wrappers.
- `browser-frame`: a browser window drawn in CSS around a page or a screenshot: window dots, an address field showing `url` as text, optional `actions` at the right and a viewport for the children. `aspect` reserves the window's box and lets the viewport fill what the bar leaves; without it the content sets the height. The dots are hidden from screen readers, the address too unless `announceUrl` is set, and the bar is hidden as a whole only when it has no `actions`. A server component with no motion.
- `scroll-background`: `stops` sets where each colour is reached, in percent of the timeline (`[0, 5, 14, 65, 100]`), instead of spreading them evenly. Stops are clamped to 0–100 and kept in order, and a list that does not match the colours falls back to even spacing. A colour can come back later in the list, and the docs show it fixed behind a whole page.
- `custom-cursor`: `children` are drawn with the cursor, such as crosshair lines across the window. The root sets `--cursor-x` and `--cursor-y` to the pointer's position on every move, so they can follow it with CSS alone.
- `marquee`: `paused` holds the loop still from outside, for example while a dialog opened from it is up, and it carries on from the same place afterwards. The root has `data-paused` meanwhile.

## 0.14.0

Three creative pieces: a marquee you can grab, type that turns in 3D, and a background that changes colour with the scroll. Nothing from earlier releases changes unless you opt in.

### Added

- `flip-text`: kinetic type in 3D. Characters or words turn into place around their horizontal axis, one after another, each with its own perspective, rolling like a drum, standing up from the baseline or dropping from the top. `angle`, `perspective`, `origin`, `from` and the same `trigger`, `play` and timing props as `slide-text`. Screen readers get the text in one piece, and reduced motion shows it as is.
- `scroll-background`: a background that blends from one colour to the next as you scroll, on the element crossing the viewport (`view`), the page (`root`) or the nearest scroller. Each colour is a layer that fades in over its own stretch of a CSS scroll timeline, so there is no JavaScript and no scroll listener, and it works in server components. Browsers without scroll timelines keep the first colour.
- `marquee`: `draggable` lets the pointer grab the loop and drag it either way, and it carries on from where it is let go. The drag seeks the same CSS animation, so the loop stays seamless, hover and focus still pause it, and there are no scroll listeners. A press that moves less than 5 px is still a click, so links inside keep working, and the click that ends a drag is swallowed. Touch pans across the loop drag it; the page still scrolls the other way. With reduced motion the marquee stays a scroll box and the option does nothing.

## 0.13.0

Charts beyond the line, and the application pages built from 0.12.0. Nothing from earlier releases changes.

### Added

- Charts, hand-written SVG like `line-chart`, each a keyboard slider (or, for the donut, a legend of toggle buttons) that screen readers hear value by value, animating in once in view and still with reduced motion:
  - `bar-chart`: vertical or horizontal bars, negative values below a zero line, rounded ends and optional values on the bars.
  - `area-chart`: one or more series, overlapping or stacked, with gradient fills and a legend.
  - `donut-chart`: parts of a whole with a legend of values and shares; the total, or the highlighted part, in the hole.
  - Default colours follow the theme: the primary colour, then lighter mixes of it with the background.
- Blocks:
  - `login-form` and `signup-form`: sign-in and sign-up cards with native validation, password reveal, optional providers and the same `onSubmit` status pattern as `contact-form`.
  - `not-found`: a 404 section with a decorative code, a real `<h1>` and actions.
  - `dashboard`: an application page on `sidebar`, with stat cards, a `line-chart` card and a `data-table` card.
  - `settings`: profile, password with a delete-account dialog, and notification switches in tabs that stand vertically from 768px.

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
