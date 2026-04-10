CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next_account_number integer;
BEGIN
  SELECT COALESCE(MAX(account_number), 999) + 1 INTO _next_account_number FROM public.profiles;
  
  INSERT INTO public.profiles (user_id, phone, email, full_name, account_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _next_account_number
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;