-- Helper to safely grant points bypassing RLS
CREATE OR REPLACE FUNCTION public.grant_loyalty_points(
  _user_id UUID, _points INTEGER, _reason TEXT, _reference_id TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL OR _points = 0 THEN RETURN; END IF;
  INSERT INTO public.loyalty_points(user_id, points, reason, reference_id)
  VALUES (_user_id, _points, _reason, _reference_id);
END $$;

-- Trigger: award points when contract completes
CREATE OR REPLACE FUNCTION public.award_loyalty_on_contract_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  provider_user UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Client
    IF NEW.client_id IS NOT NULL THEN
      PERFORM public.grant_loyalty_points(NEW.client_id, 100, 'contract_completed', NEW.contract_number);
    END IF;
    -- Provider (business owner)
    IF NEW.business_id IS NOT NULL THEN
      SELECT user_id INTO provider_user FROM public.businesses WHERE id = NEW.business_id;
      IF provider_user IS NOT NULL THEN
        PERFORM public.grant_loyalty_points(provider_user, 100, 'contract_completed', NEW.contract_number);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_loyalty_contract_complete ON public.contracts;
CREATE TRIGGER trg_loyalty_contract_complete
AFTER UPDATE OF status ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_contract_complete();

-- Trigger: award points on 5-star review
CREATE OR REPLACE FUNCTION public.award_loyalty_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rating >= 5 THEN
    PERFORM public.grant_loyalty_points(NEW.user_id, 50, 'five_star_review', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_loyalty_review ON public.reviews;
CREATE TRIGGER trg_loyalty_review
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_review();