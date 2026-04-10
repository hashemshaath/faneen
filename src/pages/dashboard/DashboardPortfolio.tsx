import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Star, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PortfolioItem {
  id: string;
  business_id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  media_url: string;
  media_type: string;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

const SortableCard = ({
  item,
  isRTL,
  onDelete,
}: {
  item: PortfolioItem;
  isRTL: boolean;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden group relative border-border/50 ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''}`}
    >
      <div className="aspect-square bg-muted relative">
        <img
          src={item.media_url}
          alt={isRTL ? item.title_ar : (item.title_en || item.title_ar)}
          className="w-full h-full object-cover"
        />
        {item.is_featured && (
          <span className="absolute top-2 start-2 bg-gold text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />{isRTL ? 'مميز' : 'Featured'}
          </span>
        )}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 end-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          title={isRTL ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
        >
          <GripVertical className="w-4 h-4 text-foreground" />
        </button>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <Button variant="secondary" size="icon" className="pointer-events-auto" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium truncate">{isRTL ? item.title_ar : (item.title_en || item.title_ar)}</p>
      </CardContent>
    </Card>
  );
};

const DashboardPortfolio = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title_ar: '', title_en: '', description_ar: '', description_en: '',
    media_url: '', media_type: 'image', is_featured: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fetch user's business first
  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const businessId = business?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dashboard-portfolio', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order');
      return (data ?? []) as PortfolioItem[];
    },
    enabled: !!businessId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('No business found');
      const { error } = await supabase.from('portfolio_items').insert({
        business_id: businessId,
        title_ar: form.title_ar,
        title_en: form.title_en || null,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        media_url: form.media_url,
        media_type: form.media_type,
        is_featured: form.is_featured,
        sort_order: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      setDialogOpen(false);
      setForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', media_url: '', media_type: 'image', is_featured: false });
      toast.success(isRTL ? 'تم الإضافة' : 'Added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedItems: PortfolioItem[]) => {
      const updates = reorderedItems.map((item, index) =>
        supabase.from('portfolio_items').update({ sort_order: index }).eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-portfolio'] });
      toast.error(isRTL ? 'فشل حفظ الترتيب' : 'Failed to save order');
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    queryClient.setQueryData(['dashboard-portfolio', businessId], reordered);
    reorderMutation.mutate(reordered);
    toast.success(isRTL ? 'تم تحديث الترتيب' : 'Order updated');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl">{isRTL ? 'معرض الأعمال' : 'Portfolio'}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'أضف صور وفيديوهات أعمالك — اسحب لإعادة الترتيب' : 'Add photos and videos — drag to reorder'}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 me-1" />{isRTL ? 'إضافة عمل' : 'Add Work'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{isRTL ? 'إضافة عمل جديد' : 'Add New Work'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} *</Label>
                    <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}</Label>
                    <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'صورة العمل' : 'Work Image'} *</Label>
                  <ImageUpload
                    bucket="portfolio-images"
                    value={form.media_url}
                    onChange={(url) => setForm({ ...form, media_url: url })}
                    onRemove={() => setForm({ ...form, media_url: '' })}
                    aspectRatio="square"
                    placeholder={isRTL ? 'اضغط لرفع صورة' : 'Click to upload image'}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={2} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label>{isRTL ? 'عمل مميز' : 'Featured'}</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title_ar || !form.media_url || saveMutation.isPending} className="w-full" variant="hero">
                  {saveMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{isRTL ? 'لا توجد أعمال بعد' : 'No portfolio items yet'}</p>
              <p className="text-sm">{isRTL ? 'أضف أعمالك لعرضها للعملاء' : 'Add your work to showcase to clients'}</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <SortableCard
                    key={item.id}
                    item={item}
                    isRTL={isRTL}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPortfolio;
