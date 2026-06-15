import { Bell, Inbox, FileText } from 'lucide-react';
import { LandingTileGrid, type LandingTile } from './_landingShared';

const TILES: ReadonlyArray<LandingTile> = [
  { key: 'contact-inbox', to: '/admin/contact-messages?tab=settings', icon: Inbox, title: { ar: 'إعدادات صندوق التواصل', en: 'Contact Inbox Settings' }, description: { ar: 'إعدادات استقبال الرسائل والتنبيهات.', en: 'Inbox and notification routing settings.' } },
  { key: 'notif-log', to: '/admin/contact-messages?tab=notifications', icon: Bell, title: { ar: 'سجل تنبيهات التواصل', en: 'Contact Notification Log' }, description: { ar: 'سجل التنبيهات المرسلة.', en: 'Sent notification log.' } },
  { key: 'templates', to: '/admin/system-settings', icon: FileText, title: { ar: 'قوالب النظام', en: 'System Templates' }, description: { ar: 'قوالب الإشعارات داخل إعدادات النظام.', en: 'Notification templates in system settings.' } },
];

const NotificationsLanding = () => <LandingTileGrid tiles={TILES} />;
export default NotificationsLanding;