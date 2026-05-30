# خطة إصلاح وتحسين نظام العقود

## نتائج التدقيق (ملخّص)

النظام الحالي منظّم وموثّق جيداً، **لا توجد جداول مكررة حرجة**، والمسارات والـ RPCs واضحة. لكن البحث الشامل كشف 4 فجوات رئيسية يجب معالجتها.

### الجداول الحالية (21 جدول) — كلها نشطة، عدا:
- `legacy_contract_normalization_log` — جدول migration تاريخي (للاحتفاظ فقط).
- `contract_template_sections/clauses/required_fields/attachments/measurement_methods` — موجودة في DB ولها services لكن النظام الفعلي يعتمد على `template_snapshot` المجمّد. **ليست تكراراً ضاراً** — تبقى للاستخدام المستقبلي في محرر القوالب.

### المسارات الحالية:
- عام: `/contracts`, `/contracts/:id`, `/v/c/:number`
- Dashboard: `/dashboard/contracts`, `/dashboard/contract-analytics`
- Admin: `/admin/contract-templates`, `/admin/contracts/analytics`, `/admin/pdf-export-audit`
- **مفقود**: `/admin/contracts` (قائمة) و`/admin/contracts/:id` (تفاصيل) و`/admin/contracts/create` (إنشاء بالنيابة)

---

## الفجوات والإصلاحات

### 1. 🔴 ثغرة أمان: الأدمن يستطيع أن يكون طرفاً في عقد
في `create_contract_from_template` لا يوجد منع صريح من تعيين الأدمن نفسه كـ `provider_id` أو `client_id`، ولا يوجد CHECK يمنع `provider_id = client_id`.

**الإصلاح (migration)**:
- إضافة CHECK constraint على `contracts`: `provider_id <> client_user_id`.
- تعديل `create_contract_from_template` لرفض الحالات: الأدمن = provider، الأدمن = client، provider = client.
- تعديل `update_contract_draft_autosave` و`clone_contract_as_draft` بنفس الفحوصات.
- إضافة فحص مماثل في `link_lead_to_contract`.

### 2. 🟠 سجل تغييرات موحّد
الأحداث مشتتة بين 4 مصادر: `business_audit_log`, `contract_amendment_audit`, `contract_pdf_exports`, `contract_versions`.

**الإصلاح**:
- إنشاء RPC `get_contract_full_audit_trail(_contract_id uuid)` SECURITY DEFINER يعيد timeline موحّد من المصادر الأربعة (نوع الحدث + الوقت + الفاعل (مُخفّى للأدمن فقط) + ملخّص آمن من PII).
- صلاحية القراءة: طرفا العقد + admin.
- اختبار العزل: يمنع تسرّب PII أو الكشف عبر التطفّل.

### 3. 🟠 واجهة عقود للأدمن (إدارة + إنشاء بالنيابة)
الأدمن لا يستطيع إنشاء/استعراض العقود الفردية من UI.

**الإصلاح**:
- صفحة جديدة `src/pages/admin/AdminContracts.tsx` على `/admin/contracts`: قائمة كل العقود مع فلاتر (الحالة، Provider، Client، التاريخ).
- صفحة `src/pages/admin/AdminContractDetail.tsx` على `/admin/contracts/:id`: عرض للقراءة + إجراءات أدمن (إلغاء، نسخ كقالب، عرض السجل الكامل).
- صفحة `src/pages/admin/AdminContractCreate.tsx` على `/admin/contracts/create`: 3 خطوات (اختيار Provider → اختيار Client → اختيار Template) ثم تنشئ Draft مع `provider_id` لمزود آخر، وترسل دعوة موافقة للطرفين.
- RPC جديد `admin_create_contract_on_behalf(_provider_id, _client_id, _template_id, _payload)` يتحقق أن الأدمن ≠ أي طرف، وينشئ draft + يسجّل audit event + يرسل إشعار للطرفين.
- ربط الصفحات في AdminSidebar تحت قسم "العقود".

### 4. 🟡 روابط ناقصة في `ContractDetail.tsx`
- تبويب جديد **"السجل الكامل"** (`history`) يستخدم `get_contract_full_audit_trail` ويعرض timeline.
- زر **"رابط التحقق العام"** يفتح `/v/c/:number?h=<prefix>` في تبويب جديد + ينسخ الرابط.
- زر **رجوع** واضح إلى القائمة (`/dashboard/contracts` أو `/admin/contracts` حسب الدور).

### 5. 🟢 تنظيف
- تعليق SQL على `legacy_contract_normalization_log` يوضّح أنه تاريخي.
- تصحيح اختبار `contractsIsolationAudit.test.ts:40` الذي يشير إلى `contract_audit_logs` (خطأ مطبعي) → الإشارة إلى `contract_amendment_audit` أو إزالة السطر.

---

## التفاصيل التقنية

```text
Migration 1: contracts_party_isolation_v1
  - ALTER TABLE contracts ADD CONSTRAINT chk_provider_ne_client
    CHECK (client_user_id IS NULL OR provider_id <> client_user_id) NOT VALID;
  - VALIDATE CONSTRAINT (إذا لا توجد بيانات مخالفة)
  - تعديل 3 RPCs بإضافة فحوصات الأدمن/الطرف

Migration 2: contract_full_audit_trail_v1
  - CREATE FUNCTION get_contract_full_audit_trail(uuid)
  - GRANT EXECUTE TO authenticated

Migration 3: admin_create_contract_on_behalf_v1
  - CREATE FUNCTION admin_create_contract_on_behalf(...)
  - GRANT EXECUTE TO authenticated (الفحص داخل الدالة)
```

**ملفات Frontend الجديدة (4)**:
- `src/pages/admin/AdminContracts.tsx`
- `src/pages/admin/AdminContractDetail.tsx`
- `src/pages/admin/AdminContractCreate.tsx`
- `src/components/contracts/ContractFullHistory.tsx`

**ملفات معدّلة (5)**:
- `src/App.tsx` (إضافة 3 مسارات admin)
- `src/pages/ContractDetail.tsx` (تبويب history + زر verify + رجوع)
- `src/modules/contracts/services/` (wrappers للـ RPC الجديد)
- `src/components/dashboard/AdminSidebar.tsx` (روابط القائمة الجديدة)
- `src/__tests__/contractsIsolationAudit.test.ts` (تصحيح المرجع)

---

## ضمانات عدم فقدان روابط/ميزات

- لن يتم حذف أي ملف موجود (فقط إضافة + تعديل).
- المسارات الحالية تبقى كما هي.
- جدول `contract_amendment_audit` يُقرأ كما هو ويُدمج في الـ RPC الجديد دون استبدال `AmendmentHistoryPanel` الحالي.
- جداول template الثانوية تبقى ولا تُحذف.
- بعد كل تغيير: `tsc --noEmit` + الاختبارات الموجودة + اختبار جديد لكل RPC.

---

## التقرير النهائي (سيُسلَّم بعد التنفيذ)
سيتضمّن: ما تم إنجازه، الـ migrations المنفّذة، الصفحات/التبويبات الجديدة، نتائج الاختبارات، وقائمة التحقق من الروابط.

هل أبدأ التنفيذ بالترتيب أعلاه (الأمان أولاً)؟