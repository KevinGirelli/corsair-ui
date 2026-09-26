## Summary

<!-- What changed and why. PRs are squash-merged, so the title becomes the commit on main. -->

## How it was checked

<!-- Commands you ran, projects you installed the item into, screenshots for visual changes. -->

## Checklist

- [ ] `pnpm test`, `pnpm lint` and `pnpm typecheck` pass
- [ ] `pnpm check:tailwind` and `pnpm verify:fixtures` pass (when registry items change)
- [ ] New items stay generic: no product logic, data fetching, fixed copy, locale or currency
- [ ] Keyboard, visible focus and `prefers-reduced-motion` are handled (interactive or animated items)
