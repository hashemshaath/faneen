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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'contract-status-update': contractStatusUpdate,
  'contact-confirmation': contactConfirmation,
  'contact-admin-notification': contactAdminNotification,
  'maintenance-status-update': maintenanceStatusUpdate,
  'payment-reminder': paymentReminder,
}
