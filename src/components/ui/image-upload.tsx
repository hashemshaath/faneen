import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  bucket: string;
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  placeholder?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  value,
  onChange,
  onRemove,
  folder,
  accept = 'image/*',
  maxSizeMB = 5,
  className,
  aspectRatio = 'video',
  placeholder = 'اضغط لرفع صورة',
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`حجم الملف يجب أن لا يتجاوز ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = folder
        ? `${user.id}/${folder}/${fileName}`
        : `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      onChange(publicUrl);
      toast.success('تم رفع الصورة بنجاح');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) uploadFile(file);
  };

  const handleRemove = async () => {
    if (value && onRemove) {
      // Try to extract path from URL and delete from storage
      try {
        const url = new URL(value);
        const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
        if (pathParts[1]) {
          await supabase.storage.from(bucket).remove([decodeURIComponent(pathParts[1])]);
        }
      } catch {
        // Ignore deletion errors for external URLs
      }
      onRemove();
    }
  };

  const aspectClass = aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'square' ? 'aspect-square' : '';

  if (value) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden border border-border/50 group', aspectClass, className)}>
        <img src={value} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 me-1" />
            تغيير
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="w-4 h-4 me-1" />
              حذف
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 p-6',
        dragOver ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50',
        aspectClass,
        className,
      )}
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">جاري الرفع...</p>
        </>
      ) : (
        <>
          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{placeholder}</p>
          <p className="text-xs text-muted-foreground/60">
            أقصى حجم: {maxSizeMB}MB
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// Multi-image upload component
interface MultiImageUploadProps {
  bucket: string;
  images: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxImages?: number;
  maxSizeMB?: number;
  className?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  bucket,
  images,
  onChange,
  folder,
  maxImages = 10,
  maxSizeMB = 5,
  className,
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    const remaining = maxImages - images.length;
    const toUpload = Array.from(files).slice(0, remaining);

    if (toUpload.length === 0) {
      toast.error(`الحد الأقصى ${maxImages} صور`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of toUpload) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name} أكبر من ${maxSizeMB}MB`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const path = folder
          ? `${user.id}/${folder}/${fileName}`
          : `${user.id}/${fileName}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        newUrls.push(publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
        toast.success(`تم رفع ${newUrls.length} صورة`);
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    const url = images[index];
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
      if (pathParts[1]) {
        await supabase.storage.from(bucket).remove([decodeURIComponent(pathParts[1])]);
      }
    } catch {
      // Ignore
    }
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <div
            className="aspect-square rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors"
            onClick={() => !uploading && inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground">إضافة</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
};
