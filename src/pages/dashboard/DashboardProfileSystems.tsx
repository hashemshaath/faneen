import React, { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Layers, Thermometer, Volume2, Shield, X,
  Search, Eye, EyeOff, MoreHorizontal, Copy, GripVertical,
  Pencil, LayoutGrid, List, Filter, Star, Award, Image,
  Ruler, Palette, FileText, ExternalLink, TrendingUp, Loader2,
  ChevronDown, Hash, Package
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const categoryOptions = [
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum', icon: '🪟', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'kitchen', ar: 'المطابخ', en: 'Kitchens', icon: '🍽️', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'iron', ar: 'الحديد', en: 'Iron', icon: '🔩', color: 'bg-slate-500/10 text-slate-600' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass', icon: '🪞', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'wood', ar: 'الخشب', en: 'Wood', icon: '🪵', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'upvc', ar: 'UPVC', en: 'UPVC', icon: '🏠', color: 'bg-emerald-500/10 text-emerald-600' },
];

const recommendationStyles: Record<string, { ar: string; en: string; color: string }> = {
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-blue-500/10 text-blue-600' },
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-amber-500/10 text-amber-600' },
};

const getCategoryInfo = (val: string) => categoryOptions.find(c => c.value === val) || categoryOptions[0];

interface ProfileForm {
  name_ar: string; name_en: string; slug: string; description_ar: string; description_en: string;
  category: string; profile_type: string; cover_image_url: string; logo_url: string;
  thermal_insulation_rating: number; sound_insulation_rating: number; strength_rating: number;
  max_height_mm: string; max_width_mm: string; available_colors: string;
  features_ar: string; features_en: string; recommendation_level: string;
  applications_ar: string; applications_en: string; status: string;
}

const initialForm: ProfileForm = {
  name_ar: '', name_en: '', slug: '', description_ar: '', description_en: '',
  category: 'aluminum', profile_type: 'market', cover_image_url: '', logo_url: '',
  thermal_insulation_rating: 5, sound_insulation_rating: 5, strength_rating: 5,
  max_height_mm: '', max_width_mm: '', available_colors: '',
  features_ar: '', features_en: '', recommendation_level: 'standard',
  applications_ar: '', applications_en: '', status: 'published',
};

// ── Rating Bar ──
const RatingBar = ({ value, max = 10, color }: { value: number; max?: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
    <span className="text-[10px] tabular-nums text-muted-foreground">{value}/{max}</span>
  </div>
);

// ── Sortable Profile Row ──
const SortableProfileRow = React.memo(({
  profile, isRTL, language, onEdit, onDelete, onDuplicate, onToggleStatus,
}: {
  profile: any; isRTL: boolean; language: string;
  onEdit: (p) => void; onDelete: (id: string) => void;
  onDuplicate: (p) => void; onToggleStatus: (id: string, status: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: profile.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const cat = getCategoryInfo(profile.category);
  const rec = recommendationStyles[profile.recommendation_level] || recommendationStyles.standard;
  const avgRating = Math.round(((profile.thermal_insulation_rating || 0) + (profile.sound_insulation_rating || 0) + (profile.strength_rating || 0)) / 3);

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-3 py-3 px-3 border-b border-border/40 hover:bg-accent/5 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent/10 text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none">
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Cover image */}
      {profile.cover_image_url ? (
        <div className="w-16 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
          <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="w-16 h-11 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <span className="text-lg">{cat.icon}</span>
        </div>
      )}

      {/* Name & meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{language === 'ar' ? profile.name_ar : (profile.name_en || profile.name_ar)}</span>
          {profile.recommendation_level === 'premium' && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span className="truncate max-w-[100px]">{language === 'ar' ? (profile.name_en || '') : profile.name_ar}</span>
          {profile.slug && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <span dir="ltr" className="text-muted-foreground/60 truncate max-w-[80px]">{profile.slug}</span>
            </>
          )}
        </div>
      </div>

      {/* Category badge */}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 font-normal shrink-0 ${cat.color}`}>
        <span>{cat.icon}</span>
        {isRTL ? cat.ar : cat.en}
      </Badge>

      {/* Recommendation */}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-normal shrink-0 hidden sm:flex ${rec.color}`}>
        {isRTL ? rec.ar : rec.en}
      </Badge>

      {/* Ratings mini */}
      <div className="hidden lg:flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Thermometer className="w-3 h-3 text-red-400" />
          <RatingBar value={profile.thermal_insulation_rating || 0} color="bg-red-400" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Volume2 className="w-3 h-3 text-blue-400" />
          <RatingBar value={profile.sound_insulation_rating || 0} color="bg-blue-400" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3 text-emerald-400" />
          <RatingBar value={profile.strength_rating || 0} color="bg-emerald-400" />
        </div>
      </div>

      {/* Status dot */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`w-2 h-2 rounded-full shrink-0 ${profile.status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {profile.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(profile)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44">
            <DropdownMenuItem onClick={() => onEdit(profile)} className="gap-2 text-xs"><Pencil className="w-3.5 h-3.5" />{isRTL ? 'تعديل' : 'Edit'}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(profile)} className="gap-2 text-xs"><Copy className="w-3.5 h-3.5" />{isRTL ? 'تكرار' : 'Duplicate'}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(profile.id, profile.status === 'published' ? 'draft' : 'published')} className="gap-2 text-xs">
              {profile.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {profile.status === 'published' ? (isRTL ? 'إلغاء النشر' : 'Unpublish') : (isRTL ? 'نشر' : 'Publish')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(profile.id)} className="gap-2 text-xs text-destructive"><Trash2 className="w-3.5 h-3.5" />{isRTL ? 'حذف' : 'Delete'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
SortableProfileRow.displayName = 'SortableProfileRow';

// ── Drag Overlay ──
const DragOverlayProfile = ({ profile, isRTL }: { profile: any; isRTL: boolean }) => {
  const cat = getCategoryInfo(profile.category);
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 bg-card border border-primary/30 rounded-xl shadow-xl">
      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
      <span>{cat.icon}</span>
      <span className="font-medium text-sm">{profile.name_ar}</span>
    </div>
  );
};

// ══════════════ Main Component ══════════════
const DashboardProfileSystems = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [formTab, setFormTab] = useState('basic');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profile-systems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profile_systems').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Stats
  const stats = useMemo(() => {
    const published = profiles.filter((p) => p.status === 'published').length;
    const draft = profiles.filter((p) => p.status === 'draft').length;
    const categoryCounts = profiles.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>);
    const avgRating = profiles.length > 0 ? Math.round(profiles.reduce((sum: number, p) => sum + ((p.thermal_insulation_rating || 0) + (p.sound_insulation_rating || 0) + (p.strength_rating || 0)) / 3, 0) / profiles.length) : 0;
    return { total: profiles.length, published, draft, categoryCounts, avgRating };
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter((p) =>
      (!search || p.name_ar.includes(search) || (p.name_en || '').toLowerCase().includes(q) || p.slug.includes(q)) &&
      (filterCategory === 'all' || p.category === filterCategory) &&
      (filterStatus === 'all' || p.status === filterStatus)
    );
  }, [profiles, search, filterCategory, filterStatus]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() || `profile-${Date.now()}`;

  const closeForm = useCallback(() => { setShowForm(false); setForm(initialForm); setEditId(null); setFormTab('basic'); }, []);

  const openEdit = useCallback((p) => {
    setForm({
      name_ar: p.name_ar, name_en: p.name_en || '', slug: p.slug,
      description_ar: p.description_ar || '', description_en: p.description_en || '',
      category: p.category, profile_type: p.profile_type,
      cover_image_url: p.cover_image_url || '', logo_url: p.logo_url || '',
      thermal_insulation_rating: p.thermal_insulation_rating || 5,
      sound_insulation_rating: p.sound_insulation_rating || 5,
      strength_rating: p.strength_rating || 5,
      max_height_mm: p.max_height_mm?.toString() || '', max_width_mm: p.max_width_mm?.toString() || '',
      available_colors: (p.available_colors || []).join(', '),
      features_ar: (p.features_ar || []).join('\n'), features_en: (p.features_en || []).join('\n'),
      recommendation_level: p.recommendation_level, applications_ar: p.applications_ar || '',
      applications_en: p.applications_en || '', status: p.status,
    });
    setEditId(p.id);
    setShowForm(true);
    setFormTab('basic');
  }, []);

  const handleDuplicate = useCallback((p) => {
    setForm({
      name_ar: p.name_ar + (isRTL ? ' (نسخة)' : ' (copy)'),
      name_en: (p.name_en || '') + ' (copy)', slug: p.slug + '-copy',
      description_ar: p.description_ar || '', description_en: p.description_en || '',
      category: p.category, profile_type: p.profile_type,
      cover_image_url: p.cover_image_url || '', logo_url: p.logo_url || '',
      thermal_insulation_rating: p.thermal_insulation_rating || 5,
      sound_insulation_rating: p.sound_insulation_rating || 5,
      strength_rating: p.strength_rating || 5,
      max_height_mm: p.max_height_mm?.toString() || '', max_width_mm: p.max_width_mm?.toString() || '',
      available_colors: (p.available_colors || []).join(', '),
      features_ar: (p.features_ar || []).join('\n'), features_en: (p.features_en || []).join('\n'),
      recommendation_level: p.recommendation_level, applications_ar: p.applications_ar || '',
      applications_en: p.applications_en || '', status: 'draft',
    });
    setEditId(null);
    setShowForm(true);
    setFormTab('basic');
  }, [isRTL]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || generateSlug(form.name_en || form.name_ar);
      const payload = {
        name_ar: form.name_ar, name_en: form.name_en || null, slug,
        description_ar: form.description_ar || null, description_en: form.description_en || null,
        category: form.category, profile_type: form.profile_type,
        cover_image_url: form.cover_image_url || null, logo_url: form.logo_url || null,
        thermal_insulation_rating: form.thermal_insulation_rating,
        sound_insulation_rating: form.sound_insulation_rating,
        strength_rating: form.strength_rating,
        max_height_mm: form.max_height_mm ? Number(form.max_height_mm) : null,
        max_width_mm: form.max_width_mm ? Number(form.max_width_mm) : null,
        available_colors: form.available_colors ? form.available_colors.split(',').map(s => s.trim()).filter(Boolean) : [],
        features_ar: form.features_ar ? form.features_ar.split('\n').filter(Boolean) : [],
        features_en: form.features_en ? form.features_en.split('\n').filter(Boolean) : [],
        recommendation_level: form.recommendation_level,
        applications_ar: form.applications_ar || null, applications_en: form.applications_en || null,
        status: form.status,
      };
      if (editId) {
        const { error } = await supabase.from('profile_systems').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profile_systems').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] }); toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved'); closeForm(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profile_systems').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] }); setDeletingId(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: () => toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('profile_systems').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] }); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        await supabase.from('profile_systems').update({ sort_order: u.sort_order }).eq('id', u.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-profile-systems'] }),
  });

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), []);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex((p) => p.id === active.id);
    const newIdx = filtered.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const updates = filtered.map((p, i: number) => ({ id: p.id, sort_order: p.id === active.id ? newIdx : i }));
    reorderMutation.mutate(updates);
  }, [filtered, reorderMutation]);

  const activeProfile = activeId ? filtered.find((p) => p.id === activeId) : null;

  // Form completion
  const formCompletion = useMemo(() => {
    let filled = 0; const total = 8;
    if (form.name_ar) filled++;
    if (form.name_en) filled++;
    if (form.description_ar) filled++;
    if (form.cover_image_url) filled++;
    if (form.features_ar) filled++;
    if (form.applications_ar) filled++;
    if (form.available_colors) filled++;
    if (form.max_height_mm || form.max_width_mm) filled++;
    return Math.round((filled / total) * 100);
  }, [form]);

  const RatingSlider = ({ label, icon: Icon, value, onChange, color }: { label: string; icon: React.ElementType; value: number; onChange: (v: number) => void; color: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs"><Icon className={`w-3.5 h-3.5 ${color}`} />{label}</Label>
        <Badge variant="outline" className="text-[10px] font-mono px-1.5">{value}/10</Badge>
      </div>
      <Slider value={[value]} onValueChange={v => onChange(v[0])} max={10} step={1} />
    </div>
  );

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                {isRTL ? 'إدارة القطاعات' : 'Profile Systems'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isRTL ? 'إضافة وإدارة قطاعات الألمنيوم والمواد مع التقييمات الفنية' : 'Manage aluminum & material profiles with technical ratings'}
              </p>
            </div>
            <Button onClick={() => { closeForm(); setShowForm(true); }} className="gap-2 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />{isRTL ? 'إضافة قطاع' : 'Add Profile'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'إجمالي القطاعات' : 'Total Profiles', value: stats.total, icon: Layers, color: 'text-primary bg-primary/10' },
              { label: isRTL ? 'منشور' : 'Published', value: stats.published, icon: Eye, color: 'text-emerald-600 bg-emerald-500/10' },
              { label: isRTL ? 'مسودة' : 'Draft', value: stats.draft, icon: FileText, color: 'text-amber-600 bg-amber-500/10' },
              { label: isRTL ? 'متوسط التقييم' : 'Avg Rating', value: `${stats.avgRating}/10`, icon: TrendingUp, color: 'text-blue-600 bg-blue-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Category quick filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant={filterCategory === 'all' ? 'default' : 'outline'} size="sm" className="h-8 rounded-lg text-xs gap-1.5" onClick={() => setFilterCategory('all')}>
              <Filter className="w-3 h-3" />{isRTL ? 'الكل' : 'All'} ({stats.total})
            </Button>
            {categoryOptions.map(c => (
              <Button key={c.value} variant={filterCategory === c.value ? 'default' : 'outline'} size="sm" className="h-8 rounded-lg text-xs gap-1.5" onClick={() => setFilterCategory(c.value)}>
                <span>{c.icon}</span>{isRTL ? c.ar : c.en} ({stats.categoryCounts[c.value] || 0})
              </Button>
            ))}
          </div>

          {/* Form */}
          {showForm && (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {editId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editId ? (isRTL ? 'تعديل القطاع' : 'Edit Profile') : (isRTL ? 'قطاع جديد' : 'New Profile')}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <TrendingUp className="w-3 h-3" /> {formCompletion}%
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm}><X className="w-4 h-4" /></Button>
                </div>
                <Progress value={formCompletion} className="h-1 mt-2" />
              </CardHeader>
              <CardContent>
                <Tabs value={formTab} onValueChange={setFormTab}>
                  <TabsList className="mb-4 w-full justify-start">
                    <TabsTrigger value="basic" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" />{isRTL ? 'أساسي' : 'Basic'}</TabsTrigger>
                    <TabsTrigger value="ratings" className="text-xs gap-1.5"><TrendingUp className="w-3.5 h-3.5" />{isRTL ? 'التقييمات' : 'Ratings'}</TabsTrigger>
                    <TabsTrigger value="specs" className="text-xs gap-1.5"><Ruler className="w-3.5 h-3.5" />{isRTL ? 'المواصفات' : 'Specs'}</TabsTrigger>
                    <TabsTrigger value="media" className="text-xs gap-1.5"><Image className="w-3.5 h-3.5" />{isRTL ? 'الوسائط' : 'Media'}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="h-9" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="h-9" dir="ltr" /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="h-9" dir="ltr" placeholder="auto" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'الفئة' : 'Category'}</Label>
                        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {isRTL ? c.ar : c.en}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'النوع' : 'Type'}</Label>
                        <Select value={form.profile_type} onValueChange={v => setForm(f => ({ ...f, profile_type: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="market">{isRTL ? 'قطاع سوق' : 'Market'}</SelectItem>
                            <SelectItem value="custom">{isRTL ? 'تصميم خاص' : 'Custom'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{isRTL ? 'مستوى التوصية' : 'Recommendation'}</Label>
                        <Select value={form.recommendation_level} onValueChange={v => setForm(f => ({ ...f, recommendation_level: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">{isRTL ? 'قياسي' : 'Standard'}</SelectItem>
                            <SelectItem value="recommended">⭐ {isRTL ? 'موصى به' : 'Recommended'}</SelectItem>
                            <SelectItem value="premium">🏆 {isRTL ? 'احترافي' : 'Premium'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الوصف (عربي)' : 'Description (AR)'}</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={3} className="text-sm" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label><Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} className="text-sm" dir="ltr" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">{isRTL ? 'الحالة' : 'Status'}</Label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                          <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="ratings" className="space-y-5 mt-0">
                    <div className="p-4 rounded-xl bg-muted/30 space-y-4">
                      <h4 className="font-heading font-bold text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />{isRTL ? 'التقييمات الفنية' : 'Technical Ratings'}</h4>
                      <RatingSlider label={isRTL ? 'العزل الحراري' : 'Thermal Insulation'} icon={Thermometer} color="text-red-400" value={form.thermal_insulation_rating} onChange={v => setForm(f => ({ ...f, thermal_insulation_rating: v }))} />
                      <RatingSlider label={isRTL ? 'العزل الصوتي' : 'Sound Insulation'} icon={Volume2} color="text-blue-400" value={form.sound_insulation_rating} onChange={v => setForm(f => ({ ...f, sound_insulation_rating: v }))} />
                      <RatingSlider label={isRTL ? 'قوة التحمل' : 'Strength'} icon={Shield} color="text-emerald-400" value={form.strength_rating} onChange={v => setForm(f => ({ ...f, strength_rating: v }))} />
                    </div>
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs text-muted-foreground">
                      💡 {isRTL ? 'تحرك المؤشر من 0 إلى 10 لتقييم الخاصية الفنية. القيمة الافتراضية 5.' : 'Slide from 0 to 10 to rate. Default is 5.'}
                    </div>
                  </TabsContent>

                  <TabsContent value="specs" className="space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Ruler className="w-3 h-3" />{isRTL ? 'أقصى ارتفاع (mm)' : 'Max Height (mm)'}</Label><Input type="number" value={form.max_height_mm} onChange={e => setForm(f => ({ ...f, max_height_mm: e.target.value }))} className="h-9" dir="ltr" /></div>
                      <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Ruler className="w-3 h-3" />{isRTL ? 'أقصى عرض (mm)' : 'Max Width (mm)'}</Label><Input type="number" value={form.max_width_mm} onChange={e => setForm(f => ({ ...f, max_width_mm: e.target.value }))} className="h-9" dir="ltr" /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Palette className="w-3 h-3" />{isRTL ? 'الألوان المتاحة (مفصولة بفاصلة)' : 'Available Colors (comma-separated)'}</Label><Input value={form.available_colors} onChange={e => setForm(f => ({ ...f, available_colors: e.target.value }))} className="h-9" placeholder={isRTL ? 'أبيض, رمادي, أسود, بني' : 'White, Gray, Black, Brown'} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'المميزات (سطر لكل ميزة)' : 'Features AR (one per line)'}</Label><Textarea value={form.features_ar} onChange={e => setForm(f => ({ ...f, features_ar: e.target.value }))} rows={4} className="text-sm" placeholder={isRTL ? 'عزل حراري ممتاز\nمقاوم للتآكل' : ''} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'المميزات (إنجليزي)' : 'Features EN (one per line)'}</Label><Textarea value={form.features_en} onChange={e => setForm(f => ({ ...f, features_en: e.target.value }))} rows={4} className="text-sm" dir="ltr" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاستخدامات (عربي)' : 'Applications (AR)'}</Label><Textarea value={form.applications_ar} onChange={e => setForm(f => ({ ...f, applications_ar: e.target.value }))} rows={2} className="text-sm" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاستخدامات (إنجليزي)' : 'Applications (EN)'}</Label><Textarea value={form.applications_en} onChange={e => setForm(f => ({ ...f, applications_en: e.target.value }))} rows={2} className="text-sm" dir="ltr" /></div>
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="space-y-4 mt-0">
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Image className="w-3 h-3" />{isRTL ? 'رابط صورة الغلاف' : 'Cover Image URL'}</Label><Input value={form.cover_image_url} onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))} className="h-9" dir="ltr" /></div>
                    {form.cover_image_url && (
                      <div className="w-full h-40 rounded-xl overflow-hidden bg-muted">
                        <img src={form.cover_image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Package className="w-3 h-3" />{isRTL ? 'رابط الشعار' : 'Logo URL'}</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} className="h-9" dir="ltr" /></div>
                    {form.logo_url && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted border">
                        <img src={form.logo_url} alt="" className="w-full h-full object-contain p-2" />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 mt-4">
                  <Button onClick={() => saveMutation.mutate()} disabled={!form.name_ar.trim() || saveMutation.isPending} className="gap-2 flex-1 rounded-lg">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editId ? (isRTL ? 'تحديث القطاع' : 'Update Profile') : (isRTL ? 'إضافة القطاع' : 'Add Profile')}
                  </Button>
                  <Button variant="outline" onClick={closeForm} className="rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Toolbar */}
          <Card className="border-border/50">
            <CardContent className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '10px' }} />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث في القطاعات...' : 'Search profiles...'} className="ps-9 h-9" />
                {search && <button onClick={() => setSearch('')} className="absolute top-2.5 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}><X className="w-4 h-4" /></button>}
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-full sm:w-36"><SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</SelectItem>
                  <SelectItem value="published">{isRTL ? 'منشور' : 'Published'}</SelectItem>
                  <SelectItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{isRTL ? 'قائمة' : 'List'}</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" className="h-9 w-9" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{isRTL ? 'شبكي' : 'Grid'}</TooltipContent></Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{isRTL ? 'لا توجد قطاعات' : 'No profiles found'}</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => { closeForm(); setShowForm(true); }}><Plus className="w-4 h-4" />{isRTL ? 'إضافة قطاع' : 'Add Profile'}</Button>
            </CardContent></Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const cat = getCategoryInfo(p.category);
                const rec = recommendationStyles[p.recommendation_level] || recommendationStyles.standard;
                const avgRating = Math.round(((p.thermal_insulation_rating || 0) + (p.sound_insulation_rating || 0) + (p.strength_rating || 0)) / 3);
                return (
                  <Card key={p.id} className="group overflow-hidden border-border/50 hover:shadow-md transition-all">
                    {/* Cover */}
                    <div className="relative h-36 bg-muted">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">{cat.icon}</div>
                      )}
                      <div className="absolute top-2 end-2 flex gap-1.5">
                        <Badge className={`text-[10px] ${p.status === 'published' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                          {p.status === 'published' ? (isRTL ? 'منشور' : 'Published') : (isRTL ? 'مسودة' : 'Draft')}
                        </Badge>
                        {p.recommendation_level === 'premium' && <Badge className="bg-amber-500 text-white text-[10px]">🏆</Badge>}
                      </div>
                      <div className="absolute bottom-2 start-2">
                        <Badge variant="outline" className={`text-[10px] bg-background/80 backdrop-blur-sm ${cat.color}`}>{cat.icon} {isRTL ? cat.ar : cat.en}</Badge>
                      </div>
                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" />{isRTL ? 'تعديل' : 'Edit'}</Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => setDeletingId(p.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-heading font-bold text-sm truncate">{language === 'ar' ? p.name_ar : (p.name_en || p.name_ar)}</h3>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{language === 'ar' ? (p.name_en || '') : p.name_ar}</p>
                      {/* Ratings */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-1.5"><Thermometer className="w-3 h-3 text-red-400" /><RatingBar value={p.thermal_insulation_rating || 0} color="bg-red-400" /></div>
                        <div className="flex items-center gap-1.5"><Volume2 className="w-3 h-3 text-blue-400" /><RatingBar value={p.sound_insulation_rating || 0} color="bg-blue-400" /></div>
                        <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-400" /><RatingBar value={p.strength_rating || 0} color="bg-emerald-400" /></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden border-border/50">
              <div className="flex items-center gap-3 py-2 px-3 bg-muted/30 border-b border-border/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="w-[28px]" />
                <span className="w-16" />
                <span className="flex-1">{isRTL ? 'القطاع' : 'Profile'}</span>
                <span className="w-24 text-center">{isRTL ? 'الفئة' : 'Category'}</span>
                <span className="w-20 text-center hidden sm:block">{isRTL ? 'التوصية' : 'Level'}</span>
                <span className="w-[180px] text-center hidden lg:block">{isRTL ? 'التقييمات' : 'Ratings'}</span>
                <span className="w-2" />
                <span className="w-[64px]" />
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {filtered.map((p) => (
                      <SortableProfileRow
                        key={p.id} profile={p} isRTL={isRTL} language={language}
                        onEdit={openEdit} onDelete={setDeletingId} onDuplicate={handleDuplicate}
                        onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, status })}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {activeProfile && <DragOverlayProfile profile={activeProfile} isRTL={isRTL} />}
                </DragOverlay>
              </DndContext>
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/40 text-[11px] text-muted-foreground">
                <span>{isRTL ? `${filtered.length} قطاع من أصل ${stats.total}` : `${filtered.length} of ${stats.total} profiles`}</span>
                <span className="flex items-center gap-1.5"><GripVertical className="w-3 h-3" />{isRTL ? 'اسحب للترتيب' : 'Drag to reorder'}</span>
              </div>
            </Card>
          )}

          {/* Delete dialog */}
          <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
                <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذا القطاع؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.'}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground">
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}{isRTL ? 'حذف' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default DashboardProfileSystems;
