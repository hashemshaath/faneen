import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, RotateCcw, Trash2, Save } from 'lucide-react';

interface DraftVersion {
  id: string;
  version_number: number;
  title_ar: string;
  auto_saved: boolean;
  created_at: string;
}

interface Props {
  isRTL: boolean;
  versions: DraftVersion[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  lastSaved: Date | null;
  isSaving: boolean;
  onManualSave: () => void;
}

export const DraftVersions: React.FC<Props> = ({
  isRTL, versions, onRestore, onDelete, lastSaved, isSaving, onManualSave,
}) => {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Auto-save status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {isSaving ? (
            <><Save className="w-3 h-3 animate-pulse" /> {isRTL ? 'جاري الحفظ...' : 'Saving...'}</>
          ) : lastSaved ? (
            <><Clock className="w-3 h-3" /> {isRTL ? 'آخر حفظ:' : 'Last saved:'} {lastSaved.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</>
          ) : (
            <>{isRTL ? 'لم يتم الحفظ بعد' : 'Not saved yet'}</>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={onManualSave} disabled={isSaving}>
          <Save className="w-3 h-3 me-1" />
          {isRTL ? 'حفظ نسخة' : 'Save Version'}
        </Button>
      </div>

      {/* Version list */}
      {versions.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">
          {isRTL ? 'لا توجد نسخ محفوظة' : 'No saved versions'}
        </p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-1.5">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-[10px] group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">v{v.version_number}</span>
                    <Badge variant={v.auto_saved ? 'outline' : 'secondary'} className="text-[8px] h-3.5 px-1">
                      {v.auto_saved ? (isRTL ? 'تلقائي' : 'Auto') : (isRTL ? 'يدوي' : 'Manual')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate">{formatDate(v.created_at)} • {formatTime(v.created_at)}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onRestore(v.id)} title={isRTL ? 'استعادة' : 'Restore'}>
                    <RotateCcw className="w-2.5 h-2.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete(v.id)} title={isRTL ? 'حذف' : 'Delete'}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
