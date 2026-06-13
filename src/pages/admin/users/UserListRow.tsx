import React, { useCallback, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Clock, Mail, Phone, Calendar, Hash, Shield, AlertTriangle, Building2, Check,
  ChevronUp, ChevronDown, UserPlus, X, Copy, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { pickBi } from '@/components/common/Bilingual';
import { maskEmail, maskPhone } from '@/lib/masking';
import { isSyntheticPhoneEmail } from '@/lib/auth-email';
import { formatDate, formatRelative, type Density, type BusinessLink, type StaffRole } from './_shared';
import {
  accountTypeConfig, roleConfig, staffRoleConfig, tierConfig,
  type Profile, type UserRole,
} from './userConfigs';
import { UserStatusBadge } from '@/components/admin/users/UserStatusBadge';
import { UserRowActions } from '@/components/admin/users/UserRowActions';
import { UserDetailPanel } from './UserDetailPanel';

/**
 * Phase 6C — extracted from AdminUsers.tsx without behavior change.
 * Pure presentational row: receives every callback from the parent and
 * never owns mutations. The expanded detail card is rendered via the
 * sibling `UserDetailPanel` component.
 */
export interface UserListRowProps {
  profile: Profile;
  roles: UserRole[];
  businessLinks: BusinessLink[];
  isCurrentUser: boolean;
  canManageUser: boolean;
  isSuperAdmin: boolean;
  isRTL: boolean;
  language: string;
  selected: boolean;
  expanded: boolean;
  density: Density;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onEdit: (p: Profile) => void;
  onPassword: (p: Profile) => void;
  onToggleBan: (p: Profile) => void;
  onDelete: (p: Profile) => void;
  onAddRole: (userId: string, role: string) => void;
  onRemoveRole: (id: string) => void;
  onChangeStaffRole: (link: BusinessLink, role: StaffRole) => void;
  onRemoveStaff: (link: BusinessLink) => void;
  onView: (p: Profile) => void;
}

export const UserListRow = React.memo(({
  profile, roles, businessLinks, isCurrentUser, canManageUser, isSuperAdmin,
  isRTL, language, selected, expanded, density, onToggleSelect, onToggleExpand,
  onEdit, onPassword, onToggleBan, onDelete, onAddRole, onRemoveRole,
  onChangeStaffRole, onRemoveStaff, onView,
}: UserListRowProps) => {
  const [addingRole, setAddingRole] = useState(false);
  const [pickedRole, setPickedRole] = useState('user');
  const tier = tierConfig[profile.membership_tier as keyof typeof tierConfig] || tierConfig.free;
  const accType = accountTypeConfig[profile.account_type] || accountTypeConfig.individual;
  const AccIcon = accType.icon;
  const isBanned = profile.is_banned;
  const highest = roles.length > 0
    ? roles.reduce((b, r) => (roleConfig[r.role as keyof typeof roleConfig]?.rank ?? 99) < (roleConfig[b.role as keyof typeof roleConfig]?.rank ?? 99) ? r : b)
    : null;
  const highestCfg = highest ? roleConfig[highest.role as keyof typeof roleConfig] : null;
  const compact = density === 'compact';
  const canSeePII = isSuperAdmin;
  const officialEmail = profile.email && !isSyntheticPhoneEmail(profile.email) ? profile.email : null;
  const displayedEmail = officialEmail ? (canSeePII ? officialEmail : maskEmail(officialEmail)) : null;
  const displayedPhone = profile.phone ? (canSeePII ? profile.phone : maskPhone(profile.phone)) : null;

  const handleCopy = useCallback((value: string, label: string) => {
    if (!isSuperAdmin && (label.includes('بريد') || label.toLowerCase().includes('email') || label.includes('هاتف') || label.toLowerCase().includes('phone'))) {
      toast.error(pickBi(isRTL, 'هذه البيانات الحساسة متاحة فقط لمدير النظام (Super Admin).', 'This sensitive data is only available to Super Admins.'));
      return;
    }
    navigator.clipboard?.writeText(value).then(
      () => toast.success(isRTL ? `تم نسخ ${label}` : `${label} copied`),
      () => toast.error(pickBi(isRTL, 'فشل النسخ', 'Copy failed')),
    );
  }, [isRTL, isSuperAdmin]);

  return (
    <div id={`user-row-${profile.id}`} className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
      ${selected ? 'ring-2 ring-accent border-accent/50' : isCurrentUser ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border/30'}
      ${isBanned ? 'opacity-70 border-destructive/40' : ''}`}>
      <div className={`${compact ? 'p-2.5 sm:p-3 gap-2' : 'p-3 sm:p-4 gap-3'} flex flex-col sm:flex-row sm:items-start`}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="mt-1 shrink-0" disabled={!canManageUser} />
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} ring-2 ${isCurrentUser ? 'ring-accent/30' : 'ring-border/10'}`}>
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                {(profile.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            {highestCfg && (
              <div className={`absolute -bottom-1 -end-1 w-5 h-5 rounded-full ${highestCfg.iconBg} flex items-center justify-center ring-2 ring-card`}>
                <highestCfg.icon className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={onToggleExpand} className="font-heading font-bold text-sm hover:text-accent transition-colors text-start truncate">
                {profile.full_name || (pickBi(isRTL, 'بدون اسم', 'No name'))}
              </button>
              {isCurrentUser && <Badge variant="outline" className="text-[9px] border-accent text-accent px-1.5 py-0">{pickBi(isRTL, 'أنت', 'You')}</Badge>}
              {isBanned && <UserStatusBadge variant="suspended" isRTL={isRTL} />}
              {!compact && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />{formatRelative(profile.updated_at, isRTL)}
                </span>
              )}
            </div>
            {!compact && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {displayedEmail && officialEmail && (
                <button onClick={() => handleCopy(officialEmail, pickBi(isRTL, 'البريد', 'Email'))}
                  className={`flex items-center gap-1 text-[11px] truncate max-w-[200px] transition-colors group/cp ${canSeePII ? 'text-muted-foreground hover:text-accent' : 'text-muted-foreground/70 cursor-not-allowed'}`}
                  title={canSeePII ? (pickBi(isRTL, 'نسخ البريد', 'Copy email')) : (pickBi(isRTL, 'متاح فقط لمدير النظام', 'Super Admin only'))}>
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{displayedEmail}</span>
                  {canSeePII
                    ? <Copy className="w-2.5 h-2.5 opacity-0 group-hover/cp:opacity-100 transition-opacity shrink-0" />
                    : <Lock className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                </button>
              )}
              {displayedPhone && (
                <button onClick={() => handleCopy(profile.phone!, pickBi(isRTL, 'الهاتف', 'Phone'))}
                  className={`flex items-center gap-1 text-[11px] tech-content transition-colors group/cp ${canSeePII ? 'text-muted-foreground hover:text-accent' : 'text-muted-foreground/70 cursor-not-allowed'}`}
                  title={canSeePII ? (pickBi(isRTL, 'نسخ الهاتف', 'Copy phone')) : (pickBi(isRTL, 'متاح فقط لمدير النظام', 'Super Admin only'))}>
                  <Phone className="w-3 h-3 shrink-0" />{displayedPhone}
                  {canSeePII
                    ? <Copy className="w-2.5 h-2.5 opacity-0 group-hover/cp:opacity-100 transition-opacity shrink-0" />
                    : <Lock className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                </button>
              )}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="w-3 h-3 shrink-0" />{formatDate(profile.created_at, language)}</span>
            </div>
            )}
            <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
              <Badge className={`${tier.color} text-[10px] border px-1.5 py-0`}>{isRTL ? tier.labelAr : tier.labelEn}</Badge>
              <Badge className={`${accType.color} text-[10px] border px-1.5 py-0 gap-0.5`}>
                <AccIcon className="w-2.5 h-2.5" />{isRTL ? accType.labelAr : accType.labelEn}
              </Badge>
              {profile.ref_id && (
                <button onClick={() => handleCopy(profile.ref_id, pickBi(isRTL, 'المعرّف', 'Ref ID'))}
                  title={pickBi(isRTL, 'نسخ المعرّف', 'Copy Ref ID')}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded-md border border-border/40 font-mono tech-content text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors">
                  <Hash className="w-2.5 h-2.5" />{profile.ref_id}
                </button>
              )}
              {roles.map(r => {
                const cfg = roleConfig[r.role as keyof typeof roleConfig] || roleConfig.user;
                const RIcon = cfg.icon;
                return (
                  <div key={r.id} className="flex items-center">
                    <Badge className={`${cfg.badge} gap-0.5 text-[10px] border px-1.5 py-0`}><RIcon className="w-2.5 h-2.5" />{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                    {!isCurrentUser && isSuperAdmin && (
                      <button onClick={() => onRemoveRole(r.id)} className="ms-0.5 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {roles.length === 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-dashed"><Shield className="w-2.5 h-2.5 me-0.5" />{pickBi(isRTL, 'عضو عادي', 'Member')}</Badge>
              )}
            </div>
            {businessLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {businessLinks.length >= 4 && (
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 border-warning/50 bg-warning/10 text-warning dark:text-warning">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {isRTL ? `مرتبط بـ ${businessLinks.length} منشآت` : `${businessLinks.length} businesses`}
                  </Badge>
                )}
                {businessLinks.map(link => {
                  const biz = link.business;
                  const cfg = staffRoleConfig[link.role];
                  return (
                    <Badge key={biz.id + (link.staffId ?? 'o')} variant="outline"
                      className={`text-[10px] gap-1 px-1.5 py-0.5 bg-success/5 border-success/30 ${!link.isActive ? 'opacity-60' : ''}`}
                      title={`${isRTL ? cfg.ar : cfg.en} • ${biz.ref_id}`}>
                      <Building2 className="w-2.5 h-2.5 text-success" />
                      <span className="truncate max-w-[120px]">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                      <span className="font-mono text-success tech-content">{biz.ref_id}</span>
                      <span className={`text-[9px] px-1 rounded ${cfg.color} border-0`}>
                        {isRTL ? cfg.ar : cfg.en}
                      </span>
                      {biz.is_verified && <Check className="w-2.5 h-2.5 text-success" />}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onToggleExpand} aria-label="Move up">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </TooltipTrigger><TooltipContent>{pickBi(isRTL, 'التفاصيل', 'Details')}</TooltipContent></Tooltip>
            <UserRowActions
              isRTL={isRTL}
              isBanned={isBanned}
              onView={() => onView(profile)}
              onEdit={() => onEdit(profile)}
              onPassword={canManageUser && isSuperAdmin ? () => onPassword(profile) : undefined}
              onToggleActive={canManageUser ? () => onToggleBan(profile) : undefined}
              onDelete={canManageUser ? () => onDelete(profile) : undefined}
            />
            {isSuperAdmin && (addingRole ? (
              <div className="flex items-center gap-1">
                <Select value={pickedRole} onValueChange={setPickedRole}>
                  <SelectTrigger className="h-8 w-28 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{pickBi(isRTL, 'مشرف أعلى', 'Super Admin')}</SelectItem>
                    <SelectItem value="admin">{pickBi(isRTL, 'مشرف', 'Admin')}</SelectItem>
                    <SelectItem value="moderator">{pickBi(isRTL, 'مشرف محتوى', 'Moderator')}</SelectItem>
                    <SelectItem value="user">{pickBi(isRTL, 'مستخدم', 'User')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => { onAddRole(profile.user_id, pickedRole); setAddingRole(false); }}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setAddingRole(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setAddingRole(true)} aria-label="Add user">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger><TooltipContent>{pickBi(isRTL, 'إضافة صلاحية', 'Add Role')}</TooltipContent></Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
      {expanded && (
        <UserDetailPanel
          userId={profile.user_id}
          profile={profile}
          isRTL={isRTL}
          businessLinks={businessLinks}
          isSuperAdmin={isSuperAdmin}
          onChangeStaffRole={onChangeStaffRole}
          onRemoveStaff={onRemoveStaff}
        />
      )}
    </div>
  );
});
UserListRow.displayName = 'UserListRow';

export default UserListRow;