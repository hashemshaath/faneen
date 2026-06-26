import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/modules/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

interface Props {
  milestoneId: string;
  contractId: string;
  onUploaded?: () => void;
}

export function MilestoneEvidenceUploader({ milestoneId, contractId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await getCurrentUser();
      if (!u.user) throw new Error("غير مصادق");
      const path = `${contractId}/${milestoneId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("contract-attachments")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const evidence_type = file.type.startsWith("image/") ? "image" : "file";
      const { error } = await supabase.from("contract_milestone_evidence").insert({
        milestone_id: milestoneId,
        contract_id: contractId,
        evidence_type,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        uploaded_by: u.user.id,
      });
      if (error) throw error;
      toast.success("تم رفع الإثبات");
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message ?? "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setUploading(true);
    try {
      const { data: u } = await getCurrentUser();
      const { error } = await supabase.from("contract_milestone_evidence").insert({
        milestone_id: milestoneId,
        contract_id: contractId,
        evidence_type: "note",
        note: note.trim(),
        uploaded_by: u.user!.id,
      });
      if (error) throw error;
      setNote("");
      toast.success("تمت إضافة الملاحظة");
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message ?? "فشل الحفظ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Upload className="h-4 w-4" /> رفع إثبات إنجاز
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <ImageIcon className="h-4 w-4" />
          صورة / ملف
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      <div className="space-y-2">
        <Textarea
          placeholder="ملاحظة نصية كإثبات (اختياري)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <Button type="button" size="sm" onClick={addNote} disabled={uploading || !note.trim()}>
          <FileText className="ms-2 h-4 w-4" /> حفظ الملاحظة
        </Button>
      </div>
    </div>
  );
}

export default MilestoneEvidenceUploader;