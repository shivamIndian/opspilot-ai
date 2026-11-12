# OpsPilot AI – Design System & Reusable UI Component Library (Module 16)

## 1. Design Token Architecture

The design system is constructed on CSS custom properties (tokens) defined in `apps/web/src/styles/tokens.css`. Tokens dynamically adapt to `.dark` class toggles on `document.documentElement`.

### Token Spectrum

| Category | Light Theme Token | Dark Theme Token | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Surfaces** | `#ffffff`, `#f8fafc`, `#f1f5f9` | `#020617`, `#0f172a`, `#1e293b` | Backgrounds, cards, elevated overlays |
| **Borders** | `#e2e8f0`, `#cbd5e1` | `#1e293b`, `#334155` | Subtle dividers, component outlines |
| **Typography**| `#0f172a`, `#475569`, `#94a3b8` | `#f8fafc`, `#94a3b8`, `#64748b` | Headings, body copy, captions |
| **Brand Primary**| `#6366f1` (Indigo 500) | `#818cf8` (Indigo 400) | Interactive accents, focused rings, primary buttons |
| **Success** | `#10b981` (Emerald 500) | `#34d399` (Emerald 400) | Approvals, completed pipeline status, active items |
| **Warning** | `#f59e0b` (Amber 500) | `#fbbf24` (Amber 400) | Medium risk proposals, triage warnings, owner badges |
| **Danger** | `#ef4444` (Rose 500) | `#f87171` (Rose 400) | Rejections, high risk tools, critical errors, destructive actions |

---

## 2. Reusable Component Inventory

All components are authored in TypeScript and exported via `apps/web/src/components/ui/index.ts`.

### 1. Button (`Button.tsx`)
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`.
- **Sizes**: `sm`, `md`, `lg`.
- **States**: `isLoading` (renders spinning indicator, disables interaction), `disabled`, `leftIcon`, `rightIcon`.

### 2. Form Primitives (`Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Checkbox.tsx`)
- Standardized label, helper text, and validation error presentation.
- Accessible ARIA wiring (`aria-invalid`, `aria-describedby`, `id`/`htmlFor`).
- Icon slot support in `Input` (`leftIcon`, `rightIcon`).

### 3. Feedback Components (`Badge.tsx`, `Alert.tsx`, `EmptyState.tsx`, `Skeleton.tsx`)
- **Badge**: Status pills supporting `default`, `primary`, `success`, `warning`, `error`, `info`, `outline`, `neutral`, `danger`.
- **Alert**: Informational, warning, or error banners with optional dismiss button.
- **EmptyState**: Standard zero-state screen with customizable icon, title, description, and action button.
- **Skeleton**: Animated loaders (`rectangular`, `circular`, `text`) for asynchronous views.

### 4. Interactive Overlay Components (`Modal.tsx`, `Dropdown.tsx`, `Tooltip.tsx`, `ConfirmationDialog.tsx`)
- **Modal**: Accessible dialog box with backdrop blur, Escape key dismissal, focus trap, and restore focus.
- **Dropdown**: Click-outside-dismissible popover menu for actions.
- **Tooltip**: Hover and keyboard focus hint positioned `top`, `bottom`, `left`, or `right`.
- **ConfirmationDialog**: Structured confirm/cancel dialog for destructive or high-impact actions.

### 5. Data Display Primitives (`Card.tsx`, `Tabs.tsx`, `Table.tsx`, `Pagination.tsx`)
- **Card**: Composable structure (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
- **Tabs**: Tab bar with active indicators and optional badge counts.
- **Table & Pagination**: Accessible data tables with striped hover states and page controls.
