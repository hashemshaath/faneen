import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROOT = process.cwd();
const regularPath = join(ROOT, 'src/assets/fonts/NotoNaskhArabic-Regular.ttf');
const boldPath = join(ROOT, 'src/assets/fonts/NotoNaskhArabic-Bold.ttf');
const required = ['العقد', 'الضريبة', 'الضمان', 'الشروط', 'الله', 'أحد'];
const mojibake = /þ|Ã|Â|Ù|WOFF/i;

const magic = (buf) => Array.from(buf.subarray(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
const isTtf = (buf) => ['00 01 00 00', '4f 54 54 4f', '74 72 75 65', '74 79 70 31'].includes(magic(buf));
const normalize = (s) => s.normalize('NFKC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u200E\u200F\u202A-\u202E]/g, '');

if (!existsSync(regularPath)) throw new Error(`Missing Arabic font: ${regularPath}`);
execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });

const regular = readFileSync(regularPath);
const bold = existsSync(boldPath) ? readFileSync(boldPath) : regular;
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
doc.addFileToVFS('ArabicFont-Regular-pdf-ar2.ttf', regular.toString('base64'));
doc.addFont('ArabicFont-Regular-pdf-ar2.ttf', 'ArabicFont', 'normal');
doc.addFileToVFS('ArabicFont-Bold-pdf-ar2.ttf', bold.toString('base64'));
doc.addFont('ArabicFont-Bold-pdf-ar2.ttf', 'ArabicFont', 'bold');
doc.setFont('ArabicFont', 'normal');
doc.setFontSize(16);
doc.text('اختبار PDF عربي — CNT-1000007', 190, 18, { align: 'right' });
doc.setFontSize(10);
doc.text('هذا ملف تحقق آمن لا يستخدم بيانات إنتاجية ولا يسجل سجل تصدير.', 190, 28, { align: 'right' });
doc.text('العقد والضريبة والضمان والشروط — 1000×2000 mm — 12,500 SAR — QR/HASH placeholder', 190, 38, { align: 'right' });
doc.text('نص قرآني لاختبار عرض الخط العربي فقط', 190, 52, { align: 'right' });
doc.setFontSize(14);
doc.text('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 190, 62, { align: 'right' });
doc.text('قُلْ هُوَ اللَّهُ أَحَدٌ', 190, 72, { align: 'right' });
doc.text('اللَّهُ الصَّمَدُ', 190, 82, { align: 'right' });
autoTable(doc, {
  startY: 94,
  head: [['#', 'البند', 'الأبعاد', 'المبلغ']],
  body: [
    ['1', 'العقد الرسمي', '1000×2000 mm', '1,000 SAR'],
    ['2', 'الضريبة والضمان', '15%', '150 SAR'],
    ['3', 'الشروط', 'ملحق 1', '0 SAR'],
  ],
  styles: { font: 'ArabicFont', fontSize: 9, halign: 'right', cellPadding: 3 },
  headStyles: { font: 'ArabicFont', fontStyle: 'bold', halign: 'right' },
});

const outArgIndex = process.argv.indexOf('--out');
const temp = mkdtempSync(join(tmpdir(), 'qitaat-pdf-ar2-'));
const pdfPath = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : join(temp, 'qitaat-arabic-verification.pdf');
const txtPath = `${pdfPath}.txt`;
writeFileSync(pdfPath, Buffer.from(doc.output('arraybuffer')));
execFileSync('pdftotext', ['-layout', pdfPath, txtPath]);
const extracted = readFileSync(txtPath, 'utf8');
const normalized = normalize(extracted);
const found = Object.fromEntries(required.map((word) => [word, normalized.includes(normalize(word))]));
const failedWords = Object.entries(found).filter(([, ok]) => !ok).map(([word]) => word);
const bad = mojibake.test(extracted);

console.log(JSON.stringify({
  status: failedWords.length || bad ? 'FAIL' : 'PASS',
  fontUrl: regularPath,
  contentType: 'font/ttf',
  magicBytes: magic(regular),
  isTrueTypeSignature: isTtf(regular),
  extractedSample: extracted.slice(0, 500),
  found,
  mojibakeDetected: bad,
  pdfPath,
}, null, 2));

if (outArgIndex < 0) rmSync(temp, { recursive: true, force: true });
if (failedWords.length || bad || !isTtf(regular)) process.exit(1);
