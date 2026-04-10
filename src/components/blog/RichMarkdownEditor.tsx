import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link, Image, Minus, Table, Undo2, Redo2,
  AlignLeft, AlignCenter, Upload, Globe, Library, X
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
  isRTL?: boolean;
  placeholder?: string;
  minHeight?: string;
}

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
  const [activePanel, setActivePanel] = useState<'link' | 'image' | 'table' | null>(null);
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
      return next.slice(-50);
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

  const togglePanel = (panel: 'link' | 'image' | 'table') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const handleInsertLink = () => {
    if (!linkUrl) return;
    const text = linkText || linkUrl;
    insertAtCursor(`[${text}](${linkUrl})`);
    setLinkUrl('');
    setLinkText('');
    setActivePanel(null);
  };

  const handleInsertImage = (url: string, alt: string) => {
    if (!url) return;
    insertAtCursor(`\n![${alt || (isRTL ? 'صورة' : 'image')}](${url})\n`);
    setImageUrl('');
    setImageAlt('');
    setUploadedImageUrl('');
    setActivePanel(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(isRTL ? 'يرجى اختيار صورة' : 'Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max 5MB'); return; }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `content/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    toast.loading(isRTL ? 'جاري الرفع...' : 'Uploading...');
    const { error } = await supabase.storage.from('blog-images').upload(path, file);
    if (error) { toast.dismiss(); toast.error(error.message); return; }
    const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
    toast.dismiss();
    toast.success(isRTL ? 'تم الرفع' : 'Uploaded');
    handleInsertImage(urlData.publicUrl, file.name.split('.')[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInsertTable = () => {
    const r = parseInt(tableRows) || 3;
    const c = parseInt(tableCols) || 3;
    const header = '| ' + Array.from({ length: c }, (_, i) => `${isRTL ? 'عمود' : 'Col'} ${i + 1}`).join(' | ') + ' |';
    const separator = '| ' + Array.from({ length: c }, () => '---').join(' | ') + ' |';
    const rows = Array.from({ length: r }, () => '| ' + Array.from({ length: c }, () => '   ').join(' | ') + ' |').join('\n');
    insertAtCursor(`\n${header}\n${separator}\n${rows}\n`);
    setActivePanel(null);
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
        <TBtn icon={<Link className="w-4 h-4" />} title="Link" onClick={() => togglePanel('link')} active={activePanel === 'link'} />
        <TBtn icon={<Image className="w-4 h-4" />} title="Image" onClick={() => togglePanel('image')} active={activePanel === 'image'} />
        <TBtn icon={<Table className="w-4 h-4" />} title="Table" onClick={() => togglePanel('table')} active={activePanel === 'table'} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <TBtn icon={<Upload className="w-4 h-4" />} title={isRTL ? 'رفع سريع' : 'Quick Upload'} onClick={() => fileInputRef.current?.click()} />
      </div>

      {/* Inline Panels */}
      {activePanel === 'link' && (
        <div className="border-b bg-muted/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{isRTL ? 'إدراج رابط' : 'Insert Link'}</p>
            <button type="button" onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">{isRTL ? 'نص الرابط' : 'Link Text'}</Label>
              <Input value={linkText} onChange={e => setLinkText(e.target.value)} dir="auto" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">URL</Label>
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} dir="ltr" placeholder="https://" className="h-8 text-xs" />
            </div>
          </div>
          <Button onClick={handleInsertLink} disabled={!linkUrl} size="sm" className="w-full h-7 text-xs">{isRTL ? 'إدراج' : 'Insert'}</Button>
        </div>
      )}

      {activePanel === 'image' && (
        <div className="border-b bg-muted/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{isRTL ? 'إدراج صورة' : 'Insert Image'}</p>
            <button type="button" onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-7">
              <TabsTrigger value="upload" className="text-[10px] gap-1"><Upload className="w-3 h-3" />{isRTL ? 'رفع' : 'Upload'}</TabsTrigger>
              <TabsTrigger value="url" className="text-[10px] gap-1"><Globe className="w-3 h-3" />{isRTL ? 'رابط' : 'URL'}</TabsTrigger>
              <TabsTrigger value="library" className="text-[10px] gap-1"><Library className="w-3 h-3" />{isRTL ? 'المكتبة' : 'Library'}</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-2 mt-2">
              <ImageUpload bucket="blog-images" value={uploadedImageUrl}
                onChange={(url) => setUploadedImageUrl(url)} onRemove={() => setUploadedImageUrl('')}
                placeholder={isRTL ? 'اضغط لرفع صورة' : 'Click to upload'} />
              <div><Label className="text-[10px]">{isRTL ? 'النص البديل (SEO)' : 'Alt Text (SEO)'}</Label>
                <Input value={imageAlt} onChange={e => setImageAlt(e.target.value)} dir="auto" className="h-8 text-xs" /></div>
              <Button onClick={() => handleInsertImage(uploadedImageUrl, imageAlt)} disabled={!uploadedImageUrl} size="sm" className="w-full h-7 text-xs">
                {isRTL ? 'إدراج الصورة' : 'Insert Image'}
              </Button>
            </TabsContent>
            <TabsContent value="url" className="space-y-2 mt-2">
              <div><Label className="text-[10px]">URL</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} dir="ltr" placeholder="https://example.com/image.jpg" className="h-8 text-xs" /></div>
              {imageUrl && (
                <div className="rounded-lg overflow-hidden bg-muted h-24 flex items-center justify-center">
                  <img src={imageUrl} alt="preview" className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div><Label className="text-[10px]">{isRTL ? 'النص البديل (SEO)' : 'Alt Text (SEO)'}</Label>
                <Input value={imageAlt} onChange={e => setImageAlt(e.target.value)} dir="auto" className="h-8 text-xs" /></div>
              <Button onClick={() => handleInsertImage(imageUrl, imageAlt)} disabled={!imageUrl} size="sm" className="w-full h-7 text-xs">
                {isRTL ? 'إدراج الصورة' : 'Insert Image'}
              </Button>
            </TabsContent>
            <TabsContent value="library" className="mt-2">
              <BlogImageLibrary isRTL={isRTL} onSelect={(url) => {
                setImageUrl(url);
                handleInsertImage(url, imageAlt || 'blog-image');
              }} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {activePanel === 'table' && (
        <div className="border-b bg-muted/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{isRTL ? 'إدراج جدول' : 'Insert Table'}</p>
            <button type="button" onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">{isRTL ? 'الصفوف' : 'Rows'}</Label>
              <Input type="number" min="1" max="20" value={tableRows} onChange={e => setTableRows(e.target.value)} className="h-8 text-xs" /></div>
            <div><Label className="text-[10px]">{isRTL ? 'الأعمدة' : 'Columns'}</Label>
              <Input type="number" min="1" max="10" value={tableCols} onChange={e => setTableCols(e.target.value)} className="h-8 text-xs" /></div>
          </div>
          <Button onClick={handleInsertTable} size="sm" className="w-full h-7 text-xs">{isRTL ? 'إدراج' : 'Insert'}</Button>
        </div>
      )}

      {/* Editor area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); pushHistory(e.target.value); }}
        dir={dir}
        placeholder={placeholder || (isRTL ? 'اكتب محتوى المقال هنا... يدعم Markdown' : 'Write article content here... Supports Markdown')}
        className="w-full resize-y bg-transparent px-4 py-3 text-sm font-mono focus:outline-none placeholder:text-muted-foreground"
        style={{ minHeight }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') { e.preventDefault(); insertAtCursor('  '); }
          if (e.ctrlKey && e.key === 'b') { e.preventDefault(); actions.bold(); }
          if (e.ctrlKey && e.key === 'i') { e.preventDefault(); actions.italic(); }
          if (e.ctrlKey && e.key === 'z') { e.preventDefault(); actions.undo(); }
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
      const items = (data || [])
        .filter(f => f.name && /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(f.name))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from('blog-images').getPublicUrl(f.name).data.publicUrl,
        }));
      setImages(items);
      setLoaded(true);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div>
      {!loaded && (
        <Button variant="outline" size="sm" onClick={loadImages} disabled={loading} className="w-full text-xs h-7">
          {loading ? '...' : (isRTL ? 'تحميل المكتبة' : 'Load Library')}
        </Button>
      )}
      {loaded && images.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">{isRTL ? 'لا توجد صور' : 'No images'}</p>
      )}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {images.map((img, i) => (
          <button key={i} onClick={() => onSelect(img.url)}
            className="aspect-square rounded-md overflow-hidden border border-border/40 hover:border-primary transition-colors">
            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};
