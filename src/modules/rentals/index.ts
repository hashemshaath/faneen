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