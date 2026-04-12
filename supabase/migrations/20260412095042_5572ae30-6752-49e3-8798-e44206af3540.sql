
-- Business availability / working hours
CREATE TABLE public.business_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_bookings_per_slot INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, day_of_week)
);

ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can view availability
CREATE POLICY "Anyone can view availability"
  ON public.business_availability FOR SELECT
  USING (true);

-- Business owner/manager can manage
CREATE POLICY "Business owner can manage availability"
  ON public.business_availability FOR ALL
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

-- Bookings table
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  client_name TEXT,
  client_phone VARCHAR(20),
  cancellation_reason TEXT,
  cancelled_by UUID,
  ref_id TEXT NOT NULL DEFAULT public.generate_ref_id('BK', 'booking_ref_seq'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence for ref_id
CREATE SEQUENCE IF NOT EXISTS public.booking_ref_seq START WITH 1000;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Client can view their own bookings
CREATE POLICY "Clients can view own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Business owner can view bookings for their business
CREATE POLICY "Business owner can view bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- Authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Business owner can update booking status
CREATE POLICY "Business owner can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

-- Client can cancel own booking
CREATE POLICY "Client can cancel own booking"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_business_availability_updated_at
  BEFORE UPDATE ON public.business_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification on new booking
CREATE OR REPLACE FUNCTION public.notify_booking_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _biz_user_id UUID;
  _biz_name TEXT;
BEGIN
  SELECT user_id, name_ar INTO _biz_user_id, _biz_name FROM businesses WHERE id = NEW.business_id;

  IF TG_OP = 'INSERT' THEN
    -- Notify business owner
    PERFORM create_notification(
      _biz_user_id,
      'حجز موعد جديد: ' || NEW.ref_id,
      'New booking: ' || NEW.ref_id,
      'تم حجز موعد جديد بتاريخ ' || NEW.booking_date || ' الساعة ' || NEW.start_time,
      'New booking on ' || NEW.booking_date || ' at ' || NEW.start_time,
      'booking', NEW.id, 'booking', '/dashboard/bookings'
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify client on status change
    PERFORM create_notification(
      NEW.client_id,
      'تحديث حجز: ' || NEW.ref_id,
      'Booking update: ' || NEW.ref_id,
      'تم تغيير حالة الحجز لدى ' || _biz_name || ' إلى ' || NEW.status::text,
      'Your booking at ' || _biz_name || ' status changed to ' || NEW.status::text,
      'booking', NEW.id, 'booking', '/dashboard/bookings'
    );
    -- Notify business on cancellation by client
    IF NEW.status = 'cancelled' AND NEW.cancelled_by = NEW.client_id THEN
      PERFORM create_notification(
        _biz_user_id,
        'تم إلغاء حجز: ' || NEW.ref_id,
        'Booking cancelled: ' || NEW.ref_id,
        'قام العميل بإلغاء الحجز بتاريخ ' || NEW.booking_date,
        'Client cancelled booking on ' || NEW.booking_date,
        'booking', NEW.id, 'booking', '/dashboard/bookings'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
