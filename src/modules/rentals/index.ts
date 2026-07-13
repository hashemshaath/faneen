/** RENTAL-MICROSERVICE-1 — public barrel. */
export * from './types';
export * from './constants';
export * as RentalCategories from './services/categories';
export * as RentalItems from './services/items';
export * as RentalOrders from './services/orders';
export * as RentalExtensionsApi from './services/extensions';
export * as RentalOps from './services/operationsHub';
export { totalDays, daysLeft, overdueDays, alertTier } from './utils/dayCounter';
export type { AlertTier } from './utils/dayCounter';
export { calcTotal } from './utils/pricing';

/* RENTAL-MICROSERVICE-2 — additions */
export { notifyRental, RENTAL_EVENTS } from './services/notifications';
export type { RentalEvent, RentalNotifyArgs } from './services/notifications';
export { RentalExtensionPanel } from './components/RentalExtensionPanel';
export { RentalImageUploader } from './components/RentalImageUploader';
export { RentalOpsQueueCard } from './components/RentalOpsQueueCard';

/* T1 — customer request path */
export * as RentalCustomerRequests from './services/customerRequests';
export { computeRentalPricePreview } from './utils/pricing';
export type { RentalPricePreview, RentalPricePreviewInput } from './utils/pricing';

/* T5 — returns / pickup / damages */
export * as RentalReturns from './services/returns';
export { RentalReturnForm } from './components/RentalReturnForm';
export { RentalReturnCustomerCard } from './components/RentalReturnCustomerCard';
export type {
  RentalReturn, RentalReturnCondition, RentalReturnPhoto,
} from './services/returns';