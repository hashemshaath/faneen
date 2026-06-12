/**
 * ADMIN-REDESIGN PHASE 6 — Unified form primitives.
 *
 * Importing from this barrel keeps page-level code free of deep paths:
 *   import { FormSection, StepperForm, InlineEditField } from '@/components/forms';
 */
export { FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';
export { StepperForm } from './StepperForm';
export type { StepperFormProps, StepperStep } from './StepperForm';
export { InlineEditField } from './InlineEditField';
export type { InlineEditFieldProps } from './InlineEditField';