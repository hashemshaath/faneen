import React from 'react';
import { Loader2, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { HomeContentRowActions } from './HomeContentRowActions';

export interface HomeSectorRowState {
  show: boolean;
  position: number;
  icon: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  dirty: boolean;
}

export interface HomeSectorRowMeta {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
}

export interface HomeSectorIconOption {
  name: string;
  Icon: LucideIcon;
}

export interface HomeSectorRowProps {
  isRTL: boolean;
  row: HomeSectorRowMeta;
  state: HomeSectorRowState;
  Icon: LucideIcon;
  iconOptions: HomeSectorIconOption[];
  posInVisible: number;
  canUp: boolean;
  canDown: boolean;
  isSaving: boolean;
  titleMax: number;
  bodyMax: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (patch: Partial<HomeSectorRowState>) => void;
  onSave: () => void;
  onReset: () => void;
  labels: {
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    icon: string;
    show: string;
    showHint: string;
    visible: string;
    hidden: string;
    unsaved: string;
    discard: string;
    save: string;
    up: string;
    down: string;
  };
}

/**
 * HomeSectorRow — presentational card for one home-grid tile editor.
 * Owns no fetching/mutations; reorder + persistence are wired by the
 * parent page through callbacks.
 */
export const HomeSectorRow: React.FC<HomeSectorRowProps> = ({
  isRTL,
  row,
  state: s,
  Icon,
  iconOptions,
  posInVisible,
  canUp,
  canDown,
  isSaving,
  titleMax,
  bodyMax,
  onMoveUp,
  onMoveDown,
  onChange,
  onSave,
  onReset,
  labels,
}) => {
  const displayTitle = isRTL
    ? s.title_ar || row.name_ar
    : s.title_en || row.name_en || row.name_ar;
  return (
    <Card className={s.show ? '' : 'opacity-70'}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0">
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{displayTitle}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] tech-content">{row.slug}</Badge>
              {s.show ? (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  {labels.visible} · #{posInVisible + 1}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">{labels.hidden}</Badge>
              )}
              {s.dirty && (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  {labels.unsaved}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <HomeContentRowActions
          canUp={canUp}
          canDown={canDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          labels={{ up: labels.up, down: labels.down }}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.titleAr}</Label>
            <Input
              dir="auto"
              maxLength={titleMax}
              value={s.title_ar}
              onChange={(e) => onChange({ title_ar: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.titleEn}</Label>
            <Input
              dir="auto"
              maxLength={titleMax}
              value={s.title_en}
              onChange={(e) => onChange({ title_en: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.bodyAr}</Label>
            <Textarea
              dir="auto"
              rows={2}
              maxLength={bodyMax}
              value={s.body_ar}
              onChange={(e) => onChange({ body_ar: e.target.value })}
            />
            <span className="text-[10px] text-muted-foreground">{s.body_ar.length}/{bodyMax}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.bodyEn}</Label>
            <Textarea
              dir="auto"
              rows={2}
              maxLength={bodyMax}
              value={s.body_en}
              onChange={(e) => onChange({ body_en: e.target.value })}
            />
            <span className="text-[10px] text-muted-foreground">{s.body_en.length}/{bodyMax}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.icon}</Label>
            <Select
              value={s.icon}
              onValueChange={(v) => onChange({ icon: v })}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {iconOptions.map((opt) => {
                  const I = opt.Icon;
                  return (
                    <SelectItem key={opt.name} value={opt.name}>
                      <span className="inline-flex items-center gap-2">
                        <I className="w-4 h-4" strokeWidth={1.75} />
                        <span className="tech-content">{opt.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                {s.show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {labels.show}
              </Label>
              <p className="text-[11px] text-muted-foreground mt-1">{labels.showHint}</p>
            </div>
            <Switch checked={s.show} onCheckedChange={(v) => onChange({ show: v })} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {s.dirty && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 me-1.5" />
              {labels.discard}
            </Button>
          )}
          <Button size="sm" disabled={!s.dirty || isSaving} onClick={onSave}>
            {isSaving ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Save className="w-4 h-4 me-1.5" />}
            {labels.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeSectorRow;