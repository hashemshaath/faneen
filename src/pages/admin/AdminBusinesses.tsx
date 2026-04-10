import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Search, CheckCircle, XCircle, Shield, Star, Loader2, Eye, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminBusinesses = () => {
  const { isRTL, language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('businesses').update({ [field]: value } as any).eq('id', id);
      if (error) throw error;
      await supabase.from('admin_activity_log').insert({
        user_id: user!.id,
        action: `business_${field}_${value}`,
        entity_type: 'business',
        entity_id: id,
        details: { field, value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const tierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      const { error } = await supabase.from('businesses').update({ membership_tier: tier } as any).eq('id', id);
      if (error) throw error;
      await supabase.from('admin_activity_log').insert({
        user_id: user!.id,
        action: 'business_tier_change',
        entity_type: 'business',
        entity_id: id,
        details: { new_tier: tier },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(isRTL ? 'تم تغيير العضوية' : 'Tier updated');
    },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Update failed'),
  });

  const filtered = businesses.filter(b => {
    const matchSearch = !search ||
      b.name_ar.includes(search) || b.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      b.username.includes(search) || b.ref_id?.includes(search);
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'verified' && b.is_verified) ||
      (filterStatus === 'unverified' && !b.is_verified) ||
      (filterStatus === 'inactive' && !b.is_active);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: businesses.length,
    verified: businesses.filter(b => b.is_verified).length,
    active: businesses.filter(b => b.is_active).length,
  };

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            {isRTL ? 'إدارة الأعمال' : 'Business Management'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? `${stats.total} عمل • ${stats.verified} موثق • ${stats.active} نشط` : `${stats.total} businesses • ${stats.verified} verified • ${stats.active} active`}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isRTL ? 'بحث بالاسم أو المعرف...' : 'Search by name or ID...'} className="ps-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="verified">{isRTL ? 'موثق' : 'Verified'}</SelectItem>
                <SelectItem value="unverified">{isRTL ? 'غير موثق' : 'Unverified'}</SelectItem>
                <SelectItem value="inactive">{isRTL ? 'معطل' : 'Inactive'}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(biz => (
              <Card key={biz.id} className={`transition-colors ${!biz.is_active ? 'opacity-60 border-destructive/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-12 h-12 shrink-0">
                        <AvatarImage src={biz.logo_url || undefined} />
                        <AvatarFallback className="bg-accent/10 text-accent font-bold">
                          {biz.name_ar.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>@{biz.username}</span>
                          <Badge variant="outline" className="text-[10px]">{biz.ref_id}</Badge>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-gold" />
                            {biz.rating_avg} ({biz.rating_count})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={biz.membership_tier} onValueChange={tier => tierMutation.mutate({ id: biz.id, tier })}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant={biz.is_verified ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1"
                        onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_verified', value: !biz.is_verified })}>
                        {biz.is_verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {biz.is_verified ? (isRTL ? 'موثق' : 'Verified') : (isRTL ? 'توثيق' : 'Verify')}
                      </Button>

                      <Button variant={biz.is_active ? 'outline' : 'destructive'} size="sm" className="h-7 text-xs gap-1"
                        onClick={() => toggleMutation.mutate({ id: biz.id, field: 'is_active', value: !biz.is_active })}>
                        {biz.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {biz.is_active ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
                      </Button>

                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`/${biz.username}`}><Eye className="w-3 h-3" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card><CardContent className="p-12 text-center text-muted-foreground">
                {isRTL ? 'لا توجد نتائج' : 'No results'}
              </CardContent></Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBusinesses;
