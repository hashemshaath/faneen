import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const goldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface SearchMapProps {
  businesses: any[];
  className?: string;
}

export const SearchMap = ({ businesses, className }: SearchMapProps) => {
  const { language } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mappable = useMemo(
    () => businesses.filter(b => b.latitude && b.longitude),
    [businesses]
  );

  const center = useMemo<[number, number]>(() => {
    if (mappable.length === 0) return [24.7136, 46.6753];
    const avgLat = mappable.reduce((s, b) => s + Number(b.latitude), 0) / mappable.length;
    const avgLng = mappable.reduce((s, b) => s + Number(b.longitude), 0) / mappable.length;
    return [avgLat, avgLng];
  }, [mappable]);

  const zoom = mappable.length === 0 ? 6 : mappable.length === 1 ? 14 : 8;

  useEffect(() => {
    if (!containerRef.current) return;

    // Create map
    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add markers
    mappable.forEach(b => {
      const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
      const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
      const rating = Number(b.rating_avg).toFixed(1);
      const verified = b.is_verified ? '✓' : '';

      const popupContent = `
        <div style="min-width:180px;font-family:inherit;direction:${language === 'ar' ? 'rtl' : 'ltr'}">
          <a href="/${b.username}" style="font-weight:700;font-size:14px;color:#1a1a2e;text-decoration:none;display:block;margin-bottom:4px">
            ${name} ${verified ? '<span style="color:#d4a017">✓</span>' : ''}
          </a>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#666">
            <span>⭐ ${rating}</span>
            ${cityName ? `<span>📍 ${cityName}</span>` : ''}
          </div>
          <a href="/${b.username}" style="display:block;text-align:center;margin-top:8px;padding:6px 12px;background:#d4a017;color:#1a1a2e;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600">
            ${language === 'ar' ? 'عرض الملف' : 'View Profile'}
          </a>
        </div>
      `;

      L.marker([Number(b.latitude), Number(b.longitude)], { icon: goldIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });

    // Fit bounds if multiple markers
    if (mappable.length > 1) {
      const bounds = L.latLngBounds(mappable.map(b => [Number(b.latitude), Number(b.longitude)] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappable, center, zoom, language]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-border shadow-sm flex flex-col ${className ?? ''}`}>
      <div ref={containerRef} className="flex-1" style={{ minHeight: 400 }} />

      <div className="bg-card border-t border-border px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-foreground">{mappable.length}</span>
          {language === 'ar' ? 'مزود على الخريطة' : 'providers on map'}
        </span>
        {mappable.length === 0 && (
          <span className="text-xs text-muted-foreground font-body">
            {language === 'ar' ? 'لا توجد مواقع متاحة' : 'No locations available'}
          </span>
        )}
      </div>
    </div>
  );
};
