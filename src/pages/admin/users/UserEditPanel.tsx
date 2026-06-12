import React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Hash, Ban, X, Pencil, Shield, Building2, ShieldOff, Mail, Lock, Briefcase, Crown,
  Check, Loader2, UserPlus, Link2, Plus, Calendar, Timer, UserCheck, AlertTriangle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { pickBi } from '@/components/common/Bilingual';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import { PhoneField } from '@/components/forms/PhoneField';
import type { Tables } from '@/integrations/supabase/types';
import {
  formatDate, EmailLiveHint,
  type BusinessInfo, type BusinessLink, type StaffRole,
  type EditUserForm, type EditFieldErrors, type EditFieldRawCodes,
  type UsernameServerError, type SuspendForm, type LinkForm,
} from './_shared';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

type AccountTypeCfg = { labelAr: string; labelEn: string; icon: React.ElementType; color: string };
type TierCfg = { labelAr: string; labelEn: string; color: string };
type RoleCfg = { icon: React.ElementType; iconBg: string; labelAr: string; labelEn: string; rank: number; badge: string };
type StaffRoleCfg = { ar: string; en: string; color: string };

type SystemRoleKey = 'super_admin' | 'admin' | 'moderator' | 'user';

type PendingMut = { isPending: boolean };
type MutById<T = string> = PendingMut & { mutate: (id: T) => void };
type MutVars<T> = PendingMut & { mutate: (vars: T) => void };

export interface UserEditPanelProps {
  panelRef: React.Ref<HTMLDivElement>;
  isRTL: boolean;
  language: string;
  isSuperAdmin: boolean;
  currentUserId: string | undefined;

  editingProfile: Profile;
  editingRoles: UserRole[];
  editingLinks: BusinessLink[];
  businesses: BusinessInfo[];

  accountTypeConfig: Record<string, AccountTypeCfg>;
  tierConfig: Record<string, TierCfg>;
  roleConfig: Record<SystemRoleKey, RoleCfg>;
  staffRoleConfig: Record<StaffRole, StaffRoleCfg>;

  editForm: EditUserForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditUserForm>>;
  editFieldErrors: EditFieldErrors;
  editFieldRawCodes: EditFieldRawCodes;
  clearEditFieldError: (key: keyof EditFieldErrors) => void;
  usernameServerError: UsernameServerError | null;

  suspendForm: SuspendForm;
  setSuspendForm: React.Dispatch<React.SetStateAction<SuspendForm>>;
  linkForm: LinkForm;
  setLinkForm: React.Dispatch<React.SetStateAction<LinkForm>>;
  linkSearch: string;
  setLinkSearch: (v: string) => void;

  closePanel: () => void;
  handleSaveProfile: () => void;

  updateProfileMutation: PendingMut;
  removeRoleMutation: MutById<string>;
  addRoleMutation: MutVars<{ userId: string; role: SystemRoleKey }>;
  updateStaffRoleMutation: MutVars<{ staffId: string; role: StaffRole }>;
  removeStaffMutation: MutById<string>;
  linkBusinessMutation: MutVars<{ businessId: string; userId: string; role: StaffRole }>;
  suspendMutation: MutVars<{ profileId: string; mode: 'temporary' | 'permanent'; until: string | null; reason: string }>;
  toggleBanMutation: MutVars<{ profileId: string; isBanned: boolean }>;
}

/**
 * PR-6a — inline panel rendered when the admin opens a row for editing.
 * Owns the four-tab shell (Profile, Permissions, Linked Businesses,
 * Suspension). All state and mutations stay in the parent (`AdminUsers`)
 * so the `?focus=…` URL effect and `updateProfileMutation.onError` paths
 * keep working unchanged — this component is a controlled view.
 */
export const UserEditPanel: React.FC<UserEditPanelProps> = ({
  panelRef, isRTL, language, isSuperAdmin, currentUserId,
  editingProfile, editingRoles, editingLinks, businesses,
  accountTypeConfig, tierConfig, roleConfig, staffRoleConfig,
  editForm, setEditForm, editFieldErrors, editFieldRawCodes, clearEditFieldError, usernameServerError,
  suspendForm, setSuspendForm, linkForm, setLinkForm, linkSearch, setLinkSearch,
  closePanel, handleSaveProfile,
  updateProfileMutation, removeRoleMutation, addRoleMutation,
  updateStaffRoleMutation, removeStaffMutation, linkBusinessMutation,
  suspendMutation, toggleBanMutation,
}) => {
  const editingAcc = accountTypeConfig[editingProfile.account_type] || accountTypeConfig.individual;
  const EditAccIcon = editingAcc.icon;
  const editingTier = tierConfig[editingProfile.membership_tier as keyof typeof tierConfig] || tierConfig.free;
  const ownedByEntityCount = editingLinks.filter(l => l.isOwnerByEntity).length;
  const staffCount = editingLinks.filter(l => !l.isOwnerByEntity && l.staffId).length;
  const availableRolesToAdd = (['super_admin', 'admin', 'moderator', 'user'] as const)
    .filter(r => !editingRoles.some(er => er.role === r));

  return (
    <div ref={panelRef} className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 via-card to-transparent shadow-lg animate-in slide-in-from-top-2 scroll-mt-24 overflow-hidden">
      {/* Premium header */}
      <div className="relative p-5 border-b border-border/40 bg-gradient-to-l from-accent/10 via-transparent to-transparent">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-12 h-12 ring-2 ring-accent/20 shrink-0">
              <AvatarImage src={editingProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold">
                {(editingProfile.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-base sm:text-lg truncate">
                  {editingProfile.full_name || (pickBi(isRTL, 'بدون اسم', 'No name'))}
                </h3>
                {editingProfile.ref_id && (
                  <Badge variant="outline" className="font-mono text-[10px] tech-content gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{editingProfile.ref_id}
                  </Badge>
                )}
                {editingProfile.is_banned && (
                  <Badge variant="destructive" className="text-[10px] gap-0.5 px-1.5 py-0">
                    <Ban className="w-2.5 h-2.5" />{pickBi(isRTL, 'معطّل', 'Disabled')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`${editingAcc.color} text-[10px] border px-1.5 py-0 gap-0.5`}>
                  <EditAccIcon className="w-2.5 h-2.5" />
                  {isRTL ? editingAcc.labelAr : editingAcc.labelEn}
                </Badge>
                <Badge className={`${editingTier.color} text-[10px] border px-1.5 py-0`}>
                  {isRTL ? editingTier.labelAr : editingTier.labelEn}
                </Badge>
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />{formatDate(editingProfile.created_at, language)}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl shrink-0" aria-label="Edit">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="px-5 pt-4">
          <TabsList className="grid w-full grid-cols-4 h-10 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="profile" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Pencil className="w-3.5 h-3.5" />
              {pickBi(isRTL, 'البيانات', 'Profile')}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              {pickBi(isRTL, 'الصلاحيات', 'Permissions')}
              {editingRoles.length > 0 && (
                <span className="ms-0.5 px-1.5 py-0 rounded-full bg-accent/15 text-accent text-[10px] font-bold tech-content">{editingRoles.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="businesses" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Building2 className="w-3.5 h-3.5" />
              {pickBi(isRTL, 'الجهات', 'Businesses')}
              {editingLinks.length > 0 && (
                <span className="ms-0.5 px-1.5 py-0 rounded-full bg-success/15 text-success text-[10px] font-bold tech-content">{editingLinks.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suspension" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ShieldOff className="w-3.5 h-3.5" />
              {pickBi(isRTL, 'الإيقاف', 'Suspension')}
              {editingProfile.is_banned && (
                <span className="ms-0.5 px-1.5 py-0 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold tech-content">!</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Profile tab ── */}
        <TabsContent value="profile" className="p-5 pt-4 m-0 space-y-4">
           <div data-field-error="full_name_ar">
             <div data-field-error="full_name_en">
               <div data-field-error="username">
                 <BilingualNameField
                   value={{ full_name_ar: editForm.full_name_ar, full_name_en: editForm.full_name_en, username: editForm.username }}
                   onChange={(v) => {
                     setEditForm(p => ({ ...p, full_name_ar: v.full_name_ar, full_name_en: v.full_name_en, username: v.username || '' }));
                     if (editFieldErrors.full_name_ar) clearEditFieldError('full_name_ar');
                     if (editFieldErrors.full_name_en) clearEditFieldError('full_name_en');
                     if (editFieldErrors.username) clearEditFieldError('username');
                   }}
                   onFullNameChange={(f) => setEditForm(p => ({ ...p, full_name: f }))}
                    excludeUserId={editingProfile.user_id}
                    onUsernameValidChange={(s) => {
                      if (s.isValid && s.isAvailable && editFieldErrors.username) clearEditFieldError('username');
                    }}
                    usernameServerError={usernameServerError}
                   errors={{
                     full_name_ar: editFieldErrors.full_name_ar,
                     full_name_en: editFieldErrors.full_name_en,
                     username: editFieldErrors.username,
                   }}
                   required
                 />
               </div>
             </div>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isSuperAdmin ? (
              <>
                <div className="space-y-1.5" data-field-error="email">
                  <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{pickBi(isRTL, 'البريد الإلكتروني', 'Email')}</Label>
                  <EmailLiveHint value={editForm.email} isRTL={isRTL} />
                  <Input
                    type="email" dir="ltr"
                    value={editForm.email}
                    onChange={e => {
                      setEditForm(p => ({ ...p, email: e.target.value }));
                      if (editFieldErrors.email) clearEditFieldError('email');
                    }}
                    maxLength={255}
                    className={`h-10 rounded-xl tech-content ${editFieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {editFieldErrors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 flex-wrap">
                      <span>{editFieldErrors.email}</span>
                      {editFieldRawCodes.email && (
                        <code className="tech-content text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20">
                          {editFieldRawCodes.email}
                        </code>
                      )}
                    </p>
                  )}
                </div>
                <div data-field-error="phone">
                  <PhoneField
                    value={{ countryCode: editForm.phone_country_code, national: editForm.phone_national }}
                    onChange={(v) => {
                      setEditForm(p => ({ ...p, phone_country_code: v.countryCode, phone_national: v.national }));
                      if (editFieldErrors.phone) clearEditFieldError('phone');
                    }}
                    onE164Change={(e164) => setEditForm(p => ({ ...p, phone: e164 }))}
                    optional
                    error={editFieldErrors.phone}
                  />
                  {editFieldRawCodes.phone && (
                    <p className="mt-1 text-[10px] text-destructive/80 flex items-center gap-1.5">
                      <code className="tech-content px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20">
                        {editFieldRawCodes.phone}
                      </code>
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="md:col-span-1 rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
                <span>{pickBi(isRTL, 'تعديل البريد والهاتف متاح فقط لمدير النظام (Super Admin).', 'Email & phone editing is restricted to Super Admins.')}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" />{pickBi(isRTL, 'نوع الحساب', 'Account Type')}</Label>
              <Select value={editForm.account_type} onValueChange={v => setEditForm(p => ({ ...p, account_type: v }))}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{pickBi(isRTL, 'فرد', 'Individual')}</SelectItem>
                  <SelectItem value="business">{pickBi(isRTL, 'مزود خدمة', 'Provider')}</SelectItem>
                  <SelectItem value="company">{pickBi(isRTL, 'شركة', 'Company')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Crown className="w-3 h-3" />{pickBi(isRTL, 'العضوية', 'Membership Tier')}</Label>
              <Select value={editForm.membership_tier} onValueChange={v => setEditForm(p => ({ ...p, membership_tier: v }))}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{pickBi(isRTL, 'مجاني', 'Free')}</SelectItem>
                  <SelectItem value="basic">{pickBi(isRTL, 'أساسي', 'Basic')}</SelectItem>
                  <SelectItem value="premium">{pickBi(isRTL, 'مميز', 'Premium')}</SelectItem>
                  <SelectItem value="enterprise">{pickBi(isRTL, 'مؤسسات', 'Enterprise')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-muted-foreground">
              {pickBi(isRTL, 'سيتم تسجيل أي تعديل في سجل النشاط الإداري.', 'All changes are logged in the admin activity log.')}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closePanel} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
              <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="rounded-xl gap-2">
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {pickBi(isRTL, 'حفظ التعديلات', 'Save Changes')}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Permissions tab ── */}
        <TabsContent value="permissions" className="p-5 pt-4 m-0 space-y-4">
          {!isSuperAdmin && (
            <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 text-warning" />
              {pickBi(isRTL, 'إدارة صلاحيات النظام متاحة فقط لمدير النظام (Super Admin).', 'System role management is restricted to Super Admins.')}
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {isRTL ? `الصلاحيات الحالية (${editingRoles.length})` : `Current roles (${editingRoles.length})`}
            </p>
            {editingRoles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-4 text-center">
                <Shield className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-[11px] text-muted-foreground">{pickBi(isRTL, 'لا توجد صلاحيات نظام مُسندة — عضو عادي.', 'No system roles assigned — regular member.')}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {editingRoles.map(r => {
                  const cfg = roleConfig[r.role as SystemRoleKey] || roleConfig.user;
                  const RIcon = cfg.icon;
                  const isSelf = currentUserId === editingProfile.user_id;
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl bg-card border border-border/30 px-3 py-2 hover-lift">
                      <div className={`w-7 h-7 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                        <RIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">{isRTL ? cfg.labelAr : cfg.labelEn}</p>
                        <p className="text-[10px] text-muted-foreground font-mono tech-content">{r.role}</p>
                      </div>
                      {isSuperAdmin && !isSelf ? (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => removeRoleMutation.mutate(r.id)}
                          disabled={removeRoleMutation.isPending}
                          className="h-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 gap-1 text-[11px]">
                          <X className="w-3.5 h-3.5" />
                          {pickBi(isRTL, 'إزالة', 'Revoke')}
                        </Button>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {isSuperAdmin && availableRolesToAdd.length > 0 && currentUserId !== editingProfile.user_id && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                {pickBi(isRTL, 'منح صلاحية إضافية', 'Grant additional role')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {availableRolesToAdd.map(rk => {
                  const cfg = roleConfig[rk];
                  const RIcon = cfg.icon;
                  return (
                    <Button
                      key={rk} variant="outline" size="sm"
                      onClick={() => addRoleMutation.mutate({ userId: editingProfile.user_id, role: rk })}
                      disabled={addRoleMutation.isPending}
                      className="h-9 rounded-xl gap-1.5 text-xs hover:border-accent/50 hover-lift">
                      <RIcon className="w-3.5 h-3.5" />
                      {isRTL ? cfg.labelAr : cfg.labelEn}
                      <span className="ms-0.5 text-muted-foreground">+</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Linked Businesses tab ── */}
        <TabsContent value="businesses" className="p-5 pt-4 m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/30 bg-card p-2.5">
              <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'الإجمالي', 'Total')}</p>
              <p className="text-lg font-bold tech-content">{editingLinks.length}</p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-2.5">
              <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'مالك', 'Owned')}</p>
              <p className="text-lg font-bold tech-content text-success">{ownedByEntityCount}</p>
            </div>
            <div className="rounded-xl border border-info/20 bg-info/5 p-2.5">
              <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'عضو فريق', 'Staff')}</p>
              <p className="text-lg font-bold tech-content text-info">{staffCount}</p>
            </div>
          </div>
          {editingLinks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-6 text-center">
              <Building2 className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">{pickBi(isRTL, 'هذا المستخدم غير مرتبط بأي منشأة بعد.', 'This user is not linked to any business yet.')}</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-auto pe-1">
              {editingLinks.map(link => {
                const cfg = staffRoleConfig[link.role];
                const lockedOwner = link.isOwnerByEntity;
                return (
                  <div key={link.business.id + (link.staffId ?? 'owner')}
                    className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 hover-lift transition-all
                      ${lockedOwner ? 'border-success/30 bg-success/5' : 'border-border/30'}
                      ${!link.isActive ? 'opacity-60' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                      ${lockedOwner ? 'bg-success/15 text-success' : 'bg-info/10 text-info'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold truncate">
                          {isRTL ? link.business.name_ar : (link.business.name_en || link.business.name_ar)}
                        </p>
                        {link.business.is_verified && (
                          <Check className="w-3 h-3 text-success shrink-0" />
                        )}
                        {!link.isActive && (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground border-dashed px-1 py-0">
                            {pickBi(isRTL, 'غير نشط', 'inactive')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Link to={`/admin/businesses?focus=${link.business.id}`}
                          className="text-[10px] font-mono tech-content text-success hover:underline inline-flex items-center gap-0.5">
                          <Hash className="w-2.5 h-2.5" />{link.business.ref_id}
                        </Link>
                        {link.business.username && (
                          <Link to={`/${link.business.username}`} target="_blank" rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-accent inline-flex items-center gap-0.5">
                            <Link2 className="w-2.5 h-2.5" />{pickBi(isRTL, 'فتح الصفحة', 'View')}
                          </Link>
                        )}
                      </div>
                    </div>
                    {isSuperAdmin && !lockedOwner && link.staffId ? (
                      <Select value={link.role} onValueChange={(v) => updateStaffRoleMutation.mutate({ staffId: link.staffId!, role: v as StaffRole })}>
                        <SelectTrigger className="h-8 w-28 text-[11px] rounded-lg shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">{pickBi(isRTL, 'مدير', 'Manager')}</SelectItem>
                          <SelectItem value="editor">{pickBi(isRTL, 'محرر', 'Editor')}</SelectItem>
                          <SelectItem value="viewer">{pickBi(isRTL, 'مشاهد', 'Viewer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`${cfg.color} text-[10px] border px-1.5 py-0.5 gap-0.5 shrink-0`}>
                        {isRTL ? cfg.ar : cfg.en}
                        {lockedOwner && <Lock className="w-2.5 h-2.5" />}
                      </Badge>
                    )}
                    {isSuperAdmin && !lockedOwner && link.staffId && (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => removeStaffMutation.mutate(link.staffId!)}
                        title={pickBi(isRTL, 'إزالة الصلاحية', 'Remove access')}
                        className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0" aria-label="Action">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Add new business link */}
          {isSuperAdmin && (() => {
            const linkedIds = new Set(editingLinks.map(l => l.business.id));
            const candidates = businesses
              .filter(b => !linkedIds.has(b.id))
              .filter(b => {
                const q = linkSearch.trim().toLowerCase();
                if (!q) return true;
                return (b.name_ar || '').toLowerCase().includes(q)
                  || (b.name_en || '').toLowerCase().includes(q)
                  || (b.ref_id || '').toLowerCase().includes(q)
                  || (b.username || '').toLowerCase().includes(q);
              })
              .slice(0, 50);
            return (
              <div className="rounded-xl border border-dashed border-accent/30 bg-accent/5 p-3 space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  {pickBi(isRTL, 'ربط منشأة جديدة بهذا المستخدم', 'Link a new business to this user')}
                </p>
                <Input
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder={pickBi(isRTL, 'ابحث بالاسم أو المعرّف أو @المعرّف', 'Search by name, ref, or @username')}
                  dir="auto"
                  className="h-9 rounded-lg text-xs"
                />
                <div className="flex items-center gap-2">
                  <Select value={linkForm.businessId} onValueChange={(v) => setLinkForm(p => ({ ...p, businessId: v }))}>
                    <SelectTrigger className="h-9 rounded-lg text-xs flex-1">
                      <SelectValue placeholder={pickBi(isRTL, 'اختر منشأة', 'Select a business')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {candidates.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          {pickBi(isRTL, 'لا توجد منشآت متاحة', 'No businesses available')}
                        </div>
                      ) : candidates.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="font-medium">{isRTL ? (b.name_ar || b.name_en) : (b.name_en || b.name_ar)}</span>
                          <span className="ms-2 font-mono tech-content text-[10px] text-muted-foreground">{b.ref_id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={linkForm.role} onValueChange={(v) => setLinkForm(p => ({ ...p, role: v as StaffRole }))}>
                    <SelectTrigger className="h-9 w-28 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{pickBi(isRTL, 'مدير', 'Manager')}</SelectItem>
                      <SelectItem value="editor">{pickBi(isRTL, 'محرر', 'Editor')}</SelectItem>
                      <SelectItem value="viewer">{pickBi(isRTL, 'مشاهد', 'Viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => linkBusinessMutation.mutate({
                      businessId: linkForm.businessId,
                      userId: editingProfile.user_id,
                      role: linkForm.role,
                    })}
                    disabled={!linkForm.businessId || linkBusinessMutation.isPending}
                    className="h-9 rounded-lg gap-1.5 text-xs">
                    {linkBusinessMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    {pickBi(isRTL, 'ربط', 'Link')}
                  </Button>
                </div>
              </div>
            );
          })()}
          <div className="flex items-center justify-end pt-2">
            <Button variant="outline" onClick={closePanel} className="rounded-xl">{pickBi(isRTL, 'إغلاق', 'Close')}</Button>
          </div>
        </TabsContent>

        {/* ── Suspension tab ── */}
        <TabsContent value="suspension" className="p-5 pt-4 m-0 space-y-4">
          {!isSuperAdmin && (
            <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 text-warning" />
              {pickBi(isRTL, 'إدارة الإيقاف متاحة فقط لمدير النظام (Super Admin).', 'Suspension is restricted to Super Admins.')}
            </div>
          )}
          {(() => {
            const bu = (editingProfile as Profile & { banned_until?: string | null }).banned_until ?? null;
            const reason = (editingProfile as Profile & { ban_reason?: string | null }).ban_reason ?? null;
            const isSelf = currentUserId === editingProfile.user_id;
            const disabled = !isSuperAdmin || isSelf || suspendMutation.isPending || toggleBanMutation.isPending;
            return (
              <>
                {/* Current status */}
                <div className={`rounded-xl border p-3 ${editingProfile.is_banned ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {editingProfile.is_banned ? <Ban className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-success" />}
                    <p className="text-xs font-bold">
                      {editingProfile.is_banned
                        ? (bu ? (pickBi(isRTL, 'موقوف مؤقتاً', 'Temporarily suspended')) : (pickBi(isRTL, 'موقوف دائماً', 'Permanently suspended')))
                        : (pickBi(isRTL, 'الحساب نشط', 'Account is active'))}
                    </p>
                  </div>
                  {editingProfile.is_banned && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      {bu && (
                        <p className="tech-content">
                          {pickBi(isRTL, 'ينتهي:', 'Ends:')} <span className="font-bold">{new Date(bu).toLocaleString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'))}</span>
                        </p>
                      )}
                      {reason && <p>{pickBi(isRTL, 'السبب:', 'Reason:')} <span className="font-medium">{reason}</span></p>}
                    </div>
                  )}
                </div>

                {/* Mode selector */}
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground mb-2 block">
                    {pickBi(isRTL, 'نوع الإيقاف', 'Suspension type')}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSuspendForm(p => ({ ...p, mode: 'temporary' }))}
                      className={`rounded-xl border p-3 text-start transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed
                        ${suspendForm.mode === 'temporary' ? 'border-warning/50 bg-warning/10 ring-2 ring-warning/20' : 'border-border/40 bg-card'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Timer className="w-4 h-4 text-warning" />
                        <p className="text-xs font-bold">{pickBi(isRTL, 'إيقاف مؤقت', 'Temporary')}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'يُرفع تلقائياً عند انتهاء المدة', 'Auto-lifts at expiry')}</p>
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSuspendForm(p => ({ ...p, mode: 'permanent' }))}
                      className={`rounded-xl border p-3 text-start transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed
                        ${suspendForm.mode === 'permanent' ? 'border-destructive/50 bg-destructive/10 ring-2 ring-destructive/20' : 'border-border/40 bg-card'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Ban className="w-4 h-4 text-destructive" />
                        <p className="text-xs font-bold">{pickBi(isRTL, 'إيقاف دائم', 'Permanent')}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pickBi(isRTL, 'يبقى حتى يقوم الأدمن برفعه', 'Until admin lifts it')}</p>
                    </button>
                  </div>
                </div>

                {/* Quick presets + custom datetime */}
                {suspendForm.mode === 'temporary' && (
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-muted-foreground">{pickBi(isRTL, 'مدة سريعة', 'Quick presets')}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: pickBi(isRTL, '1 ساعة', '1 hour'), ms: 3600_000 },
                        { label: pickBi(isRTL, '24 ساعة', '24 hours'), ms: 86400_000 },
                        { label: pickBi(isRTL, '7 أيام', '7 days'), ms: 7 * 86400_000 },
                        { label: pickBi(isRTL, '30 يوم', '30 days'), ms: 30 * 86400_000 },
                        { label: pickBi(isRTL, '90 يوم', '90 days'), ms: 90 * 86400_000 },
                      ].map(p => (
                        <Button key={p.label} type="button" variant="outline" size="sm" disabled={disabled}
                          onClick={() => setSuspendForm(s => ({ ...s, until: new Date(Date.now() + p.ms).toISOString().slice(0, 16) }))}
                          className="h-8 rounded-lg text-[11px]">
                          {p.label}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{pickBi(isRTL, 'ينتهي في', 'Ends at')}</Label>
                      <Input
                        type="datetime-local"
                        value={suspendForm.until}
                        min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                        onChange={(e) => setSuspendForm(p => ({ ...p, until: e.target.value }))}
                        disabled={disabled}
                        className="h-10 rounded-xl tech-content"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">{pickBi(isRTL, 'سبب الإيقاف (اختياري — يُسجَّل بالتدقيق)', 'Reason (optional — logged to audit)')}</Label>
                  <Input
                    value={suspendForm.reason}
                    onChange={(e) => setSuspendForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder={pickBi(isRTL, 'مثال: مخالفة سياسات النشر', 'e.g. policy violation')}
                    maxLength={200}
                    disabled={disabled}
                    dir="auto"
                    className="h-10 rounded-xl"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {editingProfile.is_banned ? (
                    <Button
                      variant="outline"
                      onClick={() => toggleBanMutation.mutate({ profileId: editingProfile.id, isBanned: false })}
                      disabled={disabled}
                      className="rounded-xl gap-2 text-success border-success/40 hover:bg-success/10">
                      {toggleBanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      {pickBi(isRTL, 'رفع الإيقاف الآن', 'Lift suspension')}
                    </Button>
                  ) : <span />}
                  <Button
                    onClick={() => {
                      if (suspendForm.mode === 'temporary') {
                        if (!suspendForm.until) {
                          toast.error(pickBi(isRTL, 'حدد تاريخ الانتهاء', 'Pick an end date'));
                          return;
                        }
                        const untilDate = new Date(suspendForm.until);
                        if (untilDate.getTime() <= Date.now()) {
                          toast.error(pickBi(isRTL, 'تاريخ الانتهاء يجب أن يكون في المستقبل', 'End date must be in the future'));
                          return;
                        }
                        suspendMutation.mutate({
                          profileId: editingProfile.id,
                          mode: 'temporary',
                          until: untilDate.toISOString(),
                          reason: suspendForm.reason,
                        });
                      } else {
                        suspendMutation.mutate({
                          profileId: editingProfile.id,
                          mode: 'permanent',
                          until: null,
                          reason: suspendForm.reason,
                        });
                      }
                    }}
                    disabled={disabled}
                    variant={suspendForm.mode === 'permanent' ? 'destructive' : 'default'}
                    className="rounded-xl gap-2">
                    {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (suspendForm.mode === 'permanent' ? <Ban className="w-4 h-4" /> : <Timer className="w-4 h-4" />)}
                    {suspendForm.mode === 'permanent'
                      ? (pickBi(isRTL, 'إيقاف دائم', 'Suspend permanently'))
                      : (pickBi(isRTL, 'إيقاف مؤقت', 'Suspend temporarily'))}
                  </Button>
                </div>
                {isSelf && (
                  <p className="text-[11px] text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {pickBi(isRTL, 'لا يمكنك إيقاف حسابك بنفسك.', 'You cannot suspend your own account.')}
                  </p>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

UserEditPanel.displayName = 'UserEditPanel';