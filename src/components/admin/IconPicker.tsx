/**
 * IconPicker — curated lucide library + emoji fallback. Fully inline (no dialog).
 * Stores value as either raw emoji ("🔧") or "lucide:Wrench".
 */
import React, { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bi, useBi } from '@/components/common/Bilingual';
import { Search, X } from 'lucide-react';

/* Curated industrial-equipment-friendly icon set. */
const CURATED: string[] = [
  'Wrench', 'Hammer', 'Drill', 'Pickaxe', 'Saw', 'Cog', 'Settings', 'Anchor',
  'HardHat', 'ShieldCheck', 'Shield', 'TriangleAlert', 'Flame', 'Zap', 'Plug',
  'BatteryCharging', 'Lightbulb', 'Fuel', 'Container', 'Forklift', 'Truck',
  'TruckElectric', 'Tractor', 'Construction', 'Building2', 'Factory', 'Warehouse',
  'Cable', 'CircuitBoard', 'Cpu', 'KeyRound',
  'Lock', 'Unlock', 'Ruler', 'Scissors', 'Paintbrush', 'PaintBucket', 'Pipette',
  'Magnet', 'Compass', 'Gauge', 'Thermometer', 'Wind', 'Snowflake', 'Droplets',
  'Recycle', 'Leaf', 'TreePine', 'Mountain', 'Boxes', 'Package', 'PackageCheck',
  'Layers', 'Layers3', 'Grid3x3', 'Grid2x2', 'Square', 'SquareStack',
  'Camera', 'Video', 'Mic', 'Speaker', 'Radio', 'Wifi', 'Antenna',
  'Car', 'Bus', 'Plane', 'Ship', 'Bike', 'Ambulance',
  'House', 'DoorOpen', 'Bed', 'Sofa', 'Lamp', 'Refrigerator', 'WashingMachine',
  'Brush', 'Pencil', 'PenTool', 'FileText', 'Folder', 'FolderOpen', 'Clipboard',
  'Calculator', 'Calendar', 'Clock', 'Timer', 'Activity', 'TrendingUp',
  'Star', 'Heart', 'Tag', 'Bookmark', 'Pin', 'MapPin', 'Map',
  'Coins', 'Banknote', 'CreditCard', 'Receipt', 'Wallet',
  'Users', 'User', 'UserCheck', 'Briefcase', 'Building',
];

const EMOJIS = ['🔧','🔨','⚙️','🛠️','🚜','🚧','🏗️','⛑️','🪜','🪚','🪓','⛓️','🔩','🪛','📦','🏭','🏢','🚛','🚒','🚚','⚡','🔥','💡','🪟','🚪','🪑','🛋️','🧱','🪵','🪞','🧰','🧯'];

type IconProps = { value: string; className?: string; size?: number };

/** Render whatever is stored — emoji string or "lucide:Name". */
export const RenderIcon: React.FC<IconProps> = ({ value, className, size = 20 }) => {
  if (!value) return <span className={className}>📦</span>;
  if (value.startsWith('lucide:')) {
    const name = value.slice(7);
    const Comp = (Lucide as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
    if (Comp) return <Comp size={size} className={className} />;
    return <span className={className}>📦</span>;
  }
  return <span className={className} style={{ fontSize: size }}>{value}</span>;
};

interface PickerProps {
  value: string | null | undefined;
  onChange: (v: string) => void;
}

export const IconPicker: React.FC<PickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'lucide' | 'emoji'>('lucide');
  const [q, setQ] = useState('');
  const bi = useBi();

  const lucideFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CURATED.filter(n => !needle || n.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-12 w-full rounded-xl border bg-background hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center gap-3 px-3 text-start"
      >
        <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <RenderIcon value={value || ''} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground"><Bi ar="الأيقونة" en="Icon" /></div>
          <div className="text-sm tech-content truncate">{value || (open ? '' : bi('انقر للاختيار', 'Click to choose'))}</div>
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="rounded-xl border bg-card p-3 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-0.5">
              <button type="button" onClick={() => setTab('lucide')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'lucide' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
                {bi('أيقونات', 'Icons')}
              </button>
              <button type="button" onClick={() => setTab('emoji')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'emoji' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
                {bi('رموز', 'Emoji')}
              </button>
            </div>
            {tab === 'lucide' && (
              <div className="relative flex-1">
                <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 size-3.5 text-muted-foreground" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder={bi('بحث…', 'Search…')} className="h-8 ps-8 rounded-lg text-xs" />
              </div>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 w-8 p-0"><X className="size-4" /></Button>
          </div>

          {tab === 'lucide' ? (
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto no-scrollbar p-1">
              {lucideFiltered.map(name => {
                const Comp = (Lucide as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
                if (!Comp) return null;
                const v = `lucide:${name}`;
                const active = value === v;
                return (
                  <button key={name} type="button" onClick={() => { onChange(v); setOpen(false); }} title={name} className={`size-10 rounded-lg border flex items-center justify-center transition-all hover:border-primary hover:bg-primary/5 ${active ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : ''}`}>
                    <Comp size={18} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto no-scrollbar p-1">
              {EMOJIS.map(e => {
                const active = value === e;
                return (
                  <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }} className={`size-10 rounded-lg border flex items-center justify-center text-xl transition-all hover:border-primary hover:bg-primary/5 ${active ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : ''}`}>
                    {e}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IconPicker;