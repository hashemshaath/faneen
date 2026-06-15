import { ShieldCheck, Users, FileText } from 'lucide-react';
import { LandingTileGrid, type LandingTile } from './_landingShared';

const TILES: ReadonlyArray<LandingTile> = [
  { key: 'identity-center', to: '/admin/system/identity', icon: ShieldCheck, title: { ar: 'هوية النظام', en: 'System Identity' }, description: { ar: 'إعدادات الأمان والهوية.', en: 'Security and identity configuration.' } },
  { key: 'roles', to: '/admin/users', icon: Users, title: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' }, description: { ar: 'إدارة الأدوار من خلال المستخدمين.', en: 'Manage roles via user management.' } },
  { key: 'audit', to: '/admin/audit-log', icon: FileText, title: { ar: 'سجل التدقيق', en: 'Audit Log' }, description: { ar: 'كل الأنشطة الإدارية والأمنية.', en: 'All admin and security activity.' } },
];

const SecurityLanding = () => <LandingTileGrid tiles={TILES} />;
export default SecurityLanding;