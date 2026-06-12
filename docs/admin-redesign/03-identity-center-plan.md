# Identity Center Plan — Admin & Dashboard Redesign Phase 1

> Generated: June 2026 | Scope: Design tokens, ThemeApplier, Identity Center UI, anti-patterns, migration

---

## 1. Current State

### 1.1 Token Layers (bottom to top)

```
┌─────────────────────────────────────────┐
│  Layer 4: Runtime DB Overrides          │  ← admin_identity_tokens table
│  (highest priority)                     │
├─────────────────────────────────────────┤
│  Layer 3: platform_settings (category)  │  ← theme_color_* keys
│  (legacy bridge)                        │
├─────────────────────────────────────────┤
│  Layer 2: CSS Variables in index.css     │  ← --primary, --fs-lg, etc.
│  (build-time baseline)                  │
├─────────────────────────────────────────┤
│  Layer 1: brandTheme.ts (hex registry)  │  ← BRAND_COLORS, BRAND_SHADOWS
│  (single source of truth for hex)       │
└─────────────────────────────────────────┘
```

### 1.2 Existing Token Coverage

| Category | Status | Location |
|----------|--------|----------|
| Colors (8 groups) | ✅ Complete | `brandTheme.ts` + `index.css` |
| Shadows | ✅ Complete | `brandTheme.ts` + `index.css` |
| Radii | ✅ Complete | `brandTheme.ts` + `index.css` |
| Typography scale | ✅ Complete | `index.css` (fluid clamp) + `tailwind.config.ts` |
| Spacing scale | ✅ Complete | `index.css` + `tailwind.config.ts` |
| Elevation | ✅ Complete | `index.css` + `tailwind.config.ts` |
| Motion (ease/dur) | ✅ Complete | `index.css` |
| Z-index | ✅ Complete | `index.css` |
| Icon sizes | ✅ Complete | `index.css` |
| Control heights | ✅ Complete | `index.css` |
| **Button states** | ⚠️ Partial | Only base colors; hover/focus/active computed |
| **Form states** | ⚠️ Partial | Only `--field-h`, `--field-radius`, `--field-bg` |
| **Table density** | ⚠️ Partial | `--table-row-h-*` exists but not exposed in UI |
| **Alert/Toast variants** | ⚠️ Minimal | Only `--alert-radius`, `--alert-padding` |
| **Layout dimensions** | ⚠️ Partial | Sidebar width, header height in CSS only |
| **Card surfaces** | ⚠️ Partial | No explicit card padding/elevation tokens |

---

## 2. Target State — Full Token Schema

### 2.1 New Tokens to Add (Phase 2)

```typescript
// Proposed additions to index.css :root

/* ── Button States ── */
--btn-primary-bg: var(--color-primary);
--btn-primary-bg-hover: var(--color-primary-hover);
--btn-primary-bg-active: var(--color-primary-dark);
--btn-primary-fg: #fff;
--btn-secondary-bg: var(--color-secondary);
--btn-secondary-bg-hover: var(--color-secondary-hover);
--btn-ghost-bg-hover: hsl(var(--muted));
--btn-disabled-opacity: 0.5;

/* ── Form States ── */
--field-bg-readonly: hsl(var(--muted));
--field-bg-error: hsl(0 67% 96%);
--field-border-error: hsl(0 67% 46%);
--field-border-focus: hsl(var(--ring));
--field-placeholder: hsl(var(--muted-foreground));
--label-fg: hsl(var(--foreground));
--hint-fg: hsl(var(--muted-foreground));

/* ── Table States ── */
--table-row-hover: hsl(var(--muted) / 0.5);
--table-row-selected: hsl(var(--primary) / 0.08);
--table-header-fg: hsl(var(--foreground));
--table-cell-padding-compact: 8px 12px;
--table-cell-padding-comfortable: 14px 16px;

/* ── Alert Variants ── */
--alert-success-bg: hsl(159 76% 34% / 0.08);
--alert-warning-bg: hsl(33 92% 36% / 0.08);
--alert-error-bg: hsl(0 67% 46% / 0.08);
--alert-info-bg: hsl(215 58% 43% / 0.08);

/* ── Card Surfaces ── */
--card-padding-sm: var(--sp-3);
--card-padding-md: var(--sp-4);
--card-padding-lg: var(--sp-6);
--card-elevation-rest: var(--elev-1);
--card-elevation-hover: var(--elev-2);

/* ── Layout ── */
--page-max-w: var(--container-max);
--page-padding-x: var(--pad-page-x);
--section-gap: var(--pad-section-y);
--drawer-w: 480px;
--drawer-w-lg: 640px;
```

### 2.2 DB Schema for admin_identity_tokens

```sql
-- Existing table (verified from codebase references)
create table public.admin_identity_tokens (
  id uuid primary key default gen_random_uuid(),
  token_key text not null unique,
  token_value text not null,
  token_category text not null, -- 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'motion' | 'layout'
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- RLS (already enabled per project standards)
-- GRANTs required per public-schema-grants rule
```

**Missing:** The table exists in code references but may need the `token_category` column and `updated_by` tracking added.

---

## 3. Identity Center UI Expansion

### 3.1 Current `AdminIdentityCenter.tsx` (320 lines)

Covers:
- Color picker grid for 8 color groups
- Real-time preview of changes
- Save/Reset buttons
- Basic validation (forbidden colors)

### 3.2 Phase 2 Additions

| Section | Widget | Tokens Edited |
|---------|--------|---------------|
| **Colors** | Color picker + hex input + preset palette | All `--color-*` |
| **Typography** | Font family select, size sliders, line-height inputs | `--fs-*`, `--font-heading`, `--font-body` |
| **Buttons** | Variant preview cards with editable hover/focus | `--btn-*-bg-hover` |
| **Forms** | Input preview with error/readonly/focus states | `--field-*` |
| **Tables** | Density toggle + row hover preview | `--table-row-h-*`, `--table-cell-padding-*` |
| **Alerts** | Toast preview with all 4 variants | `--alert-*-bg` |
| **Cards** | Elevation + padding preview | `--card-*` |
| **Layout** | Sidebar width slider, header height input | `--sidebar-w-*`, `--header-h` |
| **Motion** | Easing curve visualizer, duration sliders | `--ease-*`, `--dur-*` |
| **Shadows** | Elevation level cards with editable values | `--elev-*`, `--shadow-*` |

### 3.3 Preview Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Identity Center                                        │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Token Editor   │  │  Live Preview (iframe)    │  │
│  │  (form panels)  │  │  - Sample dashboard page    │  │
│  │                 │  │  - Sample admin list page   │  │
│  │  [Colors]       │  │  - Sample form page         │  │
│  │  [Typography]   │  │  - Mobile viewport toggle   │  │
│  │  [Buttons]      │  │                             │  │
│  │  [Forms]        │  │  Rendered with CURRENT      │  │
│  │  [Tables]       │  │  token overrides injected   │  │
│  │  ...            │  │  as CSS variables           │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│                                                         │
│  [Save Draft]  [Apply to Preview]  [Publish Live]      │
│  [Export JSON]  [Import JSON]  [Reset to Defaults]       │
└─────────────────────────────────────────────────────────┘
```

**Implementation:** The preview pane is an `<iframe srcDoc="...">` that loads a stripped-down version of the app's CSS plus the current token overrides. This avoids re-rendering the full admin app on every token change.

---

## 4. Anti-Patterns List (Forbidden)

These will be enforced by ESLint + CI:

| # | Anti-Pattern | Why Forbidden | Detection |
|---|--------------|-------------|-----------|
| 1 | `text-white`, `bg-black` | Not theme-aware | ESLint: no-literal-colors |
| 2 | Hex literals in TSX (`#0E9E6F`) outside `brandTheme.ts` | Scattered source of truth | ESLint: no-hex-in-jsx + grep CI |
| 3 | `text-[10px]`, `text-[11px]`, etc. | Bypasses fluid type scale | ESLint: no-arbitrary-font-sizes |
| 4 | `w-[200px]`, `h-[280px]` for UI chrome | Bypasses spacing scale | ESLint: no-arbitrary-spacing (with exceptions for media/embed) |
| 5 | `size={n}` on Lucide icons | Bypasses icon token scale | ESLint: prefer-icon-token |
| 6 | Hardcoded `z-index` values | Bypasses z-index scale | ESLint: prefer-z-token |
| 7 | Inline style objects with color/spacing | Not overridable by theme | ESLint: no-inline-style-colors |
| 8 | `fontSize` or `fontFamily` in inline styles | Bypasses typography tokens | ESLint: no-inline-typography |

### 4.1 ESLint Rule Skeleton

```javascript
// .eslintrc addition
{
  "rules": {
    "qitaat/no-literal-colors": ["error", {
      "allowedPatterns": ["^hsl\\(var\\("]
    }],
    "qitaat/no-arbitrary-font-sizes": ["warn", {
      "allowedValues": ["inherit"]
    }]
  }
}
```

*Note: Custom ESLint rules require a small plugin package. Start with simple `no-restricted-syntax` rules and graduate to custom rules in Phase 7.*

---

## 5. ThemeApplier Expansion

### 5.1 Current Behavior

`ThemeApplier.tsx` injects a `<style>` tag with CSS variables derived from `useThemeColors()`. It only handles the 6 legacy color fields (`primary`, `secondary`, `accent`, `navy`, etc.) plus any `extraOverrides`.

### 5.2 Target Behavior

`ThemeApplier.tsx` should inject **all** token categories. A new hook `useIdentityTokens()` reads from `admin_identity_tokens` and returns a flat object of CSS variable overrides.

```typescript
// Proposed new hook: src/hooks/useIdentityTokens.ts
export function useIdentityTokens() {
  const { data: rows } = useQuery({
    queryKey: ['admin_identity_tokens'],
    queryFn: () => supabase.from('admin_identity_tokens').select('*'),
    staleTime: Infinity, // tokens rarely change
  });

  const cssVars = useMemo(() => {
    const vars: string[] = [];
    for (const row of rows ?? []) {
      // Validate based on category
      if (row.token_category === 'color' && !validateHexColor(row.token_value)) continue;
      vars.push(`${row.token_key}:${row.token_value}`);
    }
    return vars.join(';');
  }, [rows]);

  return cssVars;
}
```

### 5.3 Injection Order

```
1. index.css (static build baseline)
2. brandTheme.ts → CSS (computed defaults)
3. platform_settings theme overrides (legacy bridge)
4. admin_identity_tokens overrides (new full-token system)
```

Layer 4 wins over layer 3 wins over layer 2 wins over layer 1.

---

## 6. Migration Plan

### Phase 2 (Design System Core)
- [ ] Add missing CSS variables to `index.css`
- [ ] Expand `admin_identity_tokens` schema with `token_category` and `updated_by`
- [ ] Build `useIdentityTokens()` hook
- [ ] Expand `ThemeApplier` to inject full token set
- [ ] Rebuild `AdminIdentityCenter` with 10 sections + live preview iframe
- [ ] Soft-deprecate `AdminBranding` (redirect to Identity Center)

### Phase 3–5 (Gradual Page Migration)
- [ ] Convert `text-[10px]` → `text-fs-2xs` across admin pages
- [ ] Convert `min-w-[200px]` → `min-w-sp-48` or token equivalent
- [ ] Replace inline style colors with `className` + token classes
- [ ] Unify button heights to `--ctrl-sm/md/lg/xl`

### Phase 6 (Form Simplification)
- [ ] Apply form state tokens to all `react-hook-form` forms
- [ ] Apply table density tokens to all admin tables
- [ ] Apply card surface tokens to all cards

### Phase 7 (Governance)
- [ ] Add ESLint rules for anti-patterns
- [ ] Add CI check that fails on hex literals in new PRs
- [ ] Generate "token coverage report" monthly

---

## 7. Token Reference Quick-Sheet

| Token | CSS Variable | Tailwind | Usage |
|-------|------------|----------|-------|
| Primary color | `--primary` | `text-primary`, `bg-primary` | Buttons, links, focus rings |
| Secondary color | `--secondary` | `text-secondary`, `bg-secondary` | Secondary actions |
| Accent color | `--accent` | `text-accent`, `bg-accent` | CTAs, highlights |
| Success | `--success` | `text-success`, `bg-success` | Positive states |
| Warning | `--warning` | `text-warning`, `bg-warning` | Caution states |
| Error | `--destructive` | `text-destructive`, `bg-destructive` | Errors |
| Info | `--info` | `text-info`, `bg-info` | Informational |
| Text | `--foreground` | `text-foreground` | Body text |
| Muted text | `--muted-foreground` | `text-muted-foreground` | Labels, hints |
| Background | `--background` | `bg-background` | Page bg |
| Surface | `--card` | `bg-card` | Cards, panels |
| Border | `--border` | `border-border` | Dividers, outlines |
| Font XS | `--fs-xs` | `text-fs-xs` | Captions |
| Font Base | `--fs-base` | `text-fs-base` | Body |
| Font LG | `--fs-lg` | `text-fs-lg` | Headings |
| Spacing 1 | `--sp-1` | `p-sp-1`, `m-sp-1` | Micro gaps |
| Spacing 4 | `--sp-4` | `p-sp-4`, `gap-sp-4` | Standard gaps |
| Radius MD | `--r-md` | `rounded-r-md` | Cards |
| Radius LG | `--r-lg` | `rounded-r-lg` | Modals |
| Elevation 1 | `--elev-1` | `shadow-elev-1` | Resting cards |
| Elevation 2 | `--elev-2` | `shadow-elev-2` | Hover cards |
| Control SM | `--ctrl-sm` | `h-ctrl-sm` | Small buttons |
| Control MD | `--ctrl-md` | `h-ctrl-md` | Standard inputs |
| Icon SM | `--ic-sm` | `size-ic-sm` | Inline icons |
| Icon MD | `--ic-md` | `size-ic-md` | Button icons |

---

*End of Identity Center Plan. Prepared for Phase 2 (Design System & Identity Center Core).*
