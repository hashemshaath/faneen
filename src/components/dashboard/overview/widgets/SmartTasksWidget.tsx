import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Trash2, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartTask {
  id: string;
  text: string;
  done: boolean;
  pinned: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'qitaat_smart_tasks_v1';
const MAX_TASKS = 50;

function loadTasks(userId: string): SmartTask[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SmartTask[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TASKS) : [];
  } catch {
    return [];
  }
}

/**
 * Personal task list — stored per-user in localStorage. No backend coupling
 * to keep this lightweight + private. Pinned items float to the top.
 */
export const SmartTasksWidget = React.memo(function SmartTasksWidget({
  isRTL, userId,
}: { isRTL: boolean; userId: string }) {
  const [tasks, setTasks] = useState<SmartTask[]>(() => loadTasks(userId));
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try { localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(tasks)); } catch { /* ignore */ }
  }, [tasks, userId]);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  }, [tasks]);

  const remaining = tasks.filter((t) => !t.done).length;

  const addTask = () => {
    const text = draft.trim();
    if (!text || tasks.length >= MAX_TASKS) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false, pinned: false, createdAt: Date.now() },
    ]);
    setDraft('');
  };

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const togglePin = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
  const remove = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <Card className="border-border/40 h-full flex flex-col">
      <CardHeader className="pb-1 px-4 pt-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xs flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          {isRTL ? 'مهامي اليومية' : 'My Tasks'}
        </CardTitle>
        {tasks.length > 0 && (
          <Badge variant="outline" className="text-[9px] h-5 tech-content">
            {remaining}/{tasks.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            dir="auto"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
            placeholder={isRTL ? 'أضف مهمة جديدة…' : 'Add a task…'}
            className="h-8 text-xs"
            aria-label={isRTL ? 'مهمة جديدة' : 'New task'}
            maxLength={200}
          />
          <Button
            size="icon"
            variant="default"
            onClick={addTask}
            disabled={!draft.trim() || tasks.length >= MAX_TASKS}
            className="h-8 w-8 shrink-0"
            aria-label={isRTL ? 'إضافة' : 'Add'}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-4 text-muted-foreground">
            <CheckSquare className="w-8 h-8 mb-2 opacity-20" aria-hidden="true" />
            <p className="text-[10px]">{isRTL ? 'لا توجد مهام بعد' : 'No tasks yet'}</p>
          </div>
        ) : (
          <ul className="space-y-1 max-h-[180px] overflow-y-auto no-scrollbar -mx-1 px-1">
            {sorted.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'group flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors',
                  t.pinned && 'bg-accent/5'
                )}
              >
                <Checkbox
                  checked={t.done}
                  onCheckedChange={() => toggle(t.id)}
                  aria-label={t.text}
                  className="h-3.5 w-3.5"
                />
                <span className={cn('flex-1 text-[11px] truncate', t.done && 'line-through text-muted-foreground')} dir="auto">
                  {t.text}
                </span>
                <button
                  type="button"
                  onClick={() => togglePin(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-accent transition"
                  aria-label={t.pinned ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}
                >
                  {t.pinned
                    ? <PinOff className="w-3 h-3" aria-hidden="true" />
                    : <Pin className="w-3 h-3" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  aria-label={isRTL ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});