/**
 * R2A.1 — Contracts module public surface for status constants.
 *
 * Re-exports the pure status registries from src/lib. Canonical code remains
 * in src/lib for this phase to keep diffs zero-risk; later R2A phases may
 * relocate the implementation here.
 */
export * from '@/lib/contract-statuses';
export * from '@/lib/contract-status-guidance';