import { BarChart3, Key, Clock, FileText } from 'lucide-react';
import { LandingTileGrid, type LandingTile } from './_landingShared';

const TILES: ReadonlyArray<LandingTile> = [
  { key: 'analytics', to: '/admin/system-settings?tab=analytics', icon: BarChart3, title: { ar: 'التحليلات والموافقة', en: 'Analytics & Consent' }, description: { ar: 'إعدادات التحليلات وموافقة المستخدم.', en: 'Analytics and consent settings.' } },
  { key: 'api', to: '/admin/system-settings?tab=api', icon: Key, title: { ar: 'إعدادات API', en: 'API Settings' }, description: { ar: 'مفاتيح وإعدادات الواجهات البرمجية.', en: 'API keys and configuration.' } },
  { key: 'cron', to: '/admin/cron-runs', icon: Clock, title: { ar: 'مهام Cron', en: 'Cron Runs' }, description: { ar: 'تنفيذات المهام المجدولة.', en: 'Scheduled job executions.' } },
  { key: 'audit', to: '/admin/audit-log', icon: FileText, title: { ar: 'سجل التدقيق', en: 'Audit Log' }, description: { ar: 'سجل التدقيق الموحد.', en: 'Unified audit log.' } },
];

const AdvancedLanding = () => <LandingTileGrid tiles={TILES} />;
export default AdvancedLanding;