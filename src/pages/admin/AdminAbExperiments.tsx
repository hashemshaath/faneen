import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { abEvaluate } from '@/modules/admin';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Beaker, Crown, Play, Pause, Trash2, Plus, RefreshCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Experiment {
  id: string;
  key: string;
  description: string | null;
  status: 'draft' | 'running' | 'completed' | 'archived';
  min_sample_per_variant: number;
  confidence_threshold: number;
  auto_promote: boolean;
  winner_variant_id: string | null;
  promoted_at: string | null;
}

interface Variant {
  id: string;
  experiment_id: string;
  key: string;
  content: Record<string, unknown>;
  weight: number;
  is_control: boolean;
  is_active: boolean;
}

interface StatsRow {
  variant_id: string;
  variant_key: string;
  is_control: boolean;
  is_active: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
}

const AdminAbExperiments: React.FC = () => {
  useNoIndex();
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [newExp, setNewExp] = useState({ key: '', description: '' });
  const [newVar, setNewVar] = useState({ key: '', contentJson: '{}', weight: 1, is_control: false });

  const expsQuery = useQuery({
    queryKey: ['ab-experiments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_experiments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
  });

  const selected = useMemo(
    () => expsQuery.data?.find((e) => e.key === selectedKey) ?? expsQuery.data?.[0] ?? null,
    [expsQuery.data, selectedKey],
  );

  const variantsQuery = useQuery({
    queryKey: ['ab-variants', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_variants')
        .select('*')
        .eq('experiment_id', selected!.id)
        .order('key');
      if (error) throw error;
      return (data ?? []) as Variant[];
    },
  });

  const statsQuery = useQuery({
    queryKey: ['ab-stats', selected?.key],
    enabled: !!selected?.key,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ab_experiment_stats', { p_key: selected!.key });
      if (error) throw error;
      return (data ?? []) as StatsRow[];
    },
    refetchInterval: 15000,
  });

  const createExp = useMutation({
    mutationFn: async () => {
      const key = newExp.key.trim();
      if (!/^[a-z0-9_]{3,40}$/.test(key)) throw new Error('مفتاح غير صالح (a-z, 0-9, _)');
      const { error } = await supabase.from('ab_experiments').insert({
        key,
        description: newExp.description || null,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewExp({ key: '', description: '' });
      void qc.invalidateQueries({ queryKey: ['ab-experiments'] });
      toast.success('تم إنشاء التجربة');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل الإنشاء'),
  });

  const updateExp = useMutation({
    mutationFn: async (patch: Partial<Experiment>) => {
      if (!selected) return;
      const { error } = await supabase.from('ab_experiments').update(patch).eq('id', selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ab-experiments'] });
      toast.success('تم التحديث');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل التحديث'),
  });

  const addVariant = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const key = newVar.key.trim();
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(key)) throw new Error('مفتاح النسخة غير صالح');
      let content: Record<string, unknown> = {};
      try {
        content = JSON.parse(newVar.contentJson || '{}');
      } catch {
        throw new Error('محتوى JSON غير صالح');
      }
      const { error } = await supabase.from('ab_variants').insert([
        {
          experiment_id: selected.id,
          key,
          content: content as Json,
          weight: newVar.weight,
          is_control: newVar.is_control,
          is_active: true,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewVar({ key: '', contentJson: '{}', weight: 1, is_control: false });
      void qc.invalidateQueries({ queryKey: ['ab-variants', selected?.id] });
      void qc.invalidateQueries({ queryKey: ['ab-stats', selected?.key] });
      toast.success('تمت إضافة النسخة');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل الإضافة'),
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Variant> }) => {
      const safePatch: {
        weight?: number;
        is_active?: boolean;
        is_control?: boolean;
        key?: string;
        content?: Json;
      } = {};
      if (patch.weight !== undefined) safePatch.weight = patch.weight;
      if (patch.is_active !== undefined) safePatch.is_active = patch.is_active;
      if (patch.is_control !== undefined) safePatch.is_control = patch.is_control;
      if (patch.key !== undefined) safePatch.key = patch.key;
      if (patch.content !== undefined) safePatch.content = patch.content as Json;
      const { error } = await supabase.from('ab_variants').update(safePatch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ab-variants', selected?.id] });
      void qc.invalidateQueries({ queryKey: ['ab-stats', selected?.key] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل'),
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ab_variants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ab-variants', selected?.id] });
      void qc.invalidateQueries({ queryKey: ['ab-stats', selected?.key] });
      toast.success('تم الحذف');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل الحذف'),
  });

  const evaluateNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await abEvaluate();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['ab-experiments'] });
      void qc.invalidateQueries({ queryKey: ['ab-stats'] });
      toast.success('تم التقييم');
      // eslint-disable-next-line no-console
      console.log('ab-evaluate result:', data);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل التقييم'),
  });

  const promoteManually = useMutation({
    mutationFn: async (variantId: string) => {
      if (!selected) return;
      const { error: e1 } = await supabase
        .from('ab_experiments')
        .update({ status: 'completed', winner_variant_id: variantId, promoted_at: new Date().toISOString() })
        .eq('id', selected.id);
      if (e1) throw e1;
      const variants = variantsQuery.data ?? [];
      await Promise.all(
        variants.map((v) =>
          supabase.from('ab_variants').update({ is_active: v.id === variantId }).eq('id', v.id),
        ),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ab-experiments'] });
      void qc.invalidateQueries({ queryKey: ['ab-variants', selected?.id] });
      toast.success('تمت الترقية يدويًا');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'فشل'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Beaker className="w-6 h-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">تجارب A/B</h1>
          </div>
          <Button onClick={() => evaluateNow.mutate()} disabled={evaluateNow.isPending} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${evaluateNow.isPending ? 'animate-spin' : ''}`} />
            تشغيل التقييم الآن
          </Button>
        </header>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar: experiments list + create */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-3 space-y-2">
                {expsQuery.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (expsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">لا توجد تجارب بعد.</p>
                ) : (
                  expsQuery.data!.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedKey(e.key)}
                      className={`w-full text-start rounded-lg border p-2.5 hover-lift ${
                        selected?.id === e.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm tech-content">{e.key}</span>
                        <span
                          className={`text-[10px] rounded px-1.5 py-0.5 ${
                            e.status === 'running'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : e.status === 'completed'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {e.status}
                        </span>
                      </div>
                      {e.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                      )}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> تجربة جديدة
                </h3>
                <Input
                  placeholder="key (lowercase_snake)"
                  value={newExp.key}
                  onChange={(e) => setNewExp((s) => ({ ...s, key: e.target.value }))}
                  dir="ltr"
                  className="tech-content"
                />
                <Textarea
                  placeholder="الوصف"
                  value={newExp.description}
                  onChange={(e) => setNewExp((s) => ({ ...s, description: e.target.value }))}
                  rows={2}
                />
                <Button size="sm" onClick={() => createExp.mutate()} disabled={createExp.isPending} className="w-full">
                  إنشاء
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main: selected experiment */}
          <div className="space-y-4">
            {!selected ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">اختر تجربة من القائمة.</CardContent></Card>
            ) : (
              <>
                {/* Settings row */}
                <Card>
                  <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                    <div>
                      <Label className="text-xs">الحد الأدنى للعينة لكل نسخة</Label>
                      <Input
                        type="number"
                        defaultValue={selected.min_sample_per_variant}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (Number.isFinite(v) && v > 0 && v !== selected.min_sample_per_variant)
                            updateExp.mutate({ min_sample_per_variant: v });
                        }}
                        dir="ltr"
                        className="tech-content"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">عتبة الثقة (0.5–0.999)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={selected.confidence_threshold}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v) && v > 0.5 && v < 1 && v !== selected.confidence_threshold)
                            updateExp.mutate({ confidence_threshold: v });
                        }}
                        dir="ltr"
                        className="tech-content"
                      />
                    </div>
                    <div className="flex items-center gap-3 h-12 px-3 rounded-xl border">
                      <Switch
                        checked={selected.auto_promote}
                        onCheckedChange={(v) => updateExp.mutate({ auto_promote: v })}
                      />
                      <Label className="text-sm">ترقية تلقائية للفائز</Label>
                    </div>
                    <div className="flex gap-2">
                      {selected.status !== 'running' ? (
                        <Button onClick={() => updateExp.mutate({ status: 'running' })} className="gap-2 flex-1">
                          <Play className="w-4 h-4" /> تشغيل
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => updateExp.mutate({ status: 'draft' })}
                          className="gap-2 flex-1"
                        >
                          <Pause className="w-4 h-4" /> إيقاف
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Stats + variants */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">النسخ والإحصائيات</h3>
                    {variantsQuery.isLoading || statsQuery.isLoading ? (
                      <Skeleton className="h-32" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground">
                            <tr className="border-b">
                              <th className="text-start py-2">النسخة</th>
                              <th className="text-start py-2">الوزن</th>
                              <th className="text-start py-2">الحالة</th>
                              <th className="text-start py-2">عرض</th>
                              <th className="text-start py-2">ضغط</th>
                              <th className="text-start py-2">CTR</th>
                              <th className="text-start py-2">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(variantsQuery.data ?? []).map((v) => {
                              const s = (statsQuery.data ?? []).find((r) => r.variant_id === v.id);
                              const isWinner = selected.winner_variant_id === v.id;
                              return (
                                <tr key={v.id} className="border-b">
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium tech-content">{v.key}</span>
                                      {v.is_control && <span className="text-[10px] rounded bg-muted px-1.5">control</span>}
                                      {isWinner && (
                                        <span className="inline-flex items-center gap-1 text-[10px] rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5">
                                          <Trophy className="w-3 h-3" /> فائز
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2">
                                    <Input
                                      type="number"
                                      defaultValue={v.weight}
                                      onBlur={(e) => {
                                        const w = parseInt(e.target.value, 10);
                                        if (Number.isFinite(w) && w >= 0 && w !== v.weight)
                                          updateVariant.mutate({ id: v.id, patch: { weight: w } });
                                      }}
                                      className="h-8 w-20 tech-content"
                                      dir="ltr"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <Switch
                                      checked={v.is_active}
                                      onCheckedChange={(c) => updateVariant.mutate({ id: v.id, patch: { is_active: c } })}
                                    />
                                  </td>
                                  <td className="py-2 tech-content">{s?.impressions ?? 0}</td>
                                  <td className="py-2 tech-content">{s?.clicks ?? 0}</td>
                                  <td className="py-2 tech-content">
                                    {s ? (s.ctr * 100).toFixed(2) + '%' : '0%'}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => promoteManually.mutate(v.id)}
                                        disabled={isWinner}
                                        className="gap-1 h-8"
                                      >
                                        <Crown className="w-3.5 h-3.5" /> ترقية
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          if (window.confirm(`حذف النسخة ${v.key}؟`)) deleteVariant.mutate(v.id);
                                        }}
                                        className="h-8 text-destructive"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add variant inline */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Plus className="w-4 h-4" /> إضافة نسخة جديدة
                    </h3>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">المفتاح (A/B/C…)</Label>
                        <Input
                          value={newVar.key}
                          onChange={(e) => setNewVar((s) => ({ ...s, key: e.target.value }))}
                          dir="ltr"
                          className="tech-content"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">الوزن</Label>
                        <Input
                          type="number"
                          value={newVar.weight}
                          onChange={(e) => setNewVar((s) => ({ ...s, weight: parseInt(e.target.value, 10) || 1 }))}
                          dir="ltr"
                          className="tech-content"
                        />
                      </div>
                      <div className="flex items-center gap-3 h-12 px-3 rounded-xl border mt-5">
                        <Switch
                          checked={newVar.is_control}
                          onCheckedChange={(c) => setNewVar((s) => ({ ...s, is_control: c }))}
                        />
                        <Label className="text-sm">نسخة المتحكم</Label>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">المحتوى (JSON)</Label>
                      <Textarea
                        value={newVar.contentJson}
                        onChange={(e) => setNewVar((s) => ({ ...s, contentJson: e.target.value }))}
                        rows={5}
                        dir="ltr"
                        className="tech-content font-mono text-xs"
                        placeholder='{"titleAr":"...","titleEn":"...","subAr":"...","subEn":"..."}'
                      />
                    </div>
                    <Button onClick={() => addVariant.mutate()} disabled={addVariant.isPending}>إضافة</Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAbExperiments;