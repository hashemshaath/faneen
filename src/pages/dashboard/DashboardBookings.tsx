import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CalendarClock, Clock, CheckCircle2, XCircle, AlertCircle, User,
  Phone, FileText, Calendar, ChevronLeft, ChevronRight, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

const statusConfig: Record<BookingStatus, { label: { ar: string; en: string }; color: string; icon: React.ElementType }> = {
  pending: { label: { ar: 'بانتظار التأكيد', en: 'Pending' }, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', icon: AlertCircle },
  confirmed: { label: { ar: 'مؤكد', en: 'Confirmed' }, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  cancelled: { label: { ar: 'ملغي', en: 'Cancelled' }, color: 'bg-destructive/15 text-destructive', icon: XCircle },
  completed: { label: { ar: 'مكتمل', en: 'Completed' }, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', icon: CheckCircle2 },
  no_show: { label: { ar: 'لم يحضر', en: 'No Show' }, color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const dayLabels = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const DashboardBookings = () => {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bookings');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelDialog, setCancelDialog] = useState<{ id: string; isProvider: boolean } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [availabilityDialog, setAvailabilityDialog] = useState(false);

  usePageMeta({
    title: language === 'ar' ? 'حجز المواعيد | فنيين' : 'Bookings | Faneen',
    noindex: true,
  });

  // Check if user is a provider
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, name_ar, name_en').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isProvider = !!business;

  // Fetch bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id, isProvider, business?.id],
    queryFn: async () => {
      let query = supabase.from('bookings').select('*, businesses(name_ar, name_en, logo_url, username)');
      if (isProvider && business) {
        query = query.eq('business_id', business.id);
      } else {
        query = query.eq('client_id', user!.id);
      }
      const { data } = await query.order('booking_date', { ascending: false }).order('start_time', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch client profiles for provider view
  const clientIds = useMemo(() => {
    if (!isProvider) return [];
    return [...new Set(bookings.map((b) => b.client_id))];
  }, [bookings, isProvider]);

  const { data: clientProfiles = {} } = useQuery({
    queryKey: ['booking-client-profiles', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return {};
      const { data } = await supabase.from('profiles').select('user_id, full_name, phone, avatar_url').in('user_id', clientIds);
      const map: Record<string, any> = {};
      data?.forEach((p) => { map[p.user_id] = p; });
      return map;
    },
    enabled: clientIds.length > 0,
  });

  // Fetch availability
  const { data: availability = [] } = useQuery({
    queryKey: ['business-availability', business?.id],
    queryFn: async () => {
      const { data } = await supabase.from('business_availability').select('*').eq('business_id', business!.id).order('day_of_week');
      return data || [];
    },
    enabled: !!business,
  });

  // Update booking status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: BookingStatus; reason?: string }) => {
      const updateData: Record<string, string> = { status };
      if (status === 'cancelled') {
        updateData.cancellation_reason = reason || null;
        updateData.cancelled_by = user!.id;
      }
      const { error } = await supabase.from('bookings').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success(isRTL ? 'تم تحديث الحجز' : 'Booking updated');
      setCancelDialog(null);
      setCancelReason('');
    },
    onError: () => toast.error(isRTL ? 'فشل تحديث الحجز' : 'Failed to update booking'),
  });

  // Save availability
  const saveAvailability = useMutation({
    mutationFn: async (slots: { day_of_week: number; is_active: boolean; start_time: string; end_time: string; slot_duration_minutes: number; max_bookings_per_slot: number }[]) => {
      if (!business) return;
      // Delete existing then insert
      await supabase.from('business_availability').delete().eq('business_id', business.id);
      if (slots.length > 0) {
        const { error } = await supabase.from('business_availability').insert(
          slots.map(s => ({ ...s, business_id: business.id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-availability'] });
      toast.success(isRTL ? 'تم حفظ أوقات العمل' : 'Availability saved');
      setAvailabilityDialog(false);
    },
    onError: () => toast.error(isRTL ? 'فشل الحفظ' : 'Failed to save'),
  });

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      today: bookings.filter((b) => b.booking_date === today && ['pending', 'confirmed'].includes(b.status)).length,
    };
  }, [bookings]);

  const handleConfirm = useCallback((id: string) => updateStatus.mutate({ id, status: 'confirmed' }), [updateStatus]);
  const handleComplete = useCallback((id: string) => updateStatus.mutate({ id, status: 'completed' }), [updateStatus]);
  const handleNoShow = useCallback((id: string) => updateStatus.mutate({ id, status: 'no_show' }), [updateStatus]);
  const handleCancel = useCallback(() => {
    if (!cancelDialog) return;
    updateStatus.mutate({ id: cancelDialog.id, status: 'cancelled', reason: cancelReason });
  }, [cancelDialog, cancelReason, updateStatus]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
              <CalendarClock className="inline-block w-6 h-6 me-2 text-accent" />
              {isRTL ? 'حجز المواعيد' : 'Bookings'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isProvider
                ? (isRTL ? 'إدارة مواعيد العملاء وأوقات العمل' : 'Manage client appointments and working hours')
                : (isRTL ? 'تتبع حجوزاتك لدى مزودي الخدمات' : 'Track your bookings with service providers')
              }
            </p>
          </div>
          {isProvider && (
            <Button variant="outline" className="gap-2" onClick={() => setAvailabilityDialog(true)}>
              <Settings2 className="w-4 h-4" />
              {isRTL ? 'أوقات العمل' : 'Working Hours'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: { ar: 'إجمالي', en: 'Total' }, value: stats.total, icon: CalendarClock, color: 'text-accent' },
            { label: { ar: 'بانتظار التأكيد', en: 'Pending' }, value: stats.pending, icon: AlertCircle, color: 'text-amber-500' },
            { label: { ar: 'مؤكد', en: 'Confirmed' }, value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: { ar: 'اليوم', en: 'Today' }, value: stats.today, icon: Calendar, color: 'text-blue-500' },
          ].map((s, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color} shrink-0`} />
                <div>
                  <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? s.label.ar : s.label.en}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{isRTL ? 'تصفية:' : 'Filter:'}</span>
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all'
                ? (isRTL ? 'الكل' : 'All')
                : (language === 'ar' ? statusConfig[s as BookingStatus].label.ar : statusConfig[s as BookingStatus].label.en)
              }
            </Button>
          ))}
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <CalendarClock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{isRTL ? 'لا توجد حجوزات' : 'No bookings yet'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isProvider
                  ? (isRTL ? 'ستظهر حجوزات العملاء هنا' : 'Client bookings will appear here')
                  : (isRTL ? 'يمكنك حجز موعد من صفحة المزود' : 'You can book from a provider page')
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const cfg = statusConfig[booking.status as BookingStatus];
              const StatusIcon = cfg.icon;
              const client = clientProfiles[booking.client_id];
              const bizName = language === 'ar' ? booking.businesses?.name_ar : (booking.businesses?.name_en || booking.businesses?.name_ar);

              return (
                <Card key={booking.id} className="border-border/40 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Date block */}
                      <div className="flex sm:flex-col items-center gap-2 sm:gap-0 sm:min-w-[70px] sm:text-center shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-accent/10 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold font-heading text-accent leading-none">
                            {new Date(booking.booking_date).getDate()}
                          </span>
                          <span className="text-[10px] text-accent/70">
                            {format(new Date(booking.booking_date), 'MMM')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground sm:mt-1">
                          {dayLabels[language === 'ar' ? 'ar' : 'en'][new Date(booking.booking_date).getDay()]}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-heading font-bold text-foreground text-sm sm:text-base">
                              {isProvider ? (client?.full_name || booking.client_name || (isRTL ? 'عميل' : 'Client')) : bizName}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
                              </span>
                              <span className="tech-content text-[10px]">{booking.ref_id}</span>
                            </div>
                          </div>
                          <Badge className={`${cfg.color} border-0 text-[11px] gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {language === 'ar' ? cfg.label.ar : cfg.label.en}
                          </Badge>
                        </div>

                        {/* Contact info for provider */}
                        {isProvider && (client?.phone || booking.client_phone) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span className="tech-content">{client?.phone || booking.client_phone}</span>
                          </div>
                        )}

                        {booking.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            <FileText className="w-3 h-3 inline me-1" />
                            {booking.notes}
                          </p>
                        )}

                        {booking.cancellation_reason && (
                          <p className="text-xs text-destructive/80 mt-1">
                            {isRTL ? 'سبب الإلغاء: ' : 'Reason: '}{booking.cancellation_reason}
                          </p>
                        )}

                        {/* Actions */}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {isProvider && booking.status === 'pending' && (
                              <Button size="sm" variant="default" className="text-xs gap-1" onClick={() => handleConfirm(booking.id)} disabled={updateStatus.isPending}>
                                <CheckCircle2 className="w-3 h-3" />
                                {isRTL ? 'تأكيد' : 'Confirm'}
                              </Button>
                            )}
                            {isProvider && booking.status === 'confirmed' && (
                              <>
                                <Button size="sm" variant="default" className="text-xs gap-1" onClick={() => handleComplete(booking.id)} disabled={updateStatus.isPending}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isRTL ? 'مكتمل' : 'Complete'}
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleNoShow(booking.id)} disabled={updateStatus.isPending}>
                                  {isRTL ? 'لم يحضر' : 'No Show'}
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-destructive hover:text-destructive gap-1"
                              onClick={() => setCancelDialog({ id: booking.id, isProvider })}
                              disabled={updateStatus.isPending}
                            >
                              <XCircle className="w-3 h-3" />
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إلغاء الحجز' : 'Cancel Booking'}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'سبب الإلغاء (اختياري)' : 'Cancellation reason (optional)'}
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialog(null)}>{isRTL ? 'تراجع' : 'Back'}</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={updateStatus.isPending}>
              {isRTL ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Dialog */}
      {isProvider && (
        <AvailabilityDialog
          open={availabilityDialog}
          onOpenChange={setAvailabilityDialog}
          availability={availability}
          onSave={(slots) => saveAvailability.mutate(slots)}
          saving={saveAvailability.isPending}
          language={language}
          isRTL={isRTL}
        />
      )}
    </DashboardLayout>
  );
};

// ── Availability Settings Dialog ──
const AvailabilityDialog = ({
  open, onOpenChange, availability, onSave, saving, language, isRTL,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availability: { day_of_week: number; is_active: boolean; start_time: string; end_time: string; slot_duration_minutes: number; max_bookings_per_slot: number }[];
  onSave: (slots: { day_of_week: number; is_active: boolean; start_time: string; end_time: string; slot_duration_minutes: number; max_bookings_per_slot: number }[]) => void;
  saving: boolean;
  language: string;
  isRTL: boolean;
}) => {
  const [slots, setSlots] = useState(() => {
    const defaults = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: '08:00',
      end_time: '17:00',
      slot_duration_minutes: 30,
      max_bookings_per_slot: 1,
      is_active: i >= 0 && i <= 4, // Sun-Thu active by default
    }));
    if (availability.length > 0) {
      availability.forEach((a) => {
        const idx = defaults.findIndex(d => d.day_of_week === a.day_of_week);
        if (idx >= 0) {
          defaults[idx] = {
            day_of_week: a.day_of_week,
            start_time: a.start_time?.slice(0, 5) || '08:00',
            end_time: a.end_time?.slice(0, 5) || '17:00',
            slot_duration_minutes: a.slot_duration_minutes || 30,
            max_bookings_per_slot: a.max_bookings_per_slot || 1,
            is_active: a.is_active,
          };
        }
      });
    }
    return defaults;
  });

  const updateSlot = (day: number, field: string, value: string | number | boolean) => {
    setSlots(prev => prev.map(s => s.day_of_week === day ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    onSave(slots.filter(s => s.is_active));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-accent" />
            {isRTL ? 'أوقات العمل' : 'Working Hours'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {slots.map(slot => (
            <div
              key={slot.day_of_week}
              className={`p-3 rounded-xl border transition-colors ${slot.is_active ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-muted/30 opacity-60'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="font-heading font-bold text-sm">
                  {dayLabels[language === 'ar' ? 'ar' : 'en'][slot.day_of_week]}
                </Label>
                <Switch
                  checked={slot.is_active}
                  onCheckedChange={v => updateSlot(slot.day_of_week, 'is_active', v)}
                />
              </div>
              {slot.is_active && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{isRTL ? 'من' : 'From'}</Label>
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={e => updateSlot(slot.day_of_week, 'start_time', e.target.value)}
                      className="h-8 text-xs tech-content"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{isRTL ? 'إلى' : 'To'}</Label>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={e => updateSlot(slot.day_of_week, 'end_time', e.target.value)}
                      className="h-8 text-xs tech-content"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{isRTL ? 'مدة الموعد (دقيقة)' : 'Slot (min)'}</Label>
                    <Select value={String(slot.slot_duration_minutes)} onValueChange={v => updateSlot(slot.day_of_week, 'slot_duration_minutes', Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[15, 30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} {isRTL ? 'د' : 'min'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{isRTL ? 'الحد الأقصى' : 'Max/slot'}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={slot.max_bookings_per_slot}
                      onChange={e => updateSlot(slot.day_of_week, 'max_bookings_per_slot', Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isRTL ? 'إغلاق' : 'Close'}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardBookings;
