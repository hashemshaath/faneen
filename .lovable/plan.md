
## الهدف
تطوير نظام عقود يحمي حقوق المشتري والبائع عبر: طلب عقد، مراحل عمل، إثباتات إنجاز، ضمان دفع (Escrow)، موافقة + مهلة تلقائية، ونزاعات. التنفيذ بالتدريج على 3 مراحل.

---

## المرحلة 1 — المراحل + إثباتات الإنجاز (الأساس)

**واجهات**
- `RequestContractPage` (مسار `/contracts/request`):
  - مسار A: نموذج طلب مستقل (مشتري → مزود/قطاع → موضوع → ميزانية تقديرية → مرفقات).
  - مسار B: زر "تحويل عرض السعر إلى عقد" داخل صفحة Quote/RFQ مقبول (يملأ النموذج مسبقاً).
- `ContractMilestonesEditor` (داخل خطوة Pricing بعد القالب): إضافة/تحرير مراحل (عنوان، نسبة %، مبلغ، تاريخ مستهدف، مخرجات متوقعة).
- `ContractMilestoneTimeline` (داخل صفحة العقد): جدول زمني مرئي لكل مرحلة وحالتها.
- `MilestoneEvidenceUploader`: رفع صور/ملفات/ملاحظات إثبات إنجاز (يستخدم bucket موجود).
- `MilestoneReviewPanel`: للمشتري — أزرار "اعتماد الإنجاز" / "طلب تعديل" / "فتح نزاع" + عداد المهلة التلقائية.

**قاعدة البيانات** (موجود جزئياً عبر `contract_milestones` — سنوسّعها)
- إضافة أعمدة: `amount`, `percentage`, `target_date`, `state` (`pending|in_progress|submitted|approved|disputed|released`), `auto_release_at`, `approved_at`, `approved_by`.
- جدول جديد `contract_milestone_evidence` (milestone_id, type, file_path/note, uploaded_by).
- جدول `contract_milestone_events` (audit: submitted/approved/disputed/auto-released).
- RLS: المشتري والمزود فقط (+ admin) — مع GRANTs قياسية.

**خدمات/منطق**
- `submitMilestoneForReview(milestoneId)` ← يضبط `state=submitted` و `auto_release_at = now() + interval` (افتراضي 7 أيام، قابل للتعديل في القالب).
- `approveMilestone(...)` / `requestRevision(...)`.

---

## المرحلة 2 — ضمان الدفع (Escrow)

**نموذج بيانات**
- `contract_escrow_accounts` (contract_id, total_held, currency, provider, status).
- `contract_escrow_transactions` (escrow_id, milestone_id, type: `hold|release|refund|fee`, amount, payment_intent_id, provider_ref).
- ربط مع بوابة دفع (Moyasar/HyperPay — مذكورة في BRD): حجز كامل قيمة العقد عند التوقيع، إفراج جزئي عند اعتماد المرحلة.

**Edge Functions**
- `escrow-hold` (إنشاء payment intent للحجز).
- `escrow-release` (يستدعى عند `approveMilestone` أو cron auto-release).
- `escrow-webhook` (التحقق HMAC + تحديث الحالة بـ idempotency).

**واجهات**
- `EscrowSummaryCard` داخل العقد (إجمالي محجوز، مُفرج، متبقي).
- `EscrowFundingStep` في تدفق توقيع العقد.

---

## المرحلة 3 — الموافقة + المهلة التلقائية + النزاعات

**Auto-release**
- Cron كل 15 دقيقة (`pg_cron + pg_net`) يفحص `milestones` حيث `state=submitted AND auto_release_at <= now()` → يستدعي `escrow-release` + يسجل حدث `auto_released` + يرسل إشعار.

**النزاعات**
- جدول `contract_disputes` (contract_id, milestone_id, raised_by, reason, status: `open|under_review|resolved_buyer|resolved_provider|split`, resolution_note, resolved_by_admin).
- فتح نزاع يجمّد `auto_release_at` ويغير حالة المرحلة إلى `disputed`.
- لوحة إدارة (`/admin/disputes`) للمراجعة والقرار (إفراج/استرداد/تقسيم).
- إشعارات للطرفين عند كل تحوّل حالة (يستخدم نظام الإشعارات الحالي).

---

## التفاصيل التقنية

```text
src/
├── pages/contracts/RequestContractPage.tsx
├── components/contracts/
│   ├── milestones/{Editor,Timeline,EvidenceUploader,ReviewPanel}.tsx
│   ├── escrow/{SummaryCard,FundingStep}.tsx
│   └── disputes/{OpenDisputeForm,DisputeThread}.tsx
├── modules/contracts/services/
│   ├── milestoneLifecycle.ts        (submit/approve/revise)
│   ├── escrowService.ts             (hold/release client wrappers)
│   ├── disputeService.ts
│   └── autoReleaseCalc.ts
supabase/functions/
│   ├── escrow-hold/
│   ├── escrow-release/
│   └── escrow-webhook/
```

**Migrations (3 ملفات منفصلة):**
1. توسيع `contract_milestones` + إنشاء `contract_milestone_evidence` + `contract_milestone_events` + RLS + GRANTs.
2. `contract_escrow_accounts` + `contract_escrow_transactions` + RLS + GRANTs.
3. `contract_disputes` + RLS + GRANTs + cron job للـ auto-release.

**التكامل مع الموجود**
- يستفيد من `contract_milestones` و`contract_attachments` الحاليين.
- لا تغيير في تدفق إنشاء العقد Purpose-First — فقط إضافة خطوة `ContractMilestonesEditor` ضمن خطوة Pricing.
- استخدام `notifications` الحالي للأحداث (submitted/approved/auto-released/disputed).

---

## ترتيب التنفيذ
1. هذه الجلسة: **المرحلة 1 كاملة** (مهاجرة 1 + واجهات المراحل + RequestContractPage + ربط بـ Quote).
2. الجلسة التالية: **المرحلة 2** (Escrow + بوابة دفع — أحتاج تأكيد البوابة: Moyasar أم HyperPay).
3. الجلسة الثالثة: **المرحلة 3** (النزاعات + cron auto-release + لوحة الإدارة).

أبدأ الآن بالمرحلة 1؟
