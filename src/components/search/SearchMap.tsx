import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Star, BadgeCheck, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers
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

  const mappable = useMemo(
    () => businesses.filter(b => b.latitude && b.longitude),
    [businesses]
  );

  // Calculate center from businesses or default to Saudi Arabia center
  const center = useMemo<[number, number]>(() => {
    if (mappable.length === 0) return [24.7136, 46.6753]; // Riyadh
    const avgLat = mappable.reduce((s, b) => s + Number(b.latitude), 0) / mappable.length;
    const avgLng = mappable.reduce((s, b) => s + Number(b.longitude), 0) / mappable.length;
    return [avgLat, avgLng];
  }, [mappable]);

  const zoom = mappable.length === 0 ? 6 : mappable.length === 1 ? 14 : 8;

  return (
    <div className={`rounded-2xl overflow-hidden border border-border shadow-sm ${className ?? ''}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: 400 }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map(b => {
          const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
          const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
          return (
            <Marker
              key={b.id}
              position={[Number(b.latitude), Number(b.longitude)]}
              icon={goldIcon}
            >
              <Popup>
                <div className="min-w-[180px] font-body" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <Link to={`/${b.username}`} className="font-heading font-bold text-sm text-foreground hover:text-accent transition-colors block mb-1">
                    <span className="flex items-center gap-1">
                      {name}
                      {b.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-accent inline" />}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-accent fill-accent" />
                      {Number(b.rating_avg).toFixed(1)}
                    </span>
                    {cityName && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {cityName}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/${b.username}`}
                    className="mt-2 block text-center text-xs bg-accent text-accent-foreground rounded-lg py-1.5 px-3 font-medium hover:opacity-90 transition-opacity"
                  >
                    {language === 'ar' ? 'عرض الملف' : 'View Profile'}
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map info bar */}
      {mappable.length > 0 && (
        <div className="bg-card border-t border-border px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-foreground">{mappable.length}</span>
            {language === 'ar' ? 'مزود على الخريطة' : 'providers on map'}
          </span>
        </div>
      )}

      {mappable.length === 0 && (
        <div className="bg-card border-t border-border px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground font-body">
            {language === 'ar' ? 'لا توجد مواقع متاحة للعرض على الخريطة' : 'No locations available to display on map'}
          </span>
        </div>
      )}
    </div>
  );
};
