# Contract Pricing Engine

Status: live (CT5A → CT5E). PDF integration deferred to CT6.

## Supported pricing methods

| Method | Unit | Required `formula_inputs` keys | Server formula |
|---|---|---|---|
| `unit` | pcs | — | `quantity * unit_price` |
| `linear_meter` | m | `length_mm` | `(length_mm / 1000) * quantity * unit_price` |
| `square_meter` | m² | `length_mm`, `width_mm` | `(length_mm * width_mm / 1e6) * quantity * unit_price` |
| `cubic_meter` | m³ | `length_mm`, `width_mm`, `height_mm` | `(length_mm * width_mm * height_mm / 1e9) * quantity * unit_price` |
| `kilogram` | kg | `weight_kg` | `weight_kg * quantity * unit_price` |
| `ton` | t | `weight_kg` (or `weight_ton`) | `(weight_kg / 1000) * quantity * unit_price` |
| `lump_sum` | — | `amount` (optional) | `COALESCE(amount, unit_price) * quantity` |

Caps (mirrored frontend ⇄ server):
`MAX_DIM = 1e9 mm`, `MAX_QTY = 1e6`, `MAX_WEIGHT = 1e6`, `MAX_PRICE = 1e9`, `MAX_TOTAL = 1e12`.

## Server validation behavior

- `calculate_contract_line_item_total(method, qty, price, inputs)` → `{ ok, total, unit_of_measure, error_code? }`.
- `validate_contract_line_item_price(payload)` is a dry-run RPC for the UI.
- Trigger `trg_validate_contract_line_item_pricing` on `contract_line_items` (BEFORE INSERT/UPDATE):
  - Overwrites `NEW.total_cost` with the server-computed value (server is authoritative).
  - Backfills `NEW.unit_of_measure` from the method.
  - Raises `INVALID_LINE_ITEM_PRICING:<code>` on `negative_value`, `value_too_large`, `missing_length`, `missing_width`, `missing_height`, `missing_weight`, `invalid_number`, `unsupported_method`.
  - Raises `INVALID_LINE_ITEM_PRICING:method_not_allowed_by_template` when the contract's `template_version_id` has rules in `contract_template_pricing_rules` and the method is not allowed.
- Errors are mapped to bilingual (AR/EN) messages in `src/lib/contract-errors.ts`.
- Backward compatibility: rows with `NULL` `pricing_method` behave as `unit`. Contracts without `template_version_id`, or templates with zero pricing rules, accept all 7 methods.

## BOQ groups (CT5C)

Helper: `src/lib/contract-boq.ts`. Standard `boq_group_key` values: `cabinets`, `countertops`, `accessories`, `appliances`, `installation`, `materials`, `labor`, `delivery`, `other`. Items without a group fall under "Other / أخرى".

- Subtotals are computed per group; the grand total stays equal to `SUM(total_cost)`.
- A "Mixed pricing / تسعير مختلط" badge appears when ≥ 2 distinct methods are present.
- Selecting a kitchen-style group auto-suggests a pricing method (e.g. `cabinets → linear_meter`, `countertops → square_meter`).

## Template pricing rules (CT5D + CT5E)

- Rules live in `contract_template_pricing_rules (version_id, method, is_default, …)`.
- The provider-side method dropdown filters to allowed methods for the contract's template version. If a previously chosen method becomes disallowed, the form resets to a valid default.
- Seeded starter rules per published v1 template (CT5E):
  - `general` → unit, **lump_sum**
  - `kitchens` → **linear_meter**, square_meter, unit, lump_sum
  - `aluminum_doors_windows`, `wood_doors`, `fire_doors`, `upvc`, `iron_doors_windows` → **unit**, square_meter, linear_meter
  - `facades` → **square_meter**, linear_meter, lump_sum
  - `glass_securit` → **square_meter**, unit
  - `gates_structures` → **kilogram**, ton, linear_meter, unit, lump_sum
- `wardrobes_closets` is intentionally unseeded — admins decide.

## How admins should configure pricing rules

In `/admin/contract-templates`:
1. Open a template version (drafts are editable; published versions are read-only).
2. In the Pricing Rules editor:
   - Add one row per allowed measurement method.
   - Mark exactly one row as **Default** — the provider UI uses it as the initial method.
   - VAT handling defaults to `inherit` (contract-level VAT applies).
   - Leave `formula`, `required_fields`, `rounding`, `display_in_pdf` empty unless you have a specific need — they are not yet executed.
3. The banner reminds you: only methods listed here will be available to providers using this template.
4. The count badge shows how many methods are currently allowed.
5. With zero rules, the trigger does not enforce — providers see all 7 methods. Add at least one rule to start enforcing.

## Deferred (not in CT5)

- `custom_formula` measurement method (no expression engine yet).
- Arbitrary user-supplied formula execution.
- Advanced `mixed` pricing engine beyond per-line-item method selection.
- Itemized BOQ automation (auto-split / template-driven line items).
- Milestone pricing automation (currently fixed 30/40/30 schedule).
- PDF rendering of pricing methods, formulas, group subtotals (CT6).
