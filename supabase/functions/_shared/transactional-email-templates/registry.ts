/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as contractStatusUpdate } from './contract-status-update.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as contactAdminNotification } from './contact-admin-notification.tsx'
import { template as maintenanceStatusUpdate } from './maintenance-status-update.tsx'
import { template as paymentReminder } from './payment-reminder.tsx'
import { template as welcomeSignup } from './welcome-signup.tsx'
import { template as welcomeBusiness } from './welcome-business.tsx'
import { template as contractSigned } from './contract-signed.tsx'
import { template as leadConfirmation } from './lead-confirmation.tsx'
import { template as leadNotification } from './lead-notification.tsx'
import { template as leadAccepted } from './lead-accepted.tsx'
import { template as leadRejected } from './lead-rejected.tsx'
import { template as leadNeedsInfo } from './lead-needs-info.tsx'
import { template as leadCancelledProviderNotice } from './lead-cancelled-provider-notice.tsx'
import { template as leadQuoted } from './lead-quoted.tsx'
import { template as providerApproved } from './provider-approved.tsx'
import { template as providerRejected } from './provider-rejected.tsx'
import { template as providerRevisionRequested } from './provider-revision-requested.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'contract-status-update': contractStatusUpdate,
  'contact-confirmation': contactConfirmation,
  'contact-admin-notification': contactAdminNotification,
  'maintenance-status-update': maintenanceStatusUpdate,
  'payment-reminder': paymentReminder,
  'welcome-signup': welcomeSignup,
  'welcome-business': welcomeBusiness,
  'contract-signed': contractSigned,
  'lead-confirmation': leadConfirmation,
  'lead-notification': leadNotification,
  'lead-accepted': leadAccepted,
  'lead-rejected': leadRejected,
  'lead-needs-info': leadNeedsInfo,
  'lead-cancelled-provider-notice': leadCancelledProviderNotice,
  'lead-quoted': leadQuoted,
  'provider-approved': providerApproved,
  'provider-rejected': providerRejected,
  'provider-revision-requested': providerRevisionRequested,
}
