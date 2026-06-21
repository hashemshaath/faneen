# FAILING TESTS TRIAGE + GUARD DRIFT CLOSEOUT REPORT

## 1. عدد الاختبارات الفاشلة قبل

73 اختبارًا فاشلًا، حسب الحالة المعطاة قبل بدء هذه الجولة.

## 2. عدد الملفات الفاشلة قبل

47 ملفًا فاشلًا، حسب الحالة المعطاة قبل بدء هذه الجولة.

## 3. جدول التصنيف

> ملاحظة تنفيذية: محاولة تشغيل full Vitest suite داخل هذه الجلسة تجاوزت مهلة الأداة قبل توليد JSON report كامل. لذلك يغطي هذا الجدول الفشل الذي ظهر فعليًا في المخرجات الجزئية، ثم الإصلاحات المستهدفة التي تم التحقق منها. لم يتم الادعاء بإغلاق كامل 73/47.

| test file / guard | failure type | root cause | decision | fixed now? |
|---|---|---|---|---|
| `scripts/notifications-isolation-audit.mjs` via full suite | policy/security regression | `src/modules/opportunities/bids/services.ts` كان يكتب مباشرة في `notifications` خارج wrapper الإشعارات | إصلاح الكود بتوجيه الكتابة إلى `createNotification` بدون تغيير السلوك المرئي | yes |
| `scripts/identity-isolation-audit.mjs` via full suite | policy/security regression | `IdentityBulkInviteLanding` كان يستدعي `supabase.auth.getUser()` مباشرة خارج boundary الهوية | إصلاح الكود باستخدام `getCurrentUser` و`logAdminActivity` | yes |
| `scripts/identity-isolation-audit.mjs` via full suite | policy/security regression | `useAdminDashboardLayout` كان يستدعي `supabase.auth.getUser()` مباشرة خارج boundary الهوية | إصلاح الكود باستخدام `getCurrentUser` | yes |
| `src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts` | stale guard بعد refactor صحيح | guard shell helper كان يبني أمر `grep` عبر shell string؛ وجود backtick داخل regex سبب command-substitution break | تحديث guard لاستخدام `execFileSync('grep', args)` بدل shell interpolation | yes |
| `src/__tests__/emailInfrastructurePhase15cAuthQueueResendMigration.test.ts` | stale guard بعد refactor صحيح | نفس نمط grep غير الآمن في helper | تحديث guard لاستخدام `execFileSync` | yes |
| `src/__tests__/emailInfrastructurePhase15dTemplateRegistry.test.ts` | stale guard بعد refactor صحيح | نفس نمط grep غير الآمن، مع grep مباشر إضافي لمفتاح Resend | تحديث guard لاستخدام helper آمن بدون shell interpolation | yes |
| `src/__tests__/emailInfrastructurePhase15eLogsDeliverability.test.ts` | stale guard بعد refactor صحيح | نفس نمط grep غير الآمن في helper | تحديث guard لاستخدام `execFileSync` | yes |
| `src/__tests__/emailInfrastructurePhase15fFullEmailRegression.test.ts` | stale guard بعد refactor صحيح | نفس نمط grep غير الآمن، مع grep مباشر إضافي لمفتاح Resend | تحديث guard لاستخدام helper آمن بدون shell interpolation | yes |
| Remaining unobserved failures from the original 73/47 | unknown | full suite did not finish within the available command timeout, and no complete JSON failure report was produced | لا يتم إصلاحها في هذه الجولة لتجنب إصلاح واسع/أعمى | no |

## 4. ما تم إصلاحه

- أُزيل direct notification table insert من `src/modules/opportunities/bids/services.ts` لصالح `createNotification`.
- أُزيلت direct auth reads من `IdentityBulkInviteLanding` لصالح identity wrappers.
- أُزيلت direct auth reads من `useAdminDashboardLayout` لصالح `getCurrentUser`.
- تم إصلاح guards الخاصة بـ Email Infrastructure Phase 15A/15C/15D/15E/15F لتستخدم `execFileSync` بدل shell command interpolation، بدون تعطيل أو suppression.

## 5. ما بقي مفتوحًا ولماذا

- بقي triage الكامل لكل 73 اختبارًا / 47 ملفًا مفتوحًا لأن تشغيل full suite داخل هذه الجلسة تجاوز المهلة قبل إنتاج تقرير JSON كامل.
- القرار الآمن هو عدم إصلاح failures غير مرئية أو غير مصنفة، حتى لا يتحول العمل إلى refactor واسع أو تغييرات سلوك لإرضاء اختبارات.

## 6. هل تم حذف أو تعطيل أي اختبار؟

لا.

## 7. هل تم استخدام suppressions؟

لا.

## 8. هل تغير السلوك؟

لا يوجد تغيير سلوك مرئي مقصود. التغيير في الكود الإنتاجي هو توجيه نفس عمليات القراءة/التسجيل عبر wrappers canonical بدل الوصول المباشر، مع الحفاظ على نفس intent: إشعار best-effort، وتسجيل نشاط admin، ومزامنة layout.

## 9. هل تغير DB/RLS/RPC/migrations/edge؟

لا.

## 10. نتائج `tsc`

الحالة قبل الجولة حسب المعطيات: `tsc --noEmit` clean. لم يتم تشغيل typecheck يدويًا داخل هذه الجولة لأن harness هو المسؤول عن ذلك.

## 11. نتائج الاختبارات بعد الإصلاح

- `node scripts/notifications-isolation-audit.mjs`: PASS، violations = 0.
- `node scripts/identity-isolation-audit.mjs`: PASS، violations = 0.
- Targeted Vitest email guards:
  - `src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts`
  - `src/__tests__/emailInfrastructurePhase15cAuthQueueResendMigration.test.ts`
  - `src/__tests__/emailInfrastructurePhase15dTemplateRegistry.test.ts`
  - `src/__tests__/emailInfrastructurePhase15eLogsDeliverability.test.ts`
  - `src/__tests__/emailInfrastructurePhase15fFullEmailRegression.test.ts`
  - Result: 5 files passed, 65 tests passed.
- Full Vitest suite after الإصلاح: not completed in-session due command timeout; needs CI/harness rerun.

## 12. القرار

`FAILING TESTS TRIAGE + GUARD DRIFT CLOSEOUT NEEDS FIX`