import React, { useEffect, useState } from 'react';
import { User, CheckCircle, Search, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pickBi } from '@/components/common/Bilingual';
import { getProfileDisplayName } from '@/modules/profiles/utils/displayName';
import { searchProfilesByOr } from '@/modules/users';
import type { AdminBusinessOwnerRow } from '@/pages/admin/adminBusinesses.types';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Owner picker section of the inline Create Business panel.
 * Owns only local UI state (autocomplete dropdown) and the debounced
 * profile search; it never calls Supabase directly. The owner search
 * goes through the shared `searchProfilesByOr` helper used elsewhere.
 */
export const BusinessCreateOwnerSection = React.memo(function BusinessCreateOwnerSection({
  isRTL,
  form,
  setForm,
  setField,
}: BusinessCreateSectionProps) {
  const [ownerResults, setOwnerResults] = useState<AdminBusinessOwnerRow[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);

  useEffect(() => {
    const q = (form.owner_query || '').trim();
    if (q.length < 2) {
      setOwnerResults([]);
      setOwnerSearching(false);
      return;
    }
    if (form.resolved_user_id) return;
    setOwnerSearching(true);
    const handle = setTimeout(async () => {
      try {
        const like = `%${q.replace(/[%,]/g, '')}%`;
        const upper = q.toUpperCase();
        const lower = q.toLowerCase();
        const orParts = [
          `full_name.ilike.${like}`,
          `full_name_ar.ilike.${like}`,
          `full_name_en.ilike.${like}`,
          `email.ilike.${like}`,
          `username.ilike.${like}`,
          `ref_id.ilike.%${upper}%`,
        ].join(',');
        const { data, error } = await searchProfilesByOr<Record<string, unknown>>({
          or: orParts,
          select: 'user_id, full_name, full_name_ar, full_name_en, email, username, ref_id, avatar_url',
          limit: 8,
        });
        if (error) throw error;
        const rows = (data ?? []) as AdminBusinessOwnerRow[];
        rows.sort((a, b) => {
          const ax = (a.email === lower || a.username === lower || a.ref_id === upper) ? 0 : 1;
          const bx = (b.email === lower || b.username === lower || b.ref_id === upper) ? 0 : 1;
          return ax - bx;
        });
        setOwnerResults(rows);
        setOwnerOpen(true);
      } catch {
        setOwnerResults([]);
      } finally {
        setOwnerSearching(false);
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [form.owner_query, form.resolved_user_id]);

  return (
    <div className="rounded-xl border border-info/30 bg-info/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-info" />
        <Label className="text-xs font-semibold">
          {pickBi(isRTL, '1) المدير / المسؤول للمنشأة', '1) Entity manager / responsible person')}
        </Label>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
          {pickBi(isRTL, 'اختياري', 'Optional')}
        </span>
      </div>
      <p className="text-[10.5px] text-muted-foreground leading-relaxed">
        {pickBi(
          isRTL,
          'الافتراضي "بدون مدير" — تُربط المنشأة بالحساب المؤقت (com@qitaat.com) ويمكن لمالكها الحقيقي لاحقاً طلب نقل الملكية بموافقة الادمن. أو اختر مستخدماً موجوداً، أنشئ حساباً، أو أرسل دعوة بالبريد.',
          'Default is "No manager" — the entity is linked to the placeholder account (com@qitaat.com); its real owner can later request a transfer that an admin approves. You can also pick an existing user, create an account, or send an email invite.',
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-border/40 bg-card p-1">
        {([
          { id: 'placeholder', ar: 'بدون مدير', en: 'No manager' },
          { id: 'existing', ar: 'مستخدم موجود', en: 'Existing user' },
          { id: 'new',      ar: 'إنشاء حساب', en: 'New account' },
          { id: 'invite',   ar: 'دعوة بالبريد', en: 'Email invite' },
        ] as const).map((opt) => {
          const active = (form.owner_mode || 'placeholder') === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setField('owner_mode', opt.id)}
              className={`h-9 rounded-lg text-[11px] font-medium transition-all ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {isRTL ? opt.ar : opt.en}
            </button>
          );
        })}
      </div>

      {(form.owner_mode || 'placeholder') === 'placeholder' && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-foreground/80">
          {pickBi(
            isRTL,
            'ستُربط المنشأة بالحساب المؤقت المشترك. عندما يطلب المالك الحقيقي تسلّم منشأته يوافق الادمن لنقل الملكية إليه.',
            'The entity will be linked to the shared placeholder account. When the real owner requests it, an admin can approve to transfer ownership.',
          )}
        </div>
      )}

      {form.owner_mode === 'existing' && (
        form.resolved_user_id ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 text-success shrink-0" />
              <span className="text-xs font-medium truncate">{form.resolved_owner_label}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg"
              onClick={() => setForm((f) => ({ ...f, resolved_user_id: '', resolved_owner_label: '', owner_query: '' }))}>
              <X className="w-3 h-3 me-1" /> {pickBi(isRTL, 'تغيير', 'Change')}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <Input
                value={form.owner_query}
                onChange={(e) => { setField('owner_query', e.target.value); setOwnerOpen(true); }}
                onFocus={() => setOwnerOpen(true)}
                placeholder={pickBi(isRTL, 'ابحث بالاسم / البريد / اسم المستخدم / USR-1000001', 'Search by name / email / username / USR-1000001')}
                className="h-10 rounded-xl ps-9"
              />
              {ownerSearching && (
                <Loader2 className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 end-3 animate-spin text-muted-foreground" />
              )}
            </div>
            {ownerOpen && form.owner_query.trim().length >= 2 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
                {ownerResults.length === 0 && !ownerSearching ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    {pickBi(isRTL, 'لا توجد نتائج مطابقة', 'No matching users')}
                  </div>
                ) : (
                  ownerResults.map((u) => {
                    const displayName = getProfileDisplayName(u, {
                      locale: pickBi(isRTL, 'ar', 'en'),
                      emptyFallback: pickBi(isRTL, 'بدون اسم', 'No name'),
                    });
                    return (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            resolved_user_id: u.user_id,
                            resolved_owner_label: `${displayName}${u.ref_id ? ` (${u.ref_id})` : ''}${u.email ? ` · ${u.email}` : ''}`,
                            owner_error: '',
                          }));
                          setOwnerOpen(false);
                        }}
                        className="w-full text-start px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 border-b border-border/40 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{displayName}</div>
                          <div className="text-[10.5px] text-muted-foreground tech-content truncate flex items-center gap-2">
                            {u.ref_id && <span className="font-mono">{u.ref_id}</span>}
                            {u.username && <span>· @{u.username}</span>}
                            {u.email && <span className="truncate">· {u.email}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {form.owner_error && (
              <p className="text-[11px] text-destructive flex items-center gap-1.5 mt-1.5">
                <AlertTriangle className="w-3 h-3" /> {form.owner_error}
              </p>
            )}
          </div>
        )
      )}

      {form.owner_mode === 'new' && (
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الاسم الكامل للمسؤول', 'Manager full name')}</Label>
            <Input value={form.owner_full_name} onChange={(e) => setField('owner_full_name', e.target.value)} dir="auto" className="h-10 rounded-xl" placeholder={pickBi(isRTL, 'مثال: محمد العتيبي', 'e.g. Mohammed Al-Otaibi')} />
          </div>
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'المنصب', 'Position')}</Label>
            <Input value={form.owner_position} onChange={(e) => setField('owner_position', e.target.value)} dir="auto" className="h-10 rounded-xl" placeholder={pickBi(isRTL, 'مدير عام', 'General Manager')} />
          </div>
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'البريد (تسجيل الدخول)', 'Email (login)')}</Label>
            <Input value={form.owner_email} onChange={(e) => setField('owner_email', e.target.value.toLowerCase().trim())} dir="ltr" type="email" className="h-10 rounded-xl tech-content" placeholder="manager@company.com" />
          </div>
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'كلمة المرور (8+ أحرف)', 'Password (8+ chars)')}</Label>
            <Input value={form.owner_password} onChange={(e) => setField('owner_password', e.target.value)} dir="ltr" type="text" className="h-10 rounded-xl tech-content" placeholder="Tmp@2026!" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الجوال (اختياري)', 'Mobile (optional)')}</Label>
            <Input value={form.owner_phone} onChange={(e) => setField('owner_phone', e.target.value)} dir="ltr" className="h-10 rounded-xl tech-content" placeholder="+9665XXXXXXXX" />
          </div>
          <p className="sm:col-span-2 text-[10.5px] text-info bg-info/5 border border-info/20 rounded-lg px-3 py-2">
            {pickBi(
              isRTL,
              'سيتم إنشاء حساب جديد فوراً ببريد وكلمة المرور المُدخلَين، وسيكون هو مالك المنشأة. شارك بيانات الدخول مع المسؤول عبر قناة آمنة.',
              'A new account will be created instantly with the email and password provided, and will own this entity. Share login credentials with the manager via a secure channel.',
            )}
          </p>
        </div>
      )}

      {form.owner_mode === 'invite' && (
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الاسم الكامل للمسؤول', 'Manager full name')}</Label>
            <Input value={form.owner_full_name} onChange={(e) => setField('owner_full_name', e.target.value)} dir="auto" className="h-10 rounded-xl" />
          </div>
          <div>
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'المنصب', 'Position')}</Label>
            <Input value={form.owner_position} onChange={(e) => setField('owner_position', e.target.value)} dir="auto" className="h-10 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'البريد (سيُرسل عليه رابط التفعيل)', 'Email (activation link will be sent here)')}</Label>
            <Input value={form.owner_email} onChange={(e) => setField('owner_email', e.target.value.toLowerCase().trim())} dir="ltr" type="email" className="h-10 rounded-xl tech-content" placeholder="manager@company.com" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[10.5px] text-muted-foreground">{pickBi(isRTL, 'الجوال (اختياري)', 'Mobile (optional)')}</Label>
            <Input value={form.owner_phone} onChange={(e) => setField('owner_phone', e.target.value)} dir="ltr" className="h-10 rounded-xl tech-content" placeholder="+9665XXXXXXXX" />
          </div>
          <p className="sm:col-span-2 text-[10.5px] text-accent bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
            {pickBi(
              isRTL,
              'سيتم إنشاء الحساب وإرسال رابط تعيين كلمة المرور للمسؤول على بريده ليُكمل التفعيل بنفسه.',
              'The account will be created and a set-password link will be emailed to the manager so they can complete activation themselves.',
            )}
          </p>
        </div>
      )}
    </div>
  );
});