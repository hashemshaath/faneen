import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2, Search, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Use CDN icons (same pattern as SearchMap.tsx)
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface ReverseGeocodeResult {
  address_ar?: string;
  address_en?: string;
  region_ar?: string;
  region_en?: string;
  district_ar?: string;
  district_en?: string;
}

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  region?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

const fetchReverse = async (lat: number, lng: number, lang: 'ar' | 'en'): Promise<NominatimResponse | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}&zoom=18`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as NominatimResponse;
  } catch {
    return null;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
  const [ar, en] = await Promise.all([fetchReverse(lat, lng, 'ar'), fetchReverse(lat, lng, 'en')]);
  const district = (a?: NominatimAddress) =>
    a?.neighbourhood || a?.suburb || a?.quarter || a?.city_district || '';
  const region = (a?: NominatimAddress) => a?.state || a?.region || '';
  return {
    address_ar: ar?.display_name ?? undefined,
    address_en: en?.display_name ?? undefined,
    region_ar: region(ar?.address) || undefined,
    region_en: region(en?.address) || undefined,
    district_ar: district(ar?.address) || undefined,
    district_en: district(en?.address) || undefined,
  };
};

const forwardSearch = async (q: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=ar,en`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
};

interface Props {
  isRTL: boolean;
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onAutofill?: (data: ReverseGeocodeResult) => void;
}

const RIYADH: [number, number] = [24.7136, 46.6753];

export const LocationPicker: React.FC<Props> = ({ isRTL, latitude, longitude, onChange, onAutofill }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initial: [number, number] =
      latitude != null && longitude != null ? [latitude, longitude] : RIYADH;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(
      initial,
      latitude != null ? 16 : 11,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const placeOrMove = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng], { draggable: true }).addTo(map);
        m.on('dragend', () => {
          const p = m.getLatLng();
          onChange(+p.lat.toFixed(7), +p.lng.toFixed(7));
        });
        markerRef.current = m;
      }
      onChange(+lat.toFixed(7), +lng.toFixed(7));
    };

    if (latitude != null && longitude != null) placeOrMove(latitude, longitude);

    map.on('click', (e: L.LeafletMouseEvent) => placeOrMove(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (e.g. manual input edits)
  useEffect(() => {
    if (!mapRef.current) return;
    if (latitude == null || longitude == null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const m = L.marker([latitude, longitude], { draggable: true }).addTo(mapRef.current);
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChange(+p.lat.toFixed(7), +p.lng.toFixed(7));
      });
      markerRef.current = m;
    }
    mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 15));
  }, [latitude, longitude, onChange]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isRTL ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation not supported');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(+pos.coords.latitude.toFixed(7), +pos.coords.longitude.toFixed(7));
        setBusy(false);
      },
      () => {
        toast.error(isRTL ? 'تعذّر الحصول على موقعك' : 'Failed to get your location');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setBusy(true);
    const result = await forwardSearch(searchQuery.trim());
    setBusy(false);
    if (!result) {
      toast.error(isRTL ? 'لم يتم العثور على عنوان مطابق' : 'No matching address found');
      return;
    }
    onChange(+result.lat.toFixed(7), +result.lng.toFixed(7));
  };

  const handleAutofill = async () => {
    if (latitude == null || longitude == null || !onAutofill) return;
    setBusy(true);
    const data = await reverseGeocode(latitude, longitude);
    setBusy(false);
    if (!data.address_ar && !data.address_en) {
      toast.error(isRTL ? 'تعذّر جلب العنوان من الإحداثيات' : 'Reverse geocoding failed');
      return;
    }
    onAutofill(data);
    toast.success(isRTL ? 'تم تعبئة العنوان تلقائيًا' : 'Address auto-filled from coordinates');
  };

  const hasCoords = latitude != null && longitude != null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            dir="auto"
            placeholder={isRTL ? 'ابحث عن عنوان أو معلم…' : 'Search for an address or landmark…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          />
          <Button type="button" variant="outline" onClick={handleSearch} disabled={busy} className="gap-1.5">
            <Search className="w-4 h-4" />{isRTL ? 'بحث' : 'Search'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={busy} className="gap-1.5">
            <Crosshair className="w-4 h-4" />{isRTL ? 'موقعي الحالي' : 'My location'}
          </Button>
          {onAutofill && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAutofill}
              disabled={busy || !hasCoords}
              className="gap-1.5"
              title={isRTL ? 'تعبئة المنطقة والحي والعنوان من الإحداثيات' : 'Auto-fill region, district & address from the pin'}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isRTL ? 'تعبئة العنوان' : 'Auto-fill address'}
            </Button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[360px] rounded-xl border border-border overflow-hidden z-0"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {hasCoords ? (
            <span className="tech-content">
              {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
            </span>
          ) : (
            <span>{isRTL ? 'انقر على الخريطة لتحديد الموقع' : 'Click on the map to drop a pin'}</span>
          )}
        </div>
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {isRTL ? 'فتح في خرائط Google' : 'Open in Google Maps'}
          </a>
        )}
      </div>
    </div>
  );
};