# AUTH + ACCOUNT ACTIVATION JOURNEY — PHASE 14E
## Notification Copy Inventory (Proposed — no sending, no template changes)

**Scope:** copy-only inventory for the activation & free-membership journey.
**Not implemented:** no email sending, no notification system change, no
template edits. This document is the source-of-truth for Phase 14F to wire.

All strings are bilingual `ar / en`. Channels are recommendations only.

---

### 1. Account created
- **Trigger:** `auth.users` insert via `handle_new_user`.
- **Channel:** in-app + email (verify link).
- **AR:** «تم إنشاء حسابك في قطاعات. تحقّق من بريدك لإكمال التفعيل.»
- **EN:** "Your Qitaat account has been created. Check your email to complete activation."

### 2. Email verified
- **Trigger:** Supabase email confirmation callback (`/auth/verified`).
- **Channel:** in-app banner + optional email.
- **AR:** «تم تفعيل بريدك بنجاح. يمكنك الآن إكمال إعداد حسابك.»
- **EN:** "Your email has been verified. You can now finish setting up your account."

### 3. Business created
- **Trigger:** first row in `businesses` for the user (post-onboarding).
- **Channel:** in-app + email digest.
- **AR:** «تم إنشاء منشأتك. يراجع فريق قطاعات بياناتك قبل ظهورها للعملاء.»
- **EN:** "Your business has been created. The Qitaat team is reviewing your details before public visibility."

### 4. Business awaiting review
- **Trigger:** `businesses.approval_status = 'pending'` and `is_verified = false`.
- **Channel:** in-app status card.
- **AR:** «منشأتك قيد المراجعة من فريق قطاعات. سنبلّغك فور اعتمادها.»
- **EN:** "Your business is under review by the Qitaat team. We will notify you the moment it is approved."

### 5. Business approved
- **Trigger:** `is_verified = true` AND `approval_status = 'approved'`.
- **Channel:** in-app + email.
- **AR:** «تم اعتماد منشأتك. أصبحت مرئية لعملاء قطاعات.»
- **EN:** "Your business has been approved and is now visible to Qitaat customers."

### 6. Business rejected / needs edits
- **Trigger:** `approval_status = 'rejected'` or `'needs_changes'`.
- **Channel:** in-app banner + email with reason.
- **AR:** «نحتاج إلى تعديل بعض بيانات منشأتك قبل اعتمادها. راجع الملاحظات وحدّث الملف.»
- **EN:** "Your business needs a few updates before approval. Please review the notes and edit your profile."

### 7. Free Launch plan active
- **Trigger:** `ensure_provider_subscription` stamps `membership_tier ∈ { free, free_launch }`.
- **Channel:** in-app badge (already shown via `FreeLaunchBadge`) + welcome email.
- **AR:** «خطة الإطلاق المجانية مفعّلة. لا يتم احتساب أي رسوم خلال مرحلة الإطلاق التجريبي.»
- **EN:** "Free Launch plan active. No charges are applied during the soft-launch phase."

### 8. Profile incomplete
- **Trigger:** readiness score below visibility threshold.
- **Channel:** in-app card on `/dashboard`.
- **AR:** «بيانات ملفك ناقصة. أكمل الحقول المطلوبة لزيادة فرص الظهور.»
- **EN:** "Your profile is incomplete. Finish the required fields to increase your visibility."

### 9. Join request requires invitation or admin approval
- **Trigger:** user picks "Request access" without an invitation token.
- **Channel:** inline on `/onboarding` intent screen.
- **AR:** «طلب الانضمام للمنشأة يحتاج مراجعة من مسؤول المنشأة. إذا لديك دعوة، استخدم رابط الدعوة المرسل لك.»
- **EN:** "Joining an existing entity requires approval from its administrator. If you have an invitation, use the invitation link sent to you."

### 10. Password recovery
- **Trigger:** user submits forgot-password form.
- **Channel:** email.
- **AR:** «إذا كان الحساب موجوداً، أرسلنا رابط استعادة كلمة المرور إلى بريدك.»
- **EN:** "If an account exists, we have sent a password-reset link to your email."

---

**Constraints honoured:**
- No email templates edited.
- No notification system or RPC modified.
- No DB / RLS / migrations / edge changes.
- Strings are inventory only; wiring is deferred to Phase 14F.