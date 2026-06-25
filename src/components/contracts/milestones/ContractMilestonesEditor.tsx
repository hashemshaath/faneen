import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

export interface MilestoneDraft {
  title_ar: string;
  amount: number;
  percentage?: number | null;
  due_date?: string | null;
  auto_release_days?: number;
}

interface Props {
  contractTotal?: number;
  value: MilestoneDraft[];
  onChange: (next: MilestoneDraft[]) => void;
}

export function ContractMilestonesEditor({ contractTotal = 0, value, onChange }: Props) {
  const [autoDays, setAutoDays] = useState(7);

  const add = () =>
    onChange([
      ...value,
      { title_ar: "", amount: 0, percentage: null, due_date: null, auto_release_days: autoDays },
    ]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const patch = (idx: number, p: Partial<MilestoneDraft>) =>
    onChange(value.map((m, i) => (i === idx ? { ...m, ...p } : m)));

  const sum = value.reduce((a, m) => a + (Number(m.amount) || 0), 0);
  const pctSum = value.reduce((a, m) => a + (Number(m.percentage) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">مراحل الإنجاز والدفعات</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>مهلة الاعتماد التلقائي (يوم):</span>
          <Input
            type="number"
            min={1}
            max={30}
            value={autoDays}
            onChange={(e) => setAutoDays(Math.max(1, Number(e.target.value) || 7))}
            className="h-8 w-20"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {value.length === 0 && (
          <p className="text-sm text-muted-foreground">
            أضف على الأقل مرحلة واحدة لتقسيم الدفع وضمان حقوق الطرفين.
          </p>
        )}
        {value.map((m, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 rounded-md border p-3">
            <Input
              className="col-span-12 md:col-span-5"
              placeholder={`المرحلة ${idx + 1} (مثال: تجهيز الموقع)`}
              value={m.title_ar}
              onChange={(e) => patch(idx, { title_ar: e.target.value })}
            />
            <Input
              className="col-span-6 md:col-span-2"
              type="number"
              placeholder="المبلغ"
              value={m.amount || ""}
              onChange={(e) => patch(idx, { amount: Number(e.target.value) || 0 })}
            />
            <Input
              className="col-span-6 md:col-span-2"
              type="number"
              placeholder="% النسبة"
              value={m.percentage ?? ""}
              onChange={(e) =>
                patch(idx, { percentage: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
            <Input
              className="col-span-10 md:col-span-2"
              type="date"
              value={m.due_date ?? ""}
              onChange={(e) => patch(idx, { due_date: e.target.value || null })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-span-2 md:col-span-1 self-center"
              onClick={() => remove(idx)}
              aria-label="حذف"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="ms-2 h-4 w-4" /> إضافة مرحلة
        </Button>

        {value.length > 0 && (
          <div className="flex flex-wrap items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
            <span>إجمالي الدفعات: <strong>{sum.toLocaleString("ar-SA")}</strong></span>
            {contractTotal > 0 && (
              <span className={sum === contractTotal ? "text-emerald-600" : "text-amber-600"}>
                قيمة العقد: {contractTotal.toLocaleString("ar-SA")}{" "}
                {sum !== contractTotal && `(فرق: ${(contractTotal - sum).toLocaleString("ar-SA")})`}
              </span>
            )}
            <span className={Math.round(pctSum) === 100 ? "text-emerald-600" : "text-muted-foreground"}>
              مجموع النسب: {pctSum.toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ContractMilestonesEditor;