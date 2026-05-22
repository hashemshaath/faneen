import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { countBusinesses } from '@/modules/businesses';
import { MapPin, Building2, Map, ListTree, ArrowLeft } from 'lucide-react';

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; tone?: string }> = ({ label, value, icon, tone = 'text-primary' }) => (
  <Card className="hover-lift">
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl bg-muted flex items-center justify-center ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tech-content">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const LinkCard: React.FC<{ to: string; title: string; desc: string; icon: React.ReactNode }> = ({ to, title, desc, icon }) => (
  <Link to={to} className="block group">
    <Card className="hover-lift h-full">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  </Link>
);

const AdminLocationsHub: React.FC = () => {
  useNoIndex();

  const { data: stats } = useQuery({
    queryKey: ['admin-locations-hub-stats'],
    queryFn: async () => {
      const [catalog, areas, withCoords, total] = await Promise.all([
        supabase.from('location_catalog').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('business_service_areas').select('id', { count: 'exact', head: true }),
        countBusinesses({
          select: 'id',
          filters: [
            { column: 'latitude', op: 'not', operator: 'is', value: null },
            { column: 'longitude', op: 'not', operator: 'is', value: null },
          ],
        }),
        countBusinesses({ select: 'id' }),
      ]);
      return {
        cities: catalog.count ?? 0,
        areas: areas.count ?? 0,
        withCoords: withCoords.count ?? 0,
        withoutCoords: (total.count ?? 0) - (withCoords.count ?? 0),
      };
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="font-heading font-bold text-2xl">مركز إدارة المواقع</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة كتالوج المدن، مناطق خدمة المنشآت، وإحداثيات الخريطة من مكان واحد.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="المدن المعتمدة" value={stats?.cities ?? '—'} icon={<ListTree className="h-5 w-5" />} />
          <StatCard label="مناطق الخدمة" value={stats?.areas ?? '—'} icon={<MapPin className="h-5 w-5" />} />
          <StatCard label="منشآت بإحداثيات" value={stats?.withCoords ?? '—'} icon={<Map className="h-5 w-5" />} tone="text-emerald-600" />
          <StatCard label="منشآت بدون إحداثيات" value={stats?.withoutCoords ?? '—'} icon={<Building2 className="h-5 w-5" />} tone="text-amber-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LinkCard
            to="/admin/locations/catalog"
            title="كتالوج المدن والمناطق"
            desc="إدارة المرجع المركزي للمدن والمناطق والأحياء المعتمدة في المنصة."
            icon={<ListTree className="h-5 w-5" />}
          />
          <LinkCard
            to="/admin/locations/service-areas"
            title="مناطق خدمة المنشآت"
            desc="مراجعة وتعديل المناطق التي تخدمها كل منشأة."
            icon={<MapPin className="h-5 w-5" />}
          />
          <LinkCard
            to="/admin/locations/business-coordinates"
            title="إحداثيات المنشآت"
            desc="تحديث إحداثيات المنشآت على الخريطة وعناوينها التفصيلية."
            icon={<Map className="h-5 w-5" />}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminLocationsHub;