/**
 * ADMIN-IDENTITY-DIAGNOSTICS-DEEP-1
 * ─────────────────────────────────
 * Pure aggregator that converts already-fetched admin diagnostics inputs
 * into a severity-graded set of issue groups for /admin/identity.
 *
 * Pure & deterministic — no I/O, no mutations. Easy to unit-test.
 *
 * Severity model:
 *   critical  — data integrity broken or security invariant at risk
 *   warning   — operational inconsistency admins should review
 *   info      — non-blocking observations
 *   healthy   — no records in any other severity bucket
 *
 * NOTE: this module never re-emits raw PII it received. It passes through
 * `masked_email` values already produced server-side by
 * `admin_identity_integrity_report`, and never renders synthetic phone-login
 * emails. The UI layer additionally applies `maskEmail` / `maskPhone` for
 * non super-admin viewers.
 */

export type DiagnosticSeverity = 'critical' | 'warning' | 'info' | 'healthy';

export type DiagnosticGroupId =
  | 'identity_mismatches'
  | 'missing_profile_emails'
  | 'synthetic_test_emails'
  | 'super_admin_ownership_violations'
  | 'orphan_business_staff'
  | 'owner_staff_invariant_warnings'
  | 'duplicate_identity_candidates'
  | 'businesses_without_owner_staff'
  | 'businesses_without_primary_manager'
  | 'pending_invitations';

export interface DiagnosticRecord {
  key: string;
  label: string;
  hint?: string;
  href?: string;
  syncTargetUserId?: string;
}

export interface DiagnosticAction {
  id: 'open_user' | 'open_business' | 'review_owner' | 'sync_profile_email' | 'resolve_duplicate';
  label_ar: string;
  label_en: string;
  futureOnly?: boolean;
}

export interface DiagnosticGroup {
  id: DiagnosticGroupId;
  severity: DiagnosticSeverity;
  label_ar: string;
  label_en: string;
  description_ar: string;
  description_en: string;
  count: number;
  records: DiagnosticRecord[];
  actions: DiagnosticAction[];
}

export interface DiagnosticInputs {
  profiles: ReadonlyArray<{
    user_id: string;
    ref_id: string | null;
    email: string | null;
    full_name: string | null;
  }>;
  businesses: ReadonlyArray<{
    id: string;
    user_id: string;
    ref_id: string | null;
    name_ar: string | null;
    name_en: string | null;
  }>;
  roles: ReadonlyArray<{ user_id: string; role: string }>;
  staff: ReadonlyArray<{
    id: string;
    business_id: string | null;
    user_id: string | null;
    role: string | null;
    is_active: boolean;
    is_primary_manager: boolean | null;
  }>;
  integrity: ReadonlyArray<{
    user_id: string;
    masked_email: string;
    mismatch_type:
      | 'ok'
      | 'email_mismatch'
      | 'profile_missing_email'
      | 'no_email';
    synthetic_or_test: boolean;
  }>;
  duplicates: ReadonlyArray<{
    kind: 'email' | 'username' | 'phone' | 'auth_profile_email_mismatch';
    value: string;
    occurrences: number;
    user_ids: string[];
  }>;
  pendingInvitations?: number | null;
}

export interface DiagnosticsResult {
  groups: DiagnosticGroup[];
  totals: Record<DiagnosticSeverity, number>;
  isHealthy: boolean;
}

const A = {
  open_user: { id: 'open_user', label_ar: 'فتح المستخدم', label_en: 'Open user' } as DiagnosticAction,
  open_business: { id: 'open_business', label_ar: 'فتح المنشأة', label_en: 'Open business' } as DiagnosticAction,
  review_owner: { id: 'review_owner', label_ar: 'مراجعة المالك', label_en: 'Review owner' } as DiagnosticAction,
  sync_profile_email: { id: 'sync_profile_email', label_ar: 'مزامنة بريد الملف', label_en: 'Sync profile email' } as DiagnosticAction,
  resolve_duplicate: { id: 'resolve_duplicate', label_ar: 'حلّ التكرار (لاحقًا)', label_en: 'Resolve duplicate (later)', futureOnly: true } as DiagnosticAction,
};

function bizDisplay(b: { ref_id: string | null; name_ar: string | null; name_en: string | null }): string {
  return (b.name_en || b.name_ar) || b.ref_id || '—';
}

function isSyntheticEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@phone\.qitaat\.local$/i.test(value);
}

export function computeIdentityDiagnostics(inputs: DiagnosticInputs): DiagnosticsResult {
  const profileByUser = new Map(inputs.profiles.map((p) => [p.user_id, p]));
  const bizById = new Map(inputs.businesses.map((b) => [b.id, b]));
  const superAdminUserIds = new Set(
    inputs.roles.filter((r) => r.role === 'super_admin').map((r) => r.user_id),
  );

  const groups: DiagnosticGroup[] = [];

  // critical: identity mismatches
  const mm = inputs.integrity.filter((r) => r.mismatch_type === 'email_mismatch');
  groups.push({
    id: 'identity_mismatches',
    severity: mm.length ? 'critical' : 'healthy',
    label_ar: 'تعارض بريد تسجيل الدخول والملف',
    label_en: 'Login vs profile email mismatch',
    description_ar: 'بريد تسجيل الدخول لا يطابق البريد المخزّن في الملف الشخصي.',
    description_en: 'Auth email does not match the email stored on the profile.',
    count: mm.length,
    records: mm.map((r) => {
      const p = profileByUser.get(r.user_id);
      return {
        key: `mm-${r.user_id}`,
        label: r.masked_email || (p?.ref_id ?? r.user_id.slice(0, 8)),
        hint: p?.ref_id ?? undefined,
        href: `/admin/users?focus=${r.user_id}`,
        syncTargetUserId: r.user_id,
      };
    }),
    actions: [A.open_user, A.sync_profile_email],
  });

  // critical: super-admin ownership violations
  const violations = inputs.businesses.filter((b) => superAdminUserIds.has(b.user_id));
  groups.push({
    id: 'super_admin_ownership_violations',
    severity: violations.length ? 'critical' : 'healthy',
    label_ar: 'محاولات ملكية كيان من حساب سوبر أدمن',
    label_en: 'Super-admin entity ownership violations',
    description_ar: 'حسابات السوبر أدمن مستقلة ولا يجوز ربطها بأي منشأة.',
    description_en: 'Super-admin accounts must remain standalone and never own a business entity.',
    count: violations.length,
    records: violations.map((b) => ({
      key: `sa-${b.id}`,
      label: bizDisplay(b),
      hint: b.ref_id ?? undefined,
      href: `/admin/businesses?focus=${b.id}`,
    })),
    actions: [A.open_business, A.review_owner],
  });

  // critical: duplicate identity candidates
  groups.push({
    id: 'duplicate_identity_candidates',
    severity: inputs.duplicates.length ? 'critical' : 'healthy',
    label_ar: 'تكرارات في الهوية',
    label_en: 'Duplicate identity candidates',
    description_ar: 'قيم بريد/مستخدم/هاتف مكررة بين الحسابات — تحتاج مراجعة يدوية.',
    description_en: 'Duplicate email/username/phone values across accounts — require manual review.',
    count: inputs.duplicates.length,
    records: inputs.duplicates.slice(0, 50).map((d, i) => ({
      key: `dup-${d.kind}-${i}`,
      label: `${d.kind} • ×${d.occurrences}`,
      hint: d.value,
    })),
    actions: [A.resolve_duplicate],
  });

  // warning: missing profile emails
  const me = inputs.integrity.filter(
    (r) => r.mismatch_type === 'profile_missing_email' || r.mismatch_type === 'no_email',
  );
  groups.push({
    id: 'missing_profile_emails',
    severity: me.length ? 'warning' : 'healthy',
    label_ar: 'حسابات بدون بريد رسمي',
    label_en: 'Accounts missing official email',
    description_ar: 'لا يوجد بريد قابل للتسليم — يجب اعتماد إشعارات داخل التطبيق.',
    description_en: 'No deliverable email on file — fall back to in-app notifications.',
    count: me.length,
    records: me.map((r) => ({
      key: `me-${r.user_id}`,
      label: r.masked_email || r.user_id.slice(0, 8),
      href: `/admin/users?focus=${r.user_id}`,
      syncTargetUserId: r.mismatch_type === 'profile_missing_email' ? r.user_id : undefined,
    })),
    actions: [A.open_user, A.sync_profile_email],
  });

  // warning: orphan business_staff
  const orphan = inputs.staff.filter(
    (s) => s.is_active && (!s.business_id || !s.user_id || !bizById.has(s.business_id ?? '')),
  );
  groups.push({
    id: 'orphan_business_staff',
    severity: orphan.length ? 'warning' : 'healthy',
    label_ar: 'صفوف فريق يتيمة',
    label_en: 'Orphan business_staff rows',
    description_ar: 'صفوف فريق نشطة بدون منشأة أو مستخدم مرتبط.',
    description_en: 'Active staff rows without a linked business or user.',
    count: orphan.length,
    records: orphan.slice(0, 50).map((s) => ({
      key: `os-${s.id}`,
      label: s.role ?? 'staff',
      hint: `biz=${s.business_id ?? '∅'} • user=${s.user_id ? s.user_id.slice(0, 8) : '∅'}`,
    })),
    actions: [A.review_owner],
  });

  // warning: owner not primary manager
  const ownerInv: DiagnosticRecord[] = [];
  for (const b of inputs.businesses) {
    if (!b.user_id) continue;
    const ownerStaff = inputs.staff.find(
      (s) => s.business_id === b.id && s.user_id === b.user_id && s.role === 'owner' && s.is_active,
    );
    if (ownerStaff && ownerStaff.is_primary_manager !== true) {
      ownerInv.push({
        key: `oi-${b.id}`,
        label: bizDisplay(b),
        hint: b.ref_id ?? undefined,
        href: `/admin/businesses?focus=${b.id}`,
      });
    }
  }
  groups.push({
    id: 'owner_staff_invariant_warnings',
    severity: ownerInv.length ? 'warning' : 'healthy',
    label_ar: 'مالك ليس المدير الأساسي',
    label_en: 'Owner is not the primary manager',
    description_ar: 'يوجد صف مالك نشط لكنه ليس معلَّمًا كمدير أساسي.',
    description_en: 'Active owner staff row exists but is not flagged as primary manager.',
    count: ownerInv.length,
    records: ownerInv.slice(0, 50),
    actions: [A.open_business, A.review_owner],
  });

  // warning: businesses without active owner staff
  const noOwner: DiagnosticRecord[] = [];
  for (const b of inputs.businesses) {
    if (!b.user_id) continue;
    const has = inputs.staff.some(
      (s) => s.business_id === b.id && s.user_id === b.user_id && s.role === 'owner' && s.is_active,
    );
    if (!has) {
      noOwner.push({
        key: `no-owner-${b.id}`,
        label: bizDisplay(b),
        hint: b.ref_id ?? undefined,
        href: `/admin/businesses?focus=${b.id}`,
      });
    }
  }
  groups.push({
    id: 'businesses_without_owner_staff',
    severity: noOwner.length ? 'warning' : 'healthy',
    label_ar: 'منشآت بدون صف مالك نشط',
    label_en: 'Businesses without active owner staff row',
    description_ar: 'المالك المسجّل لا يملك صفًا نشطًا في فريق المنشأة.',
    description_en: 'Registered owner has no active row in the business staff table.',
    count: noOwner.length,
    records: noOwner.slice(0, 50),
    actions: [A.open_business, A.review_owner],
  });

  // warning: businesses without primary manager
  const noPm: DiagnosticRecord[] = [];
  for (const b of inputs.businesses) {
    const has = inputs.staff.some(
      (s) => s.business_id === b.id && s.is_active && s.is_primary_manager === true,
    );
    if (!has) {
      noPm.push({
        key: `no-pm-${b.id}`,
        label: bizDisplay(b),
        hint: b.ref_id ?? undefined,
        href: `/admin/businesses?focus=${b.id}`,
      });
    }
  }
  groups.push({
    id: 'businesses_without_primary_manager',
    severity: noPm.length ? 'warning' : 'healthy',
    label_ar: 'منشآت بدون مدير أساسي',
    label_en: 'Businesses without a primary manager',
    description_ar: 'لا يوجد عضو فريق نشط معلَّم كمدير أساسي.',
    description_en: 'No active staff member is flagged as the primary manager.',
    count: noPm.length,
    records: noPm.slice(0, 50),
    actions: [A.open_business],
  });

  // info: synthetic / test emails
  const syn = inputs.integrity.filter((r) => r.synthetic_or_test);
  groups.push({
    id: 'synthetic_test_emails',
    severity: syn.length ? 'info' : 'healthy',
    label_ar: 'حسابات داخلية/اختبارية',
    label_en: 'Synthetic / test accounts',
    description_ar: 'حسابات بدخول هاتفي أو نطاق اختبار داخلي — لا تُعرض في الواجهات.',
    description_en: 'Phone-login or internal test-domain accounts — never shown in user-facing surfaces.',
    count: syn.length,
    records: syn.slice(0, 50).map((r) => {
      const p = profileByUser.get(r.user_id);
      const label = isSyntheticEmailLike(r.masked_email)
        ? (p?.ref_id ?? '—')
        : (r.masked_email || p?.ref_id || '—');
      return {
        key: `syn-${r.user_id}`,
        label,
        href: `/admin/users?focus=${r.user_id}`,
      };
    }),
    actions: [A.open_user],
  });

  // info: pending invitations (optional)
  if (typeof inputs.pendingInvitations === 'number') {
    groups.push({
      id: 'pending_invitations',
      severity: inputs.pendingInvitations > 0 ? 'info' : 'healthy',
      label_ar: 'دعوات قيد الانتظار',
      label_en: 'Pending invitations',
      description_ar: 'دعوات أُرسلت ولم تُقبل بعد.',
      description_en: 'Invitations sent but not yet accepted.',
      count: inputs.pendingInvitations,
      records: [],
      actions: [],
    });
  }

  const totals: Record<DiagnosticSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
    healthy: 0,
  };
  for (const g of groups) {
    if (g.severity === 'healthy') totals.healthy += 1;
    else totals[g.severity] += g.count;
  }
  const isHealthy = totals.critical === 0 && totals.warning === 0 && totals.info === 0;

  return { groups, totals, isHealthy };
}
