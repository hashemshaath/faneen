# Admin Redesign — Shared Primitives (v3 Soft & Modern)

Phase 1 (shared components) propagates automatically across ~40 admin pages
via `AdminPageHeader` + `AdminKpiCard`. Phase 2 adds two opt-in primitives
pages can adopt incrementally without changing any data logic or routes.

## New components

### `AdminFiltersBar`
`src/components/admin/AdminFiltersBar.tsx`

Unified search input + status pills (with counts) + right-side action slot.
RTL-aware, semantic tokens only, `rounded-3xl` card with `backdrop-blur`.

```tsx
<AdminFiltersBar
  searchValue={q}
  onSearchChange={setQ}
  searchPlaceholder="ابحث بالاسم أو الرقم المرجعي…"
  pills={[
    { key: 'all',       label: 'الكل',     count: total,    tone: 'default' },
    { key: 'pending',   label: 'قيد المراجعة', count: pending, tone: 'warning' },
    { key: 'approved',  label: 'معتمد',    count: approved, tone: 'success' },
    { key: 'rejected',  label: 'مرفوض',    count: rejected, tone: 'destructive' },
  ]}
  activePill={status}
  onPillSelect={setStatus}
  canClear={status !== 'all' || !!q}
  onClear={() => { setStatus('all'); setQ(''); }}
  rightSlot={<Button>تصدير</Button>}
/>
```

### `AdminStatusBadge`
`src/components/admin/AdminStatusBadge.tsx`

Unified status chip with optional colored dot (Salla-like). Replaces ad-hoc
`<Badge>` color combinations in admin tables.

```tsx
<AdminStatusBadge label="معتمد" tone="success" />
<AdminStatusBadge label="قيد المراجعة" tone="warning" />
<AdminStatusBadge label="مرفوض" tone="destructive" />
```

Tones: `success | warning | info | destructive | primary | accent | muted`.

## Migration policy

- **Additive only** — no existing page is rewritten in this phase.
- Adopt page-by-page, starting with the most-trafficked admin pages
  (Approvals, Businesses, Users, Memberships, Operations).
- Keep all queries, RLS, permissions, and route behavior unchanged —
  this is presentation-layer work.
- Do not introduce new `<Badge>` color combinations; use
  `AdminStatusBadge` for any new admin status indicator.

## Already shipped (Phase 1)

- `AdminPageHeader` — `rounded-3xl`, `bg-card/80 backdrop-blur-sm`, soft
  `shadow-sm`, larger icon badge, compact eyebrow.
- `AdminKpiCard` — unified `bg-card` background, `rounded-2xl` icon tile,
  top-right trend chip with `TrendingUp` icon, tabular numeric value.

Both propagate to every admin page that already uses them — no per-page
changes required.