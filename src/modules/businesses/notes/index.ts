// Module: businesses/notes
// Canonical wrappers for internal-notes + activity-timeline reads/writes.
// All access is enforced by RLS — these wrappers never bypass it.
export { listBusinessInternalNotes } from "./services/listBusinessInternalNotes";
export type { ListBusinessInternalNotesOptions } from "./services/listBusinessInternalNotes";
export { insertBusinessInternalNote } from "./services/insertBusinessInternalNote";
export {
  updateBusinessInternalNote,
  softDeleteBusinessInternalNote,
} from "./services/updateBusinessInternalNote";
export { listBusinessActivityTimeline } from "./services/listBusinessActivityTimeline";
export type {
  BusinessActivityEvent,
  ListBusinessActivityTimelineOptions,
} from "./services/listBusinessActivityTimeline";
export type {
  BusinessInternalNote,
  BusinessInternalNoteInsert,
  BusinessInternalNoteUpdate,
  BusinessInternalNoteVisibility,
} from "./types";