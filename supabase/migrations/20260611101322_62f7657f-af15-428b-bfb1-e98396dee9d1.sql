-- Repoint modules to existing real routes
UPDATE public.system_modules SET route = '/dashboard/operations/feed' WHERE key = 'activity_log';
UPDATE public.system_modules SET route = '/dashboard/installments'    WHERE key = 'payments';
UPDATE public.system_modules SET route = '/dashboard/provider/membership' WHERE key = 'credits';
UPDATE public.system_modules SET route = '/dashboard/settings/staff'  WHERE key = 'staff_management';

-- Deactivate modules with no real backing page (can be re-activated later)
UPDATE public.system_modules SET is_active = false
 WHERE key IN ('ai_assistant', 'ai_tools', 'documents');