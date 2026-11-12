# OpsPilot AI – Frontend Performance & Optimization (Module 16)

## 1. Bundle Optimization & Build Metrics

The web application is packaged via Vite 6 with Rollup code-splitting:

- **Build Duration**: < 10 seconds.
- **Production Bundle Assets**:
  - HTML (`dist/index.html`): ~0.60 kB (gzip ~0.38 kB)
  - CSS (`dist/assets/index-*.css`): ~83.8 kB (gzip ~13.1 kB)
  - JS (`dist/assets/index-*.js`): ~736 kB (gzip ~186 kB)
- **Zero Heavy Runtime Overheads**:
  - No CSS-in-JS runtime parser (zero Emotion/Styled-Components runtime).
  - Utility CSS pre-compiled by Tailwind CSS with purge heuristics.
  - Native browser CSS custom properties for theming.

---

## 2. Runtime Optimization Strategies

### Selective Query Caching (`TanStack Query`)
- Cached responses have a default `staleTime` of 15 seconds, preventing redundant HTTP round trips when switching tabs or re-focusing fields.
- Deduplication of concurrent identical requests.

### Memory & Event Cleanup
- All event listeners (`mousedown`, `keydown`, `resize`) in `Modal`, `Dropdown`, `Sidebar`, `OrganizationSwitcher`, and `UserProfileMenu` strictly return unbind cleanup functions in React `useEffect`.
- Timer instances for auto-dismissing toasts are tracked and cleaned up on unmount.

### DOM & Paint Optimization
- CSS variable token updates take place on the `:root` (`document.documentElement`), enabling the browser's hardware-accelerated compositor to repaint surfaces without recalculating complex layout trees.
- Sidebar collapses and mobile drawers leverage CSS `transform: translateX` transitions to avoid CPU layout recalculations.
- Responsive images and avatars feature fallback initials to minimize layout shifts (CLS < 0.05).
