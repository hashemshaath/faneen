import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Phone, Calendar, Hash, Building2, FileText, Inbox,
  Star, MessageSquare, Shield, Crown, ShieldCheck, ShieldAlert, Loader2,
  Briefcase, Users, ExternalLink, Pencil,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getProfileByUserId } from '@/modules/users';
import { listUserRolesFor } from '@/modules/identity';
import { listAdminBusinesses } from '@/modules/businesses';
import { listContractsForUserParticipant } from '@/modules/contracts';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const roleBadge: Record<string, { ar: string; en: string; icon: React.ElementType; cls: string }> = {
  super_admin: { ar: 'مشرف أعلى', en: 'Super Admin', icon: ShieldAlert, cls: 'bg-secondary/10 text-secondary border-secondary/30' },
  admin:       { ar: 'مشرف',       en: 'Admin',       icon: Crown,       cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  moderator:   { ar: 'مشرف محتوى', en: 'Moderator',   icon: ShieldCheck, cls: 'bg-warning/10 text-warning border-warning/30' },
  user:        { ar: 'مستخدم',     en: 'User',        icon: Shield,      cls: 'bg-muted text-muted-foreground border-border' },
};

const accountTypeLbl: Record<string, { ar: string; en: string }> = {
  individual: { ar: 'فرد', en: 'Individual' },
  business:   { ar: 'مزود خدمة', en: 'Provider' },
  company:    { ar: 'شركة', en: 'Company' },
};

interface BizRow {
  id: string; ref_id: string | null; legacy_ref_id: string | null; name_ar: string | null; name_en: string | null;
  username: string | null; is_verified: boolean | null; is_active: boolean | null;
  membership_tier: string | null; approval_status: string | null;
}

const AdminUserDetail: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const { isRTL } = useLanguage();
  useNoIndex();
  usePageMeta({ title: isRTL ? 'تفاصيل المستخدم | إدارة قِطاعات' : 'User Detail | Qitaat Admin', noindex: true });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-user-detail-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getProfileByUserId<Profile>({ userId: userId!, select: '*' });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-user-detail-roles', userId],
    enabled: !!userId,
    queryFn: async () => {
      return await listUserRolesFor(userId!);
    },
  });

  const { data: businesses = [] } = useQuery<BizRow[]>({
    queryKey: ['admin-user-detail-bizs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BizRow>({
        select: 'id, ref_id, legacy_ref_id, name_ar, name_en, username, is_verified, is_active, membership_tier, approval_status',
        filters: [{ column: 'user_id', op: 'eq', value: userId! }],
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['admin-user-detail-contracts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await listContractsForUserParticipant<{
        id: string; contract_ref: string | null; status: string | null; total_amount: number | null;
        currency: string | null; created_at: string;
      }>({
        userId: userId!,
        select: 'id, contract_ref, status, total_amount, currency, created_at',
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leadRequests = [] } = useQuery({
    queryKey: ['admin-user-detail-leads', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_requests')
        .select('id, status, subject, created_at, name')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as Array<{
        id: string; status: string | null; subject: string | null;
        created_at: string; name: string | null;
      }>;
    },
  });

  const stats = useMemo(() => ([
    { label: isRTL ? 'المنشآت' : 'Businesses',     val: businesses.length, icon: Building2, color: 'text-success bg-success/10' },
    { label: isRTL ? 'العقود' : 'Contracts',       val: contracts.length,  icon: FileText,  color: 'text-info bg-info/10' },
    { label: isRTL ? 'الطلبات' : 'Lead Requests',  val: leadRequests.length, icon: Inbox,   color: 'text-warning bg-warning/10' },
    { label: isRTL ? 'الصلاحيات' : 'Roles',        val: roles.length,      icon: Shield,    color: 'text-accent bg-accent/10' },
  ]), [businesses, contracts, leadRequests, roles, isRTL]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin me-2" />
          {isRTL ? 'جارِ التحميل…' : 'Loading…'}
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle>{isRTL ? 'المستخدم غير موجود' : 'User not found'}</CardTitle></CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/admin/users"><ArrowLeft className="w-4 h-4 me-1" />{isRTL ? 'رجوع' : 'Back'}</Link></Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const acct = accountTypeLbl[profile.account_type] ?? accountTypeLbl.individual;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link to="/admin/users" aria-label={isRTL ? 'رجوع' : 'Back'}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Avatar className="w-14 h-14 ring-2 ring-border/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold">
                {(profile.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-heading truncate">
                {profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="text-[10px] tech-content"><Hash className="w-2.5 h-2.5 me-0.5" />{profile.ref_id}</Badge>
                <Badge variant="outline" className="text-[10px]"><Briefcase className="w-2.5 h-2.5 me-0.5" />{isRTL ? acct.ar : acct.en}</Badge>
                <Badge variant="outline" className="text-[10px]">{profile.membership_tier ?? 'free'}</Badge>
                {profile.is_banned && <Badge variant="destructive" className="text-[10px]">{isRTL ? 'معطّل' : 'Disabled'}</Badge>}
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
            <Link to={`/admin/users?focus=${profile.user_id}`}><Pencil className="w-4 h-4" />{isRTL ? 'تعديل' : 'Edit'}</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-border/30 bg-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold tech-content leading-none">{s.val}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Profile info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{isRTL ? 'بيانات الحساب' : 'Account info'}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />{isRTL ? 'البريد' : 'Email'}</p><p className="font-medium break-all">{profile.email || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />{isRTL ? 'الهاتف' : 'Phone'}</p><p className="font-medium tech-content">{profile.phone || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />{isRTL ? 'تاريخ التسجيل' : 'Joined'}</p><p className="font-medium tech-content">{new Date(profile.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en')}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">{isRTL ? 'مكتمل التسجيل' : 'Onboarded'}</p><p className="font-medium">{profile.is_onboarded ? '✓' : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">{isRTL ? 'الهاتف موثق' : 'Phone verified'}</p><p className="font-medium">{profile.phone_verified ? '✓' : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">{isRTL ? 'الصلاحيات' : 'Roles'}</p>
                <div className="flex flex-wrap gap-1">
                  {roles.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                  {roles.map((r) => {
                    const cfg = roleBadge[r.role] ?? roleBadge.user;
                    const I = cfg.icon;
                    return <Badge key={r.id} variant="outline" className={`text-[10px] ${cfg.cls}`}><I className="w-2.5 h-2.5 me-0.5" />{isRTL ? cfg.ar : cfg.en}</Badge>;
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Businesses */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />{isRTL ? 'المنشآت المرتبطة' : 'Linked businesses'} ({businesses.length})</CardTitle></CardHeader>
          <CardContent>
            {businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد منشآت' : 'No linked businesses.'}</p>
            ) : (
              <div className="space-y-2">
                {businesses.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover-lift">
                    <Building2 className="w-4 h-4 text-success shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                      <p className="text-[11px] text-muted-foreground tech-content">{b.ref_id} • {b.username} • {b.membership_tier} • {b.approval_status}</p>
                    </div>
                    {b.is_verified && <Badge variant="outline" className="text-[10px] border-success/40 text-success">✓ {isRTL ? 'موثّق' : 'Verified'}</Badge>}
                    {b.username && (
                      <Button asChild size="sm" variant="ghost" className="rounded-xl">
                        <Link to={`/${b.username}`} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{isRTL ? 'العقود' : 'Contracts'} ({contracts.length})</CardTitle></CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد عقود' : 'No contracts.'}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {contracts.slice(0, 50).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 text-sm">
                    <FileText className="w-4 h-4 text-info shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium tech-content">{c.contract_ref || c.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en')}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.status ?? '—'}</Badge>
                    {c.total_amount != null && (
                      <span className="text-xs tech-content text-muted-foreground">{c.total_amount} {c.currency ?? 'SAR'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead requests */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Inbox className="w-4 h-4 text-primary" />{isRTL ? 'طلبات الخدمة' : 'Service requests'} ({leadRequests.length})</CardTitle></CardHeader>
          <CardContent>
            {leadRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات' : 'No requests.'}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {leadRequests.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 text-sm">
                    <Inbox className="w-4 h-4 text-warning shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{l.name || (isRTL ? 'طلب' : 'Request')}</p>
                      <p className="text-[11px] text-muted-foreground">{l.subject ?? ''} • {new Date(l.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en')}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{l.status ?? '—'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />
        <p className="text-[11px] text-muted-foreground text-center">
          {isRTL ? 'تستخدم هذه الصفحة من قبل المشرفين فقط لعرض كامل بيانات المستخدم.' : 'Admin-only view of all user data.'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminUserDetail;
