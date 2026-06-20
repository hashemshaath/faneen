## خطة تحسين صفحة البحث `/search`

صفحة البحث الحالية مغطاة بحراس اختبارات قوية (`searchV3.noLegacy`, `cwv-optimizations`, `publicFrontendPerformance`, `search-v3-perf` e2e, `search-header-no-overlap`, إلخ). أي تغيير واسع يكسر الحراس. الخطة أدناه مركّزة، منخفضة المخاطر، ومحترمة لكل الحراس.

### 1. الأداء والسرعة
- إضافة `keepPreviousData` على `useBusinesses` / `useCategories` / `useCities` لمنع الوميض عند تغيير الفلاتر.
- استبدال `window.scrollTo({ behavior: 'smooth' })` بـ `prefers-reduced-motion`-aware scroll (يحترم سياسة CWV).
- إضافة `content-visibility: auto` و `contain-intrinsic-size` لبطاقات النتائج أسفل أول 6 → تقليل CLS/LCP على الجوال.
- `requestIdleCallback` لتأخير حساب JSON-LD `ItemList` الكبير حتى بعد التفاعل الأول.

### 2. تجربة الجوال
- زيادة hit area لأزرار الفلتر/الفرز إلى 44px (سياسة a11y).
- جعل `ActiveFiltersBarV3` chips قابلة للسحب أفقيًا بدون scrollbar (`.no-scrollbar`).
- إظهار عدد النتائج Sticky في أعلى الصفحة على الجوال عند التمرير.
- تكبير `MobileFiltersSheet` CTA بـ "تطبيق (N)" مع عدّاد فلاتر مباشر.

### 3. الفلاتر و UX
- إبراز الفلاتر النشطة بـ `aria-pressed` و حلقة بصرية واضحة (token-based، لا hex).
- إضافة زر "إعادة تعيين هذا الفلتر" داخل كل قسم في `SearchFiltersV3`.
- "Did you mean" يظهر inline بدلاً من تحت النتائج عند 0 نتيجة.
- حفظ آخر فرز مستخدم في `localStorage` (مفتاح `qitaat_search_sort`) لاسترجاعه عند الزيارة التالية.

### 4. التصميم البصري
- `SearchResultCardV3`: تحسين ratio الصورة (16:11)، رفع تباين الشارة "موثّق"، استخدام `<VerifiedBadge>` الموحّد.
- skeleton أكثر دقة (يطابق ارتفاع البطاقة الفعلي → 0 CLS).
- تحسين `SearchEmptyStateV3` بأيقونة كبيرة + CTA لمسح الفلاتر.

### ضمانات
- لا تغيير في DB / RLS / RPC / migrations / edge.
- لا تغيير في search backend أو matching logic (`filterAndSort` يبقى كما هو).
- لا hex hardcoded، لا `any`، لا suppressions جديدة.
- كل حراس الصفحة الحالية تبقى خضراء + اختبار جديد لكل تحسين.

### الملفات المتوقّع تعديلها
- `src/pages/SearchV3.tsx` (scroll + idle JSON-LD + persisted sort)
- `src/components/search/v3/SearchResultCardV3.tsx` (visual)
- `src/components/search/v3/SearchResultsV3.tsx` (content-visibility)
- `src/components/search/v3/ActiveFiltersBarV3.tsx` (mobile UX)
- `src/components/search/v3/MobileFiltersSheet.tsx` (CTA counter)
- `src/components/search/v3/SearchFiltersV3.tsx` (per-section reset)
- `src/components/search/v3/SearchSkeletonV3.tsx` (CLS)
- `src/services/search/useBusinesses.ts` (keepPreviousData)
- اختبارات جديدة في `src/__tests__/searchV3PageImprovements.test.tsx`

### القرار المطلوب منك
هل تريد:
- (أ) تنفيذ الـ4 محاور كلها (تغيير متوسط الحجم، عدة ملفات).
- (ب) تنفيذ المحاور 1+3 فقط (الأداء + UX، أقل مخاطرة بصرية).
- (ج) تنفيذ المحاور 2+4 فقط (جوال + تصميم بصري).
- (د) محور واحد محدد — حدّد أيًّا.