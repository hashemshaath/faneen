# shared/format

Centralized formatters for currency, dates, phone numbers, and IDs.

**Status:** Scaffold only (R0). Existing callsites are NOT migrated yet.
Migration to these helpers will happen incrementally in R1.

Rules:
- Pure functions only, no React, no Supabase.
- RTL/LTR aware where relevant (use `.tech-content` class on the consumer side).
- Currency defaults to SAR; multi-currency support remains opt-in.
