import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link, Image, Minus, Table, Undo2, Redo2,
  AlignLeft, AlignCenter, Upload, Globe, Library
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
  isRTL?: boolean;
  placeholder?: string;
  minHeight?: string;
}

// Toolbar button helper
const TBtn: React.FC<{ icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }> = ({ icon, title, onClick, active }) => (
  <button type="button" title={title} onClick={onClick}
    className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
    {icon}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-border mx-0.5" />;

export const RichMarkdownEditor: React.FC<RichEditorProps> = ({
  value, onChange, dir = 'rtl', isRTL = true, placeholder, minHeight = '300px'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushHistory = useCallback((newVal: string) => {
    setHistory(prev => {
      const next = [...prev.slice(0, historyIdx + 1), newVal];
      setHistoryIdx(next.length - 1);
      return next.slice(-50); // keep last 50
    });
  }, [historyIdx]);

  const getSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return { start: 0, end: 0, text: '' };
    return { start: ta.selectionStart, end: ta.selectionEnd, text: value.substring(ta.selectionStart, ta.selectionEnd) };
  };

  const replaceSelection = (before: string, after: string, defaultText = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end, text } = getSelection();
    const selected = text || defaultText;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    pushHistory(newValue);
    setTimeout(() => {
      ta.focus();
      const newPos = start + before.length + selected.length;
      ta.setSelectionRange(start + before.length, newPos);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = getSelection();
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    pushHistory(newValue);
    setTimeout(() => {
      ta.focus();
      const newPos = start + text.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const wrapLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start } = getSelection();
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const line = value.substring(lineStart, end);
    const newLine = line.startsWith(prefix) ? line.substring(prefix.length) : prefix + line;
    const newValue = value.substring(0, lineStart) + newLine + value.substring(end);
    onChange(newValue);
    pushHistory(newValue);
  };

  // Toolbar actions
  const actions = {
    bold: () => replaceSelection('**', '**', isRTL ? 'نص عريض' : 'bold text'),
    italic: () => replaceSelection('*', '*', isRTL ? 'نص مائل' : 'italic text'),
    h1: () => wrapLine('# '),
    h2: () => wrapLine('## '),
    h3: () => wrapLine('### '),
    ul: () => wrapLine('- '),
    ol: () => wrapLine('1. '),
    quote: () => wrapLine('> '),
    code: () => {
      const { text } = getSelection();
      if (text.includes('\n')) {
        replaceSelection('\n```\n', '\n```\n', 'code');
      } else {
        replaceSelection('`', '`', 'code');
      }
    },
    hr: () => insertAtCursor('\n---\n'),
    undo: () => {
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        onChange(history[newIdx]);
      }
    },
    redo: () => {
      if (historyIdx < history.length - 1) {
        const newIdx = historyIdx + 1;
        setHistoryIdx(newIdx);
        onChange(history[newIdx]);
      }
    },
  };

  // Insert link
  const handleInsertLink = () => {
    if (!linkUrl) return;
    const text = linkText || linkUrl;
    insertAtCursor(`[${text}](${linkUrl})`);
    setLinkUrl('');
    setLinkText('');
    setLinkDialogOpen(false);
  };

  // Insert image from any source
  const handleInsertImage = (url: string, alt: string) => {
    if (!url) return;
    insertAtCursor(`\n![${alt || (isRTL ? 'صورة' : 'image')}](${url})\n`);
    setImageUrl('');
    setImageAlt('');
    setUploadedImageUrl('');
    setImageDialogOpen(false);
  };

  // Upload from computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'يرجى اختيار صورة' : 'Please select an image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max 5MB');
      return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `content/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    toast.loading(isRTL ? 'جاري الرفع...' : 'Uploading...');

    const { error } = await supabase.storage.from('blog-images').upload(path, file);
    if (error) {
      toast.dismiss();
      toast.error(error.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
    toast.dismiss();
    toast.success(isRTL ? 'تم الرفع' : 'Uploaded');
    
    handleInsertImage(urlData.publicUrl, file.name.split('.')[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Insert table
  const handleInsertTable = () => {
    const r = parseInt(tableRows) || 3;
    const c = parseInt(tableCols) || 3;
    const header = '| ' + Array.from({ length: c }, (_, i) => `${isRTL ? 'عمود' : 'Col'} ${i + 1}`).join(' | ') + ' |';
    const separator = '| ' + Array.from({ length: c }, () => '---').join(' | ') + ' |';
    const rows = Array.from({ length: r }, () => '| ' + Array.from({ length: c }, () => '   ').join(' | ') + ' |').join('\n');
    insertAtCursor(`\n${header}\n${separator}\n${rows}\n`);
    setTableDialogOpen(false);
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="border border-input rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1.5 border-b bg-muted/30 flex-wrap">
        <TBtn icon={<Undo2 className="w-4 h-4" />} title="Undo" onClick={actions.undo} />
        <TBtn icon={<Redo2 className="w-4 h-4" />} title="Redo" onClick={actions.redo} />
        <Divider />
        <TBtn icon={<Heading1 className="w-4 h-4" />} title="H1" onClick={actions.h1} />
        <TBtn icon={<Heading2 className="w-4 h-4" />} title="H2" onClick={actions.h2} />
        <TBtn icon={<Heading3 className="w-4 h-4" />} title="H3" onClick={actions.h3} />
        <Divider />
        <TBtn icon={<Bold className="w-4 h-4" />} title="Bold" onClick={actions.bold} />
        <TBtn icon={<Italic className="w-4 h-4" />} title="Italic" onClick={actions.italic} />
        <TBtn icon={<Code className="w-4 h-4" />} title="Code" onClick={actions.code} />
        <Divider />
        <TBtn icon={<List className="w-4 h-4" />} title="Bullet List" onClick={actions.ul} />
        <TBtn icon={<ListOrdered className="w-4 h-4" />} title="Numbered List" onClick={actions.ol} />
        <TBtn icon={<Quote className="w-4 h-4" />} title="Quote" onClick={actions.quote} />
        <TBtn icon={<Minus className="w-4 h-4" />} title="Divider" onClick={actions.hr} />
        <Divider />

        {/* Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" title="Link" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Link className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{isRTL ? 'إدراج رابط' : 'Insert Link'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{isRTL ? 'نص الرابط' : 'Link Text'}</Label>
                <Input value={linkText} onChange={e => setLinkText(e.target.value)} dir="auto" /></div>
              <div><Label>URL</Label>
                <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} dir="ltr" placeholder="https://" /></div>
              <Button onClick={handleInsertLink} disabled={!linkUrl} className="w-full">{isRTL ? 'إدراج' : 'Insert'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" title="Image" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Image className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{isRTL ? 'إدراج صورة' : 'Insert Image'}</DialogTitle></DialogHeader>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="text-xs gap-1">
                  <Upload className="w-3 h-3" />{isRTL ? 'رفع' : 'Upload'}
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs gap-1">
                  <Globe className="w-3 h-3" />{isRTL ? 'رابط' : 'URL'}
                </TabsTrigger>
                <TabsTrigger value="library" className="text-xs gap-1">
                  <Library className="w-3 h-3" />{isRTL ? 'المكتبة' : 'Library'}
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload" className="space-y-3 mt-3">
                <ImageUpload
                  bucket="blog-images"
                  value={uploadedImageUrl}
                  onChange={(url) => setUploadedImageUrl(url)}
                  onRemove={() => setUploadedImageUrl('')}
                  placeholder={isRTL ? 'اضغط لرفع صورة من الجهاز' : 'Click to upload from device'}
                />
                <div><Label>{isRTL ? 'النص البديل (SEO)' : 'Alt Text (SEO)'}</Label>
                  <Input value={imageAlt} onChange={e => setImageAlt(e.target.value)} dir="auto"
                    placeholder={isRTL ? 'وصف الصورة لمحركات البحث' : 'Describe image for search engines'} /></div>
                <Button onClick={() => handleInsertImage(uploadedImageUrl, imageAlt)} disabled={!uploadedImageUrl} className="w-full">
                  {isRTL ? 'إدراج الصورة' : 'Insert Image'}
                </Button>
              </TabsContent>

              {/* URL Tab */}
              <TabsContent value="url" className="space-y-3 mt-3">
                <div><Label>URL</Label>
                  <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} dir="ltr" placeholder="https://example.com/image.jpg" /></div>
                {imageUrl && (
                  <div className="rounded-lg overflow-hidden bg-muted h-32 flex items-center justify-center">
                    <img src={imageUrl} alt="preview" className="max-h-full max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div><Label>{isRTL ? 'النص البديل (SEO)' : 'Alt Text (SEO)'}</Label>
                  <Input value={imageAlt} onChange={e => setImageAlt(e.target.value)} dir="auto" /></div>
                <Button onClick={() => handleInsertImage(imageUrl, imageAlt)} disabled={!imageUrl} className="w-full">
                  {isRTL ? 'إدراج الصورة' : 'Insert Image'}
                </Button>
              </TabsContent>

              {/* Library Tab */}
              <TabsContent value="library" className="mt-3">
                <BlogImageLibrary isRTL={isRTL} onSelect={(url) => {
                  setImageUrl(url);
                  handleInsertImage(url, imageAlt || 'blog-image');
                }} />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Table Dialog */}
        <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" title="Table" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Table className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{isRTL ? 'إدراج جدول' : 'Insert Table'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{isRTL ? 'الصفوف' : 'Rows'}</Label>
                  <Input type="number" min="1" max="20" value={tableRows} onChange={e => setTableRows(e.target.value)} /></div>
                <div><Label>{isRTL ? 'الأعمدة' : 'Columns'}</Label>
                  <Input type="number" min="1" max="10" value={tableCols} onChange={e => setTableCols(e.target.value)} /></div>
              </div>
              <Button onClick={handleInsertTable} className="w-full">{isRTL ? 'إدراج' : 'Insert'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Direct file upload button */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <TBtn icon={<Upload className="w-4 h-4" />} title={isRTL ? 'رفع سريع' : 'Quick Upload'} onClick={() => fileInputRef.current?.click()} />
      </div>

      {/* Editor area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          pushHistory(e.target.value);
        }}
        dir={dir}
        placeholder={placeholder || (isRTL ? 'اكتب محتوى المقال هنا... يدعم Markdown' : 'Write article content here... Supports Markdown')}
        className="w-full resize-y bg-transparent px-4 py-3 text-sm font-mono focus:outline-none placeholder:text-muted-foreground"
        style={{ minHeight }}
        onKeyDown={(e) => {
          // Tab to insert spaces
          if (e.key === 'Tab') {
            e.preventDefault();
            insertAtCursor('  ');
          }
          // Ctrl+B for bold
          if (e.ctrlKey && e.key === 'b') { e.preventDefault(); actions.bold(); }
          // Ctrl+I for italic
          if (e.ctrlKey && e.key === 'i') { e.preventDefault(); actions.italic(); }
          // Ctrl+Z for undo
          if (e.ctrlKey && e.key === 'z') { e.preventDefault(); actions.undo(); }
          // Ctrl+Y for redo
          if (e.ctrlKey && e.key === 'y') { e.preventDefault(); actions.redo(); }
        }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{wordCount} {isRTL ? 'كلمة' : 'words'}</span>
          <span>{charCount} {isRTL ? 'حرف' : 'chars'}</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 200))} {isRTL ? 'دقيقة قراءة' : 'min read'}</span>
        </div>
        <span className="opacity-60">Markdown</span>
      </div>
    </div>
  );
};

// Library component to browse existing blog images
const BlogImageLibrary: React.FC<{ isRTL: boolean; onSelect: (url: string) => void }> = ({ isRTL, onSelect }) => {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadImages = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('blog-images').list('', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const imgs = (data || [])
        .filter(f => f.name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from('blog-images').getPublicUrl(f.name).data.publicUrl,
        }));
      setImages(imgs);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { loadImages(); }, []);

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (images.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">{isRTL ? 'لا توجد صور في المكتبة' : 'No images in library'}</div>;

  return (
    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
      {images.map((img, i) => (
        <button key={i} type="button" onClick={() => onSelect(img.url)}
          className="rounded-lg overflow-hidden bg-muted h-20 hover:ring-2 ring-primary transition-all">
          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
};
