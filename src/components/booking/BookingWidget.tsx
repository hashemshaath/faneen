import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingWidgetProps {
  businessId: string;
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BookingWidget = ({ businessId, businessName, open, onOpenChange }: BookingWidgetProps) => {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'date' | 'slot' | 'confirm'>('date');

  // Fetch availability
  const { data: availability = [] } = useQuery({
    queryKey: ['business-availability-public', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('business_availability').select('*').eq('business_id', businessId).eq('is_active', true);
      return data || [];
    },
    enabled: open,
  });

  // Fetch existing bookings for selected date
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['existing-bookings', businessId, selectedDate?.toISOString()?.split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate!.toISOString().split('T')[0];
      const { data } = await supabase.from('bookings').select('start_time, end_time, status')
        .eq('business_id', businessId).eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);
      return data || [];
    },
    enabled: !!selectedDate && open,
  });

  // Available days of week
  const availableDays = useMemo(() => availability.map(a => a.day_of_week), [availability]);

  // Disable dates that are not available
  const disabledDays = useCallback((date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (date > addDays(new Date(), 60)) return true; // Max 60 days ahead
    return !availableDays.includes(date.getDay());
  }, [availableDays]);

  // Generate time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayConfig = availability.find(a => a.day_of_week === selectedDate.getDay());
    if (!dayConfig) return [];

    const slots: { time: string; endTime: string; available: boolean }[] = [];
    const [startH, startM] = (dayConfig.start_time as string).split(':').map(Number);
    const [endH, endM] = (dayConfig.end_time as string).split(':').map(Number);
    const duration = dayConfig.slot_duration_minutes || 30;
    const maxPerSlot = dayConfig.max_bookings_per_slot || 1;

    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (currentMin + duration <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const eH = Math.floor((currentMin + duration) / 60);
      const eM = (currentMin + duration) % 60;
      const endTime = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

      // Check how many bookings exist for this slot
      const bookingsAtSlot = existingBookings.filter(b => b.start_time?.slice(0, 5) === time).length;
      
      // Check if it's past time for today
      let isPast = false;
      if (isSameDay(selectedDate, new Date())) {
        const now = new Date();
        isPast = h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
      }

      slots.push({ time, endTime, available: bookingsAtSlot < maxPerSlot && !isPast });
      currentMin += duration;
    }

    return slots;
  }, [selectedDate, availability, existingBookings]);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!user || !selectedDate || !selectedSlot) throw new Error('missing');
      const slot = timeSlots.find(s => s.time === selectedSlot);
      if (!slot) throw new Error('invalid slot');

      const bookingId = crypto.randomUUID();
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: inserted, error } = await supabase.from('bookings').insert({
        id: bookingId,
        business_id: businessId,
        client_id: user.id,
        booking_date: dateStr,
        start_time: slot.time,
        end_time: slot.endTime,
        notes: notes.trim() || null,
      }).select('ref_id').single();
      if (error) throw error;

      // Send booking confirmation email (fire-and-forget)
      if (user.email) {
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-confirmation',
            recipientEmail: user.email,
            idempotencyKey: `booking-confirm-${bookingId}`,
            templateData: {
              clientName: user.user_metadata?.full_name || '',
              businessName,
              bookingDate: dateStr,
              startTime: slot.time,
              refId: inserted?.ref_id || '',
            },
          },
        }).catch(console.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['existing-bookings'] });
      toast.success(isRTL ? 'تم حجز الموعد بنجاح! سيتم تأكيده من المزود.' : 'Booking created! Awaiting provider confirmation.');
      onOpenChange(false);
      resetState();
    },
    onError: () => toast.error(isRTL ? 'فشل الحجز' : 'Booking failed'),
  });

  const resetState = () => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setNotes('');
    setStep('date');
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (date) setStep('slot');
  };

  const handleSlotSelect = (time: string) => {
    setSelectedSlot(time);
    setStep('confirm');
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'حجز موعد' : 'Book Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <CalendarClock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{isRTL ? 'سجل دخولك أولاً لحجز موعد' : 'Please sign in to book an appointment'}</p>
            <Button onClick={() => navigate('/auth')}>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-accent" />
            {isRTL ? `حجز موعد — ${businessName}` : `Book — ${businessName}`}
          </DialogTitle>
        </DialogHeader>

        {availability.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{isRTL ? 'المزود لم يحدد أوقات العمل بعد' : 'Provider has not set working hours yet'}</p>
          </div>
        ) : (
          <>
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
              {[
                { key: 'date', label: isRTL ? 'التاريخ' : 'Date' },
                { key: 'slot', label: isRTL ? 'الوقت' : 'Time' },
                { key: 'confirm', label: isRTL ? 'تأكيد' : 'Confirm' },
              ].map((s, i) => (
                <React.Fragment key={s.key}>
                  {i > 0 && <span className="text-border">—</span>}
                  <span className={step === s.key ? 'text-accent font-bold' : ''}>{s.label}</span>
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Date */}
            {step === 'date' && (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={disabledDays}
                className={cn("p-3 pointer-events-auto mx-auto")}
              />
            )}

            {/* Step 2: Time Slot */}
            {step === 'slot' && selectedDate && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep('date')} className="text-xs">
                    {isRTL ? '← تغيير التاريخ' : '← Change date'}
                  </Button>
                  <Badge variant="outline" className="text-xs">{format(selectedDate, 'yyyy-MM-dd')}</Badge>
                </div>
                {timeSlots.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">{isRTL ? 'لا توجد مواعيد متاحة' : 'No slots available'}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => handleSlotSelect(slot.time)}
                        className={cn(
                          'py-2.5 px-2 rounded-xl text-sm font-medium tech-content border transition-all',
                          selectedSlot === slot.time
                            ? 'bg-accent text-accent-foreground border-accent'
                            : slot.available
                              ? 'border-border/50 hover:border-accent/50 hover:bg-accent/5 cursor-pointer'
                              : 'border-border/20 bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through'
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && selectedDate && selectedSlot && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setStep('slot')} className="text-xs">
                  {isRTL ? '← تغيير الوقت' : '← Change time'}
                </Button>

                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4 text-accent" />
                    <span className="font-bold">{format(selectedDate, 'yyyy-MM-dd')}</span>
                    <span className="text-muted-foreground tech-content">
                      {selectedSlot} - {timeSlots.find(s => s.time === selectedSlot)?.endTime}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{businessName}</p>
                </div>

                <Textarea
                  placeholder={isRTL ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  className="min-h-[70px]"
                />

                <Button
                  className="w-full gap-2"
                  onClick={() => createBooking.mutate()}
                  disabled={createBooking.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {createBooking.isPending
                    ? (isRTL ? 'جاري الحجز...' : 'Booking...')
                    : (isRTL ? 'تأكيد الحجز' : 'Confirm Booking')
                  }
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
