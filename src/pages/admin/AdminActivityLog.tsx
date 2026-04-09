import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Search, User, Clock, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const actionLabels: Record<string, { ar: string; en: string; color: string }> = {
  create: { ar: 'إنشاء', en: 'Create', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  update: { ar: 'تعديل', en: 'Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  delete: { ar: 'حذف', en: 'Delete', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  login: { ar: 'تسجيل دخول', en: 'Login', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  role_change: { ar: 'تغيير صلاحية', en: 'Role Change', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  role_assigned: { ar: 'إضافة صلاحية', en: 'Role Assigned', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  role_updated: { ar: 'تعديل صلاحية', en: 'Role Updated', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  role_removed: { ar: 'إزالة صلاحية', en: 'Role Removed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  settings: { ar: 'إعدادات', en: 'Settings', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  setting_created: { ar: 'إنشاء إعداد', en: 'Setting Created', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  setting_updated: { ar: 'تعديل إعداد', en: 'Setting Updated', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  setting_deleted: { ar: 'حذف إعداد', en: 'Setting Deleted', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const entityLabels: Record<string, { ar: string; en: string }> = {
  user: { ar: 'مستخدم', en: 'User' },
  business: { ar: 'نشاط تجاري', en: 'Business' },
  contract: { ar: 'عقد', en: 'Contract' },
  blog_post: { ar: 'مقال', en: 'Blog Post' },
  profile_system: { ar: 'نظام بروفايل', en: 'Profile System' },
  setting: { ar: 'إعداد', en: 'Setting' },
  platform_setting: { ar: 'إعداد المنصة', en: 'Platform Setting' },
  role: { ar: 'صلاحية', en: 'Role' },
  user_role: { ar: 'صلاحية مستخدم', en: 'User Role' },
};

const AdminActivityLog = () => {
  const { isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-activity-log', actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (userId: string) => {
    const profile = profiles?.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const getActionLabel = (action: string) => {
    const label = actionLabels[action];
    return label ? (isRTL ? label.ar : label.en) : action;
  };

  const getActionColor = (action: string) => {
    return actionLabels[action]?.color || 'bg-muted text-muted-foreground';
  };

  const getEntityLabel = (entityType: string | null) => {
    if (!entityType) return '-';
    const label = entityLabels[entityType];
    return label ? (isRTL ? label.ar : label.en) : entityType;
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const name = getProfileName(log.user_id).toLowerCase();
    const action = getActionLabel(log.action).toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || action.includes(searchQuery.toLowerCase());
  });

  const exportToCSV = () => {
    if (!filteredLogs?.length) return;
    const headers = ['Date', 'Admin', 'Action', 'Entity Type', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getProfileName(log.user_id),
      getActionLabel(log.action),
      getEntityLabel(log.entity_type),
      log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0
        ? JSON.stringify(log.details)
        : '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            {isRTL ? 'سجل نشاط المشرفين' : 'Admin Activity Log'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? 'عرض جميع العمليات التي قام بها المشرفون' : 'View all operations performed by admins'}
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isRTL ? 'بحث بالاسم أو العملية...' : 'Search by name or action...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 me-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع العمليات' : 'All Actions'}</SelectItem>
                  {Object.entries(actionLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{isRTL ? val.ar : val.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!filteredLogs?.length}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !filteredLogs?.length ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p>{isRTL ? 'لا توجد سجلات نشاط' : 'No activity logs found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? 'المشرف' : 'Admin'}</TableHead>
                      <TableHead>{isRTL ? 'العملية' : 'Action'}</TableHead>
                      <TableHead>{isRTL ? 'نوع الكيان' : 'Entity'}</TableHead>
                      <TableHead>{isRTL ? 'التفاصيل' : 'Details'}</TableHead>
                      <TableHead>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{getProfileName(log.user_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)} variant="secondary">
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getEntityLabel(log.entity_type)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0
                            ? JSON.stringify(log.details)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm', { locale: isRTL ? ar : undefined })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminActivityLog;
