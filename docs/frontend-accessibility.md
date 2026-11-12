# OpsPilot AI – Frontend Accessibility & Usability (Module 16)

## 1. Compliance Standard

OpsPilot AI targets **WCAG 2.1 Level AA** compliance across all UI components and page layouts.

---

## 2. Accessibility Implementations

### Keyboard Navigation & Focus Management
- **Focus Rings**: Standardized high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2`).
- **Modal Focus Trap**: `Modal.tsx` locks focus within the dialog while open, intercepts `Tab` navigation at boundaries, listens to `Escape` for dismissal, and restores focus to the invoking trigger on close.
- **Dropdown Keyboard Controls**: Allows `ArrowUp`, `ArrowDown`, `Enter`, `Escape` navigation for option selection.
- **Skip Links & Nav Landmarks**: All primary regions feature distinct semantic tags (`<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>`) with explicit `aria-label` attributes (e.g. `aria-label="Desktop Navigation"`).

### Color Contrast & Themes
- All text styles in both light and dark themes maintain a minimum contrast ratio of **4.5:1** for standard body text and **3.0:1** for large text and interactive icons against their respective background surfaces.
- High-contrast alert tokens (`tokens.css`) ensure readability for colorblind users by augmenting color changes with distinct icons (`AlertTriangle`, `CheckCircle2`, `AlertCircle`, `Info`).

### ARIA Attributes & Live Regions
- **Alerts**: Rendered with `role="alert"` for assertive screen reader announcement.
- **Toast Notifications**: Managed through a live container with `role="status"` and `aria-live="polite"`.
- **Form Fields**: Accessible association using `id`, `htmlFor`, `aria-describedby` linking helper and error text, and `aria-invalid="true"` when validation fails.
- **Navigation Breadcrumbs**: Marked with `aria-label="Breadcrumb"` and `aria-current="page"` on active items.
- **Interactive Disclosures**: Collapsible sidebar and menus use `aria-expanded` and `aria-haspopup`.
