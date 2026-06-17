## نطاق العمل

تحسينات شاملة للداشبورد تشمل بناء مزايا احترافية مشتركة وتطبيقها على الأقسام الأربعة المحددة، مع فحص الروابط وتوحيد التصميم وتحسين الأداء والاستجابة.

## المزايا المشتركة الجديدة (Foundations)

سأبني هذه المكونات مرة واحدة وأعيد استخدامها عبر كل الأقسام:

1. **Command Palette (Cmd+K / Ctrl+K)**
   - `src/components/dashboard/CommandPalette.tsx` فوق كل صفحات `/dashboard/*`
   - بحث في: الصفحات، العقود، الأعمال، المشاريع، الإشعارات
   - اختصارات سريعة: عقد جديد، مشروع جديد، رفع صورة، تبديل الثيم/اللغة
   - تكامل مع `cmdk` (متوفر في shadcn)

2. **Pin & Reorder للوحة Overview**
   - `usePinnedWidgets` hook يحفظ في `localStorage` بمفتاح `qitaat_dashboard_widgets_v1`
   - أيقونة تثبيت/إخفاء على كل widget، مع ترتيب بالسحب الخفيف (بدون مكتبة جديدة)

3. **Export Utility (CSV + PDF)**
   - `src/lib/export/exportTable.ts` — `exportToCSV(rows, columns, filename)` و `exportToPDF(rows, columns, { title, rtl })`
   - يستخدم `jsPDF + Amiri font` المسجّل مسبقاً (سياسة الـ Arabic engine)
   - زر موحد `<ExportMenu />` يظهر في رؤوس الجداول

4. **Bulk Actions Bar**
   - `<BulkActionBar selected={n} actions={[...]} />` شريط سفلي عائم
   - `useBulkSelection<T>()` hook عام (selectAll/clear/toggle)
   - دعم: حذف، أرشفة، تصدير المحدد، تغيير الحالة

## التحسينات حسب القسم

### 1. العقود والمشاريع (`/dashboard/contracts`, `/dashboard/projects`)
- إضافة Bulk Actions: تصدير CSV/PDF، أرشفة، تحديث الحالة
- زر "تصدير الكل" في الهيدر
- إصلاح أي روابط معطّلة في صفحة تفاصيل العقد
- توحيد رؤوس الأقسام مع `SectionHeader` من `shared.tsx`

### 2. الأعمال والخدمات (`/dashboard/business*`, `/dashboard/services`)
- Bulk Actions على قائمة الخدمات والفروع
- تصدير كتالوج الخدمات
- زر Quick Add في الـ Command Palette
- توحيد البطاقات بنفس النظام المدمج

### 3. المحفظة والمشاريع المنفذة (`/dashboard/portfolio`)
- إجراءات مجمّعة (نشر/إخفاء/حذف عدة عناصر)
- تصدير قائمة المشاريع المنفذة
- تحسين الـ grid على الجوال (`xs:` breakpoint)

### 4. الإشعارات والتقارير (`/dashboard/notifications`)
- إجراءات مجمّعة (تعليم كمقروء، حذف، أرشفة)
- فلتر سريع متقدم (نوع، تاريخ، حالة)
- تصدير سجل الإشعارات

## الفحص والتدقيق

- **فحص الروابط**: مرور على روابط الـ Sidebar وأزرار CTA الرئيسية في كل صفحة (نتائج في رد قصير بعد التنفيذ)
- **توحيد التصميم**: تطبيق `SECTION_CARD_CLASS` و `SectionHeader` بشكل متّسق
- **الأداء**: التأكد من lazy loading للصفحات الثقيلة (Portfolio/Projects)
- **الجوال**: مراجعة الـ touch targets (>=44px) و RTL على الـ Bulk Bar

## التغييرات التقنية

**ملفات جديدة:**
- `src/components/dashboard/CommandPalette.tsx`
- `src/components/dashboard/ExportMenu.tsx`
- `src/components/dashboard/BulkActionBar.tsx`
- `src/hooks/useBulkSelection.ts`
- `src/hooks/usePinnedWidgets.ts`
- `src/lib/export/exportTable.ts`

**ملفات معدّلة:**
- `src/components/dashboard/DashboardLayout.tsx` (إضافة CommandPalette + اختصار)
- `src/pages/dashboard/DashboardContracts.tsx`
- `src/pages/dashboard/DashboardProjects.tsx`
- `src/pages/dashboard/DashboardPortfolio.tsx`
- `src/pages/dashboard/DashboardNotifications.tsx`
- `src/pages/dashboard/DashboardServices.tsx`
- `src/pages/dashboard/overview/UserDashboardView.tsx` (Pin/Reorder)

**القيود المحترمة:**
- لا popups/dialogs خارج CommandPalette (Cmd+K هو UX قياسي مقبول)
- لا تغييرات في الـ business logic، فقط UI و UX
- جميع المفاتيح بـ `qitaat_*` prefix
- بدون مكتبات جديدة (نستخدم cmdk + jsPDF الموجودين)

## خطة التنفيذ

دفعة واحدة في مراحل متتالية:
1. بناء الـ foundations (4 ملفات جديدة)
2. ربط CommandPalette في DashboardLayout
3. تطبيق Bulk + Export على كل قسم بالترتيب
4. فحص نهائي وتقرير بالنتائج

هل تريدني أبدأ التنفيذ كاملاً، أم تفضل تجزئته على دفعتين (Foundations + قسم أو قسمين أولاً، ثم الباقي)؟