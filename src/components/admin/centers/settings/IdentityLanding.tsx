import { Fingerprint, Users, ShieldCheck, Activity } from 'lucide-react';
import { LandingTileGrid, type LandingTile } from './_landingShared';

/**
 * ADMIN UX RECONSOLIDATION PHASE 10 — Identity tab landing.
 * Links to existing identity routes. No queries / mutations / services.
 */
const TILES: ReadonlyArray<LandingTile> = [
  { key: 'identity-center', to: '/admin/system/identity', icon: Fingerprint, title: { ar: 'مركز الهوية', en: 'Identity Center' }, description: { ar: 'رموز هوية النظام وإعداداتها.', en: 'System identity tokens and configuration.' } },
  { key: 'identity-hub', to: '/admin/identity', icon: ShieldCheck, title: { ar: 'لوحة الهوية', en: 'Identity Hub' }, description: { ar: 'لوحة الهوية والوصول.', en: 'Identity & access hub.' } },
  { key: 'identity-dashboard', to: '/admin/identity/dashboard', icon: Activity, title: { ar: 'لوحة قياس الهوية', en: 'Identity Dashboard' }, description: { ar: 'مؤشرات الهوية والجلسات.', en: 'Identity & session metrics.' } },
  { key: 'users', to: '/admin/users', icon: Users, title: { ar: 'المستخدمون', en: 'Users' }, description: { ar: 'إدارة المستخدمين والصلاحيات.', en: 'Manage users and permissions.' } },
];

const IdentityLanding = () => <LandingTileGrid tiles={TILES} />;
export default IdentityLanding;