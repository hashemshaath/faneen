import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2, Search, Wand2, AlertTriangle, RefreshCw } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Nominatim client: in-memory LRU cache + global rate limit (max 1 req/sec
// per the OSM usage policy) + transparent retry on 429/5xx.
// ---------------------------------------------------------------------------
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX = 200;

type CacheEntry<T> = { value: T; expires: number };
const reverseCache = new Map<string, CacheEntry<NominatimResponse | null>>();
const forwardCache = new Map<string, CacheEntry<{ lat: number; lng: number } | null>>();
let lastRequestAt = 0;
let chain: Promise<unknown> = Promise.resolve();

const cacheGet = <T,>(map: Map<string, CacheEntry<T>>, key: string): T | undefined => {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) { map.delete(key); return undefined; }
  return hit.value;
};
const cacheSet = <T,>(map: Map<string, CacheEntry<T>>, key: string, value: T) => {
  if (map.size >= CACHE_MAX) {
    const first = map.keys().next().value;
    if (first !== undefined) map.delete(first);
  }
  map.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
};

const throttle = async <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try { return await fn(); } finally { lastRequestAt = Date.now(); }
  });
  chain = run.catch(() => undefined);
  return run as Promise<T>;
};

export class NominatimError extends Error {
  constructor(public code: 'rate_limited' | 'network' | 'server', message: string) {
    super(message);
  }
}

const fetchJson = async (url: string, attempt = 0): Promise<unknown> => {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 1500));
      return fetchJson(url, attempt + 1);
    }
    throw new NominatimError(res.status === 429 ? 'rate_limited' : 'server', `HTTP ${res.status}`);
  }
  if (!res.ok) throw new NominatimError('server', `HTTP ${res.status}`);
  return res.json();
};

const fetchReverse = async (lat: number, lng: number, lang: 'ar' | 'en'): Promise<NominatimResponse | null> => {
  const key = `${lang}:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet(reverseCache, key);
  if (cached !== undefined) return cached;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}&zoom=18`;
  const data = (await throttle(() => fetchJson(url))) as NominatimResponse | null;
  cacheSet(reverseCache, key, data ?? null);
  return data ?? null;
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
  const key = q.trim().toLowerCase();
  const cached = cacheGet(forwardCache, key);
  if (cached !== undefined) return cached;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=ar,en`;
  const data = (await throttle(() => fetchJson(url))) as Array<{ lat: string; lon: string }>;
  const result = data.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  cacheSet(forwardCache, key, result);
  return result;
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
  // Tracks whether the map tiles failed to load (offline / blocked / OSM down).
  // When true, we hide the broken map and offer a manual-coordinates fallback.
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [manualLat, setManualLat] = useState<string>(latitude != null ? String(latitude) : '');
  const [manualLng, setManualLng] = useState<string>(longitude != null ? String(longitude) : '');

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setMapFailed(false);
    const initial: [number, number] =
      latitude != null && longitude != null ? [latitude, longitude] : RIYADH;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(
      initial,
      latitude != null ? 16 : 11,
    );
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    });
    let failedTiles = 0;
    tiles.on('tileerror', () => {
      failedTiles += 1;
      // A few transient errors are normal; flip to fallback only when many fail.
      if (failedTiles >= 4) setMapFailed(true);
    });
    tiles.addTo(map);

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
  }, [mapAttempt]);

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
    try {
      const result = await forwardSearch(searchQuery.trim());
      if (!result) {
        toast.error(isRTL ? 'لم يتم العثور على عنوان مطابق' : 'No matching address found');
        return;
      }
      onChange(+result.lat.toFixed(7), +result.lng.toFixed(7));
    } catch (err) {
      const code = err instanceof NominatimError ? err.code : 'network';
      toast.error(
        code === 'rate_limited'
          ? isRTL ? 'تم تجاوز عدد الطلبات المسموح به مؤقتًا، حاول بعد قليل.' : 'Rate limit reached, please try again in a moment.'
          : isRTL ? 'تعذّر الاتصال بخدمة الخرائط، أعد المحاولة لاحقًا.' : 'Could not reach the map service, please retry shortly.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAutofill = async () => {
    if (latitude == null || longitude == null || !onAutofill) return;
    setBusy(true);
    try {
      const data = await reverseGeocode(latitude, longitude);
      if (!data.address_ar && !data.address_en) {
        toast.error(isRTL ? 'تعذّر جلب العنوان من الإحداثيات' : 'Reverse geocoding failed');
        return;
      }
      onAutofill(data);
      toast.success(isRTL ? 'تم تعبئة العنوان تلقائيًا' : 'Address auto-filled from coordinates');
    } catch (err) {
      const code = err instanceof NominatimError ? err.code : 'network';
      toast.error(
        code === 'rate_limited'
          ? isRTL ? 'تم تجاوز حد الطلبات على خدمة الخرائط، انتظر قليلاً ثم أعد المحاولة.' : 'Map service rate limit reached. Please wait a moment and retry.'
          : isRTL ? 'تعذّر جلب العنوان حاليًا، أعد المحاولة بعد قليل.' : 'Could not fetch the address right now. Please retry shortly.',
      );
    } finally {
      setBusy(false);
    }
  };

  const hasCoords = latitude != null && longitude != null;

  // Keep manual inputs in sync with external coord changes (map pick, GPS, etc.).
  useEffect(() => {
    if (latitude != null) setManualLat(String(latitude));
    if (longitude != null) setManualLng(String(longitude));
  }, [latitude, longitude]);

  const applyManualCoords = useCallback(() => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error(isRTL ? 'أدخل إحداثيات صحيحة' : 'Enter valid coordinates');
      return;
    }
    onChange(+lat.toFixed(7), +lng.toFixed(7));
    toast.success(isRTL ? 'تم حفظ الإحداثيات' : 'Coordinates saved');
  }, [manualLat, manualLng, onChange, isRTL]);

  const retryMap = useCallback(() => {
    setMapFailed(false);
    setMapAttempt((n) => n + 1);
  }, []);

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

      {/* Map container is always mounted (so Leaflet can init), but hidden
          when tiles fail so the user sees the manual-coordinates fallback. */}
      <div
        ref={containerRef}
        className={`w-full h-[360px] rounded-xl border border-border overflow-hidden z-0 ${mapFailed ? 'hidden' : ''}`}
      />

      {mapFailed && (
        <div className="rounded-xl border border-dashed border-warning/40 bg-warning/[0.04] p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              {isRTL
                ? 'تعذّر تحميل الخريطة حاليًا. يمكنك إدخال الإحداثيات يدويًا أو نسخها من خرائط جوجل.'
                : 'Could not load the map right now. Enter coordinates manually or copy them from Google Maps.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">{isRTL ? 'خط العرض (Latitude)' : 'Latitude'}</label>
              <Input dir="ltr" inputMode="decimal" className="tech-content mt-1" placeholder="24.7136"
                value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{isRTL ? 'خط الطول (Longitude)' : 'Longitude'}</label>
              <Input dir="ltr" inputMode="decimal" className="tech-content mt-1" placeholder="46.6753"
                value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applyManualCoords} className="gap-1.5">
              <MapPin className="w-3.5 h-3.5" />{isRTL ? 'حفظ الإحداثيات' : 'Save coordinates'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={retryMap} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />{isRTL ? 'إعادة تحميل الخريطة' : 'Retry map'}
            </Button>
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline self-center"
            >
              {isRTL ? 'فتح خرائط Google لنسخ الإحداثيات' : 'Open Google Maps to copy coordinates'}
            </a>
          </div>
        </div>
      )}

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