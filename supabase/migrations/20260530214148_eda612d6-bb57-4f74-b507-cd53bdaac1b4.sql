
-- BRANDS-HELP-CONTENT-1: Brand category + 7 published articles
INSERT INTO public.help_categories (slug, audience, title_ar, title_en, description_ar, description_en, sort_order, is_active)
VALUES ('brands', 'general', 'العلامات التجارية', 'Brands',
        'كل ما يخص العلامات التجارية في قِطاعات: الاكتشاف، الربط، الطلبات، والمراجعة.',
        'Everything about brands in Qitaat: discovery, linking, requests, and review.',
        18, true)
ON CONFLICT (slug) DO UPDATE SET
  title_ar = EXCLUDED.title_ar, title_en = EXCLUDED.title_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  is_active = true, updated_at = now();

WITH cat AS (SELECT id FROM public.help_categories WHERE slug = 'brands')
INSERT INTO public.help_articles
  (category_id, slug, audience, status, title_ar, title_en, summary_ar, summary_en, content_ar, content_en, keywords)
VALUES
  ((SELECT id FROM cat), 'brands-overview', 'general', 'published',
   'ما هي العلامات التجارية في قِطاعات؟',
   'What are brands in Qitaat?',
   'تعريف بالعلامات التجارية، الفرق بينها وبين مزود الخدمة، ولماذا السجل المعتمد مهم.',
   'Understand brands, how they differ from providers, and why the approved registry matters.',
   E'## ما هي العلامة التجارية؟\nالعلامة التجارية في قِطاعات تمثل مُصنِّعًا أو خطًا منتجًا في القطاعات الصناعية (ألمنيوم، زجاج، خشب، حديد، وغيرها).\n\n## الفرق بين العلامة ومزود الخدمة\n- **العلامة التجارية**: المُصنِّع أو الماركة (مثل خط منتجات معين).\n- **مزود الخدمة**: المنشأة التي تركّب أو توزع أو تستخدم هذه العلامة.\n\nالمزود الواحد قد يعمل بعدة علامات، والعلامة الواحدة قد يستخدمها عدة مزودين.\n\n## لماذا السجل المعتمد مهم؟\n- يمنع تكرار العلامات وضمان جودة البيانات.\n- يحمي العملاء من ادعاءات غير موثقة.\n- يبني ثقة عامة في نتائج البحث.\n\n## كيف تظهر العلامات للعموم؟\nفقط العلامات **المعتمدة** تظهر في `/brands` و `/brands/:slug`.\nالعلامات قيد المراجعة أو المرفوضة لا تظهر للعموم إطلاقًا.',
   E'## What is a brand?\nA brand in Qitaat represents a manufacturer or product line within industrial sectors (aluminum, glass, wood, steel, and more).\n\n## Brand vs provider\n- **Brand**: the manufacturer or product line.\n- **Provider**: the business that installs, distributes, or uses that brand.\n\nOne provider can work with many brands, and one brand can be used by many providers.\n\n## Why the approved registry matters\n- Prevents duplicates and keeps data quality high.\n- Protects customers from unverified claims.\n- Builds public trust in search results.\n\n## How brands appear publicly\nOnly **approved** brands appear on `/brands` and `/brands/:slug`.\nPending or rejected brands are never exposed publicly.',
   ARRAY['brands','registry','overview','قطاعات','علامات']),

  ((SELECT id FROM cat), 'provider-link-brands', 'provider', 'published',
   'كيف يربط المزودون العلامات التجارية',
   'How providers link brands',
   'دليل المزود لتصفح العلامات المعتمدة، ربطها بالخدمات، وفهم حالات الربط.',
   'Provider guide to browsing approved brands, linking them to services, and link statuses.',
   E'## نقطة البداية\nمن لوحة التحكم انتقل إلى **العلامات التجارية** `/dashboard/brands`.\n\n## متصفح العلامات المعتمدة\nيعرض جميع العلامات المعتمدة مع فلاتر للقطاع وبلد المنشأ.\n\n## لوحة العلامات المرتبطة\nاعرض العلامات التي ربطتها بأعمالك، واربطها بخدمات محددة، أو أزل الربط في أي وقت.\n\n## حالات الربط\n- **pending**: بانتظار مراجعة الإدارة.\n- **approved (verified)**: ظاهر علنًا في صفحة العلامة كمزود معتمد.\n- **rejected**: غير ظاهر علنًا.\n\n## قواعد الظهور العلني\nفقط الربط بحالة **verified** يظهر على `/brands/:slug` كمزود معتمد.\nبقية الحالات تبقى داخلية في لوحة التحكم.',
   E'## Starting point\nFrom your dashboard, open **Brands** at `/dashboard/brands`.\n\n## Approved brands browser\nLists all approved brands with sector and country filters.\n\n## My linked brands panel\nView brands linked to your business, attach them to specific services, or unlink anytime.\n\n## Link statuses\n- **pending**: awaiting admin review.\n- **approved (verified)**: shown publicly on the brand page as a verified provider.\n- **rejected**: not shown publicly.\n\n## Public visibility rules\nOnly **verified** links appear on `/brands/:slug` as a verified provider.\nAll other statuses stay internal in your dashboard.',
   ARRAY['provider','link','brand','dashboard','ربط','مزود']),

  ((SELECT id FROM cat), 'request-new-brand', 'provider', 'published',
   'كيف تطلب إضافة علامة تجارية جديدة',
   'How to request a new brand',
   'إرسال طلب علامة جديدة، البيانات المطلوبة، وحالات المراجعة المتوقعة.',
   'Submit a request for a new brand, the required information, and expected review states.',
   E'## أين أرسل الطلب؟\nمن `/dashboard/brands` اضغط على **طلب علامة جديدة**.\n\n## البيانات المطلوبة\n- اسم العلامة (عربي وإنجليزي).\n- القطاع الصناعي.\n- بلد المنشأ.\n- موقع رسمي أو مرجع موثق (اختياري لكنه يسرّع المراجعة).\n\n## عملية المراجعة\n1. ينتقل الطلب إلى الإدارة بحالة **pending**.\n2. قد ينتقل إلى **in_review** أو **needs_more_info** إذا طُلبت تفاصيل إضافية.\n3. النتيجة النهائية: **approved** أو **rejected**.\n\n## تنبيهات التكرار\nإذا كانت هناك علامة بنفس الاسم تقريبًا، يعرض النظام تنبيه تكرار قبل الإرسال.\n\n## الإشعارات\nستصلك إشعارات عند كل تغيير في حالة الطلب.',
   E'## Where to submit\nFrom `/dashboard/brands`, click **Request a new brand**.\n\n## Required information\n- Brand name (Arabic and English).\n- Industrial sector.\n- Country of origin.\n- Official website or reference (optional but speeds review).\n\n## Review process\n1. Request enters admin queue as **pending**.\n2. May move to **in_review** or **needs_more_info** if details are required.\n3. Final outcome: **approved** or **rejected**.\n\n## Duplicate warnings\nIf a near-duplicate brand exists, the system shows a duplicate warning before you submit.\n\n## Notifications\nYou receive a notification on every status change.',
   ARRAY['request','new brand','provider','duplicate','طلب','جديد']),

  ((SELECT id FROM cat), 'brand-request-review', 'provider', 'published',
   'لماذا تحتاج طلبات العلامات إلى مراجعة',
   'Why brand requests need review',
   'دواعي مراجعة طلبات العلامات: الجودة، منع التكرار، وثقة العموم.',
   'The reasons behind brand request review: quality, duplicate prevention, and public trust.',
   E'## ضبط الجودة\nنتأكد من صحة الاسم والقطاع وبلد المنشأ قبل النشر.\n\n## منع التكرار\nنفحص العلامات المتشابهة لتفادي تشتيت السجل.\n\n## الثقة العامة\nالظهور العلني محصور بالعلامات **المعتمدة** فقط لحماية العملاء.\n\n## نتائج المراجعة الممكنة\n- **approved**: تُنشر العلامة وتظهر علنًا.\n- **needs_more_info**: نطلب توضيحات قبل اتخاذ قرار.\n- **rejected**: لا يتم نشرها مع توضيح السبب.\n\n## ماذا يحدث بعد الموافقة؟\nتصبح العلامة متاحة لجميع المزودين للربط بها، وتظهر في البحث العام.',
   E'## Quality control\nWe verify the name, sector, and origin country before publishing.\n\n## Duplicate prevention\nWe screen near-duplicates to keep the registry clean.\n\n## Public trust\nOnly **approved** brands are exposed publicly to protect customers.\n\n## Possible outcomes\n- **approved**: brand is published and visible publicly.\n- **needs_more_info**: clarifications requested before a decision.\n- **rejected**: not published, with a stated reason.\n\n## After approval\nAll providers can link to the brand, and it appears in public search.',
   ARRAY['review','quality','duplicate','trust','مراجعة']),

  ((SELECT id FROM cat), 'brands-rfq-discovery', 'general', 'published',
   'كيف تؤثر العلامات على الاكتشاف وطلبات العروض',
   'How brands affect discovery and RFQs',
   'دور العلامات في اكتشاف المزودين وجودة الملف، ومتى تلعب دورًا في طلبات الأسعار.',
   'How brands influence provider discovery and profile quality, and their future role in RFQs.',
   E'## اكتشاف العلامات\nالعملاء يستطيعون تصفح العلامات المعتمدة عبر `/brands` ومشاهدة المزودين المعتمدين لكل علامة.\n\n## جودة ملف المزود\nربط علامات حقيقية ومعتمدة يرفع مصداقية الملف ويزيد فرص الظهور في النتائج.\n\n## السياق المستقبلي لطلبات الأسعار\nسيتم لاحقًا تمكين اختيار العلامة داخل طلبات الأسعار لتحسين الاستهداف.\n\n## ملاحظات مهمة\n- ربط علامة **لا يضمن** الحصول على طلبات أسعار.\n- الربط الصحيح يحسّن دقة البحث فقط.\n- ادعاء علامات غير صحيحة قد يؤدي إلى رفض الربط.',
   E'## Brand discovery\nCustomers can browse approved brands at `/brands` and see verified providers for each brand.\n\n## Provider profile quality\nLinking real, approved brands raises profile credibility and improves visibility in results.\n\n## Future RFQ context\nA brand picker inside RFQs is planned to enable better targeting.\n\n## Important notes\n- Linking a brand **does not guarantee** RFQs.\n- Correct linking only improves search relevance.\n- Claiming inaccurate brands may lead to link rejection.',
   ARRAY['rfq','discovery','search','provider','اكتشاف']),

  ((SELECT id FROM cat), 'admin-brand-requests-guide', 'admin', 'published',
   'دليل الإدارة لطلبات العلامات التجارية',
   'Admin guide to brand requests',
   'كيفية إدارة قائمة طلبات العلامات: المراجعة، طلب المعلومات، الموافقة، الرفض، والتدقيق.',
   'Manage the brand requests queue: review, request info, approve, reject, and audit.',
   E'## أين تجد القائمة؟\n`/admin/brand-requests` يعرض جميع الطلبات.\n\n## الحالات\n- **pending**: جديد بانتظار التقاط.\n- **in_review**: قيد المراجعة الفعلية.\n- **needs_more_info**: بانتظار رد المزود.\n- **approved**: تمت الموافقة، يُنشأ سجل علامة معتمد.\n- **rejected**: مرفوض مع ذكر السبب.\n\n## تنبيهات التكرار\nالنظام يعرض العلامات المشابهة في الاسم لتفادي الازدواجية.\n\n## سجل التدقيق\nكل إجراء يُسجل في `brand_audit_logs` ويُربط بالمسؤول الذي نفذ القرار.\n\n## إشعارات المزود\nيتلقى المزود إشعارًا تلقائيًا عند كل تغيير في حالة طلبه.',
   E'## Where to find the queue\n`/admin/brand-requests` lists every request.\n\n## States\n- **pending**: new, awaiting pickup.\n- **in_review**: actively under review.\n- **needs_more_info**: waiting on the requester.\n- **approved**: approved; a verified brand record is created.\n- **rejected**: rejected with a stated reason.\n\n## Duplicate warnings\nThe system surfaces similarly named brands to avoid duplicates.\n\n## Audit log\nEvery action is recorded in `brand_audit_logs` and linked to the actioning admin.\n\n## Requester notifications\nThe requester is notified automatically on every status change.',
   ARRAY['admin','brand-requests','review','audit','إدارة']),

  ((SELECT id FROM cat), 'admin-brand-detail-guide', 'admin', 'published',
   'دليل الإدارة لصفحة تفاصيل العلامة',
   'Admin guide to the brand detail page',
   'إدارة هوية العلامة، القطاعات، بلدان التصنيع، روابط المزودين، والإجراءات الإدارية.',
   'Manage brand identity, sectors, manufacturing countries, provider links, and admin actions.',
   E'## أين تجد الصفحة؟\n`/admin/brands/:id` تعرض كل تفاصيل العلامة.\n\n## الأقسام\n- **الهوية**: الاسم، الشعار، الموقع، الوصف.\n- **القطاعات**: القطاعات الصناعية المرتبطة.\n- **بلدان التصنيع**: قائمة بلدان التصنيع.\n- **روابط المزودين**: المزودون المرتبطون وحالتهم.\n- **الطلبات ذات الصلة**: طلبات سابقة على هذه العلامة.\n- **سجل التدقيق**: تاريخ كامل للتغييرات.\n\n## الإجراءات المتاحة\n- **approve**: اعتماد العلامة لتظهر علنًا.\n- **reject**: رفض مع ذكر السبب.\n- **archive**: أرشفة بدون حذف.\n- **verify**: توثيق إضافي.\n- **merge**: دمج علامتين متكررتين.\n\n## ملاحظات\nجميع الإجراءات تُسجل في `brand_audit_logs` ولا يمكن لمزود اعتماد نفسه.',
   E'## Where to find it\n`/admin/brands/:id` shows the full brand record.\n\n## Sections\n- **Identity**: name, logo, website, description.\n- **Sectors**: linked industrial sectors.\n- **Manufacturing countries**: list of origin countries.\n- **Provider links**: linked providers and their status.\n- **Related requests**: prior requests for this brand.\n- **Audit log**: complete change history.\n\n## Available actions\n- **approve**: publish the brand publicly.\n- **reject**: reject with a reason.\n- **archive**: archive without deleting.\n- **verify**: additional verification.\n- **merge**: merge two duplicate brands.\n\n## Notes\nAll actions are recorded in `brand_audit_logs` and no provider can self-approve.',
   ARRAY['admin','brand-detail','identity','merge','audit','تفاصيل'])
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  audience = EXCLUDED.audience,
  status = EXCLUDED.status,
  title_ar = EXCLUDED.title_ar, title_en = EXCLUDED.title_en,
  summary_ar = EXCLUDED.summary_ar, summary_en = EXCLUDED.summary_en,
  content_ar = EXCLUDED.content_ar, content_en = EXCLUDED.content_en,
  keywords = EXCLUDED.keywords, updated_at = now();
