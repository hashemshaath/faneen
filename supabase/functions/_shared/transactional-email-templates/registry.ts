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
import { template as contractDraftCreatedClient } from './contract-draft-created-client.tsx'
import { template as contractDraftCreatedProvider } from './contract-draft-created-provider.tsx'
import { template as membershipUpgradeRequestSubmitted } from './membership-upgrade-request-submitted.tsx'
import { template as membershipUpgradeRequestApproved } from './membership-upgrade-request-approved.tsx'
import { template as membershipUpgradeRequestRejected } from './membership-upgrade-request-rejected.tsx'
import { template as membershipSubscriptionCancelled } from './membership-subscription-cancelled.tsx'
import { template as membershipSubscriptionActivated } from './membership-subscription-activated.tsx'
import { template as membershipTierChangedByAdmin } from './membership-tier-changed-by-admin.tsx'
import { template as membershipSubscriptionExpired } from './membership-subscription-expired.tsx'
import { template as membershipRenewalReminder } from './membership-renewal-reminder.tsx'
import { template as membershipRenewalFailed } from './membership-renewal-failed.tsx'
import { template as membershipPromoRedeemed } from './membership-promo-redeemed.tsx'
import { template as membershipCancelledImmediately } from './membership-cancelled-immediately.tsx'
import { template as membershipPaymentMarkedPaid } from './membership-payment-marked-paid.tsx'
import { template as membershipPaymentMarkedRefunded } from './membership-payment-marked-refunded.tsx'
import { template as contractPaymentRecorded } from './contract-payment-recorded.tsx'
import { template as contractPaymentDue } from './contract-payment-due.tsx'
import { template as contractMilestoneCompleted } from './contract-milestone-completed.tsx'
import { template as contractAmendmentCreated } from './contract-amendment-created.tsx'
import { template as contractAmendmentPendingApproval } from './contract-amendment-pending-approval.tsx'
import { template as contractAmendmentApproved } from './contract-amendment-approved.tsx'
import { template as contractAmendmentApplied } from './contract-amendment-applied.tsx'
import { template as contractAmendmentRejected } from './contract-amendment-rejected.tsx'
import { template as contractAmendmentCancelled } from './contract-amendment-cancelled.tsx'
import { template as clientContractInvite } from './client-contract-invite.tsx'
import { template as clientInviteReminder } from './client-invite-reminder.tsx'
import { template as clientInviteAccepted } from './client-invite-accepted.tsx'
import { template as businessStaffInvitation } from './business-staff-invitation.tsx'
import { template as customerQuotationReady } from './customer-quotation-ready.tsx'
import { template as customerQuotationApproved } from './customer-quotation-approved.tsx'
import { template as customerWorkOrderCreated } from './customer-work-order-created.tsx'
import { template as customerWorkOrderCompleted } from './customer-work-order-completed.tsx'
import { template as customerInstallationScheduled } from './customer-installation-scheduled.tsx'
import { template as customerInstallationConfirmed } from './customer-installation-confirmed.tsx'
import { template as customerInstallationRescheduleRequested } from './customer-installation-reschedule-requested.tsx'
import { template as customerInstallationCompleted } from './customer-installation-completed.tsx'

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
  'contract-draft-created-client': contractDraftCreatedClient,
  'contract-draft-created-provider': contractDraftCreatedProvider,
  'membership-upgrade-request-submitted': membershipUpgradeRequestSubmitted,
  'membership-upgrade-request-approved': membershipUpgradeRequestApproved,
  'membership-upgrade-request-rejected': membershipUpgradeRequestRejected,
  'membership-subscription-cancelled': membershipSubscriptionCancelled,
  'membership-subscription-activated': membershipSubscriptionActivated,
  'membership-tier-changed-by-admin': membershipTierChangedByAdmin,
  'membership-subscription-expired': membershipSubscriptionExpired,
  'membership-renewal-reminder': membershipRenewalReminder,
  'membership-renewal-failed': membershipRenewalFailed,
  'membership-promo-redeemed': membershipPromoRedeemed,
  'membership-cancelled-immediately': membershipCancelledImmediately,
  'membership-payment-marked-paid': membershipPaymentMarkedPaid,
  'membership-payment-marked-refunded': membershipPaymentMarkedRefunded,
  'contract-payment-recorded': contractPaymentRecorded,
  'contract-payment-due': contractPaymentDue,
  'contract-milestone-completed': contractMilestoneCompleted,
  'contract-amendment-created': contractAmendmentCreated,
  'contract-amendment-pending-approval': contractAmendmentPendingApproval,
  'contract-amendment-approved': contractAmendmentApproved,
  'contract-amendment-applied': contractAmendmentApplied,
  'contract-amendment-rejected': contractAmendmentRejected,
  'contract-amendment-cancelled': contractAmendmentCancelled,
  'client-contract-invite': clientContractInvite,
  'client-invite-reminder': clientInviteReminder,
  'client-invite-accepted': clientInviteAccepted,
  'business-staff-invitation': businessStaffInvitation,
  'customer-quotation-ready': customerQuotationReady,
  'customer-quotation-approved': customerQuotationApproved,
  'customer-work-order-created': customerWorkOrderCreated,
  'customer-work-order-completed': customerWorkOrderCompleted,
  'customer-installation-scheduled': customerInstallationScheduled,
  'customer-installation-confirmed': customerInstallationConfirmed,
  'customer-installation-reschedule-requested': customerInstallationRescheduleRequested,
  'customer-installation-completed': customerInstallationCompleted,
}
