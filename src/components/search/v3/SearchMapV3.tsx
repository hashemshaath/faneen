import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { useBi } from '@/components/common/Bilingual';
import { MapPin } from 'lucide-react';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface MapBusiness {
  id: string;
  username?: string | null;
  name_ar: string;
  name_en?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating_avg?: number | null;
  logo_url?: string | null;
}

interface Props {
  businesses: MapBusiness[];
  isLoading?: boolean;
}

const RIYADH: [number, number] = [24.7136, 46.6753];

export const SearchMapV3: React.FC<Props> = ({ businesses, isLoading }) => {
  const bi = useBi();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const points = useMemo(
    () =>
      businesses.filter(
        (b): b is MapBusiness & { latitude: number; longitude: number } =>
          typeof b.latitude === 'number' &&
          typeof b.longitude === 'number' &&
          Number.isFinite(b.latitude) &&
          Number.isFinite(b.longitude),
      ),
    [businesses],
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(RIYADH, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (points.length === 0) return;
    const bounds = L.latLngBounds([]);
    for (const b of points) {
      const name = bi(b.name_ar, b.name_en || b.name_ar);
      const href = `/business/${b.username || b.id}`;
      const rating = typeof b.rating_avg === 'number' ? b.rating_avg.toFixed(1) : '—';
      const m = L.marker([b.latitude, b.longitude], { title: name });
      m.bindPopup(
        `<div style="min-width:180px;font-family:inherit">
          <a href="${href}" style="font-weight:600;color:hsl(var(--accent));text-decoration:none">${name}</a>
          <div style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:4px">★ ${rating}</div>
        </div>`,
      );
      m.addTo(layer);
      bounds.extend([b.latitude, b.longitude]);
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [points, bi]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {bi(
              `${points.length.toLocaleString('ar-EG')} مزوّد بموقع محدد`,
              `${points.length.toLocaleString('en-US')} providers with location`,
            )}
          </span>
        </div>
        {businesses.length > points.length && (
          <span>
            {bi(
              `${(businesses.length - points.length).toLocaleString('ar-EG')} بدون إحداثيات`,
              `${(businesses.length - points.length).toLocaleString('en-US')} without coordinates`,
            )}
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="w-full h-[70vh] min-h-[420px] rounded-2xl border border-border/60 overflow-hidden z-0 bg-muted/30"
        aria-label={bi('خريطة المزودين', 'Providers map')}
        role="region"
      />
      {isLoading && (
        <p className="text-xs text-muted-foreground">{bi('جارٍ تحميل المزودين…', 'Loading providers…')}</p>
      )}
      {/* Hidden anchor list for SEO/a11y — crawlers can follow links even
          though the visual layer is a canvas-based map. */}
      <ul className="sr-only">
        {points.map((b) => (
          <li key={b.id}>
            <Link to={`/business/${b.username || b.id}`}>{bi(b.name_ar, b.name_en || b.name_ar)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchMapV3;