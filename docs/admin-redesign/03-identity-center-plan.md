# Admin Redesign — Phase 1 / Doc 3: Identity Center Plan

## 1. Goal

`/admin/system/identity` becomes the **single source of truth** for the
platform's visual identity. Any change here propagates instantly to
admin, dashboard, and public surfaces — no per-page edits.

## 2. Token taxonomy

All tokens are CSS custom properties on `:root` (light) and `.dark`.
They are already partially defined in `src/index.css` — Phase 2 extends
coverage, adds DB persistence, and wires the editor.

| Group        | Tokens                                                                                          | Status today |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------ |
| Typography   | `--font-sans`, `--font-heading`, `--fs-2xs … --fs-display`, `--lh-tight/normal/loose`, `--ls-*` | partial      |
| Colors       | `--primary`, `--secondary`, `--accent`, `--success`, `--warning`, `--error`, `--info`, `--muted`, `--background`, `--foreground`, `--border`, `--ring`, `--surface-nav`, hover/active/focus shades | mostly done |
| Radii        | `--radius-xs/sm/md/lg/xl/2xl/pill`                                                              | done         |
| Elevation    | `--shadow-elev-1..4`                                                                            | done         |
| Spacing      | `--sp-1..20`                                                                                    | done         |
| Motion       | `--dur-fast/base/slow`, `--ease-standard/emphasized`                                            | done         |
| Z-index      | `--z-dropdown/sticky/overlay/toast`                                                             | done         |
| **Controls** | `--ctrl-h-sm/md/lg/xl`, `--ctrl-radius`, `--btn-focus-ring-w/color`                             | **missing**  |
| **Forms**    | `--field-h`, `--field-radius`, `--field-bg`, `--field-border`, `--field-focus-ring`             | **missing**  |
| **Tables**   | `--table-row-h-compact/comfortable`, `--table-border`, `--table-header-bg`                      | **missing**  |
| **Alerts**   | `--alert-radius`, `--alert-padding`, per-tone bg/fg/border                                      | partial      |
| **Layout**   | `--sidebar-w-expanded/collapsed`, `--header-h`, `--container-max`                               | partial      |

## 3. Persistence

New table (Phase 2 migration):

```sql
create table public.admin_identity_tokens (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',     -- future-proof for multi-tenant
  tokens jsonb not null default '{}'::jsonb, -- { "--primary": "162 60% 40%", ... }
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (scope)
);

grant select on public.admin_identity_tokens to authenticated;
grant all on public.admin_identity_tokens to service_role;
alter table public.admin_identity_tokens enable row level security;

create policy "anyone authenticated can read tokens"
  on public.admin_identity_tokens for select to authenticated using (true);
create policy "only admins can write tokens"
  on public.admin_identity_tokens for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

Existing `platform_settings.theme_overrides` JSON path stays as
fallback during migration; new code reads `admin_identity_tokens`
first.

## 4. Runtime application

Extend `ThemeApplier`:

```ts
const css = `:root { ${Object.entries(tokens).map(([k,v]) => `${k}:${v};`).join('')} }`;
document.getElementById('theme-overrides').textContent = css;
```

- Already injects a `<style id="theme-overrides">` element.
- Phase 2 will broaden the input from `colors only` to the full token map.
- A Supabase realtime channel on `admin_identity_tokens` will let edits
  in the Identity Center propagate to all open sessions without reload.

## 5. Identity Center UI sections

1. **Typography** — font family (web-safe + Google Fonts allowlist), heading vs body weights, fluid scale knobs, line-height presets.
2. **Color palette** — 8 semantic groups, each with base + hover/active/focus shades, contrast preview (WCAG AA badge).
3. **Buttons** — per variant: radius, height, focus ring width, hover/active states; live preview row.
4. **Forms** — input height/radius/background/border, focus ring, validation colors; live preview row.
5. **Cards & tables** — radius, row density toggle, header/sticky background.
6. **Alerts & toasts** — per-tone palette + radius + padding; live preview row.
7. **Layout** — sidebar width (expanded/collapsed), header height, page padding, container max-width.
8. **Preview pane** — renders a representative admin page snippet using only the in-flight overrides; "Apply" persists, "Reset" reverts.

## 6. Anti-patterns (will fail CI after Phase 7)

- `text-white`, `text-black`, `bg-white`, `bg-black` in component code.
- Hex literals (`#ffffff`) anywhere in `src/` outside `index.css` / `tailwind.config.ts` / `brandTheme.ts`.
- Hardcoded font sizes (`text-[14px]`, `font-size: 14px`) outside tokens.
- `<Icon size={n} />` — use `className="ic-*"`.
- Custom `<Dialog>` for forms — UX constraint: inline only.

## 7. Migration strategy (gradual, non-breaking)

- Phase 2 adds tokens + table + extended `ThemeApplier`; existing pages keep working.
- Phase 5 swaps ad-hoc Tailwind for tokens **only in the pages being refactored**.
- Phase 7 turns the anti-patterns into CI errors (`scripts/contrast-tokens-audit.mjs` already exists — extend it).

## 8. Out of scope here

- Dark mode beautification (we keep current `.dark` block intact).
- Per-business white-labelling.
- Animated theme transitions.