/**
 * Lightweight bilingual (AR + EN) normalization for help-center search.
 * - Lowercase EN
 * - Strip Arabic diacritics
 * - Unify alef variants (إ أ آ → ا), ya (ى → ي), ta marbuta (ة → ه)
 * - Remove punctuation
 * - Light EN stemming (drop trailing 's')
 * - Light AR stemming (drop common prefixes ال / و / ف and trailing ون/ين/ات)
 * - Built-in synonyms map for common domain typos / variants
 */

const AR_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const PUNCT = /[\.,!?؟،؛:;()\[\]{}"'`~@#$%^&*+=/\\|<>_-]+/g;

const SYNONYMS: Record<string, string> = {
  rfq: 'rfq request for quotation',
  'request for quotation': 'rfq request for quotation',
  quotation: 'quote quotation quotations',
  quotations: 'quote quotation quotations',
  quote: 'quote quotation quotations',
  po: 'po purchase order',
  boq: 'boq bill of quantities',
  wo: 'wo work order',
  'work order': 'wo work order',
  contract: 'contract contracts',
  contracts: 'contract contracts',
  'مقاولين': 'مقاول',
  'العقود': 'عقد',
  'العقد': 'عقد',
  'الفواتير': 'فاتوره',
  'الفاتورة': 'فاتوره',
  'أوامر': 'امر',
  'الأوامر': 'امر',
};

export function normalizeQuery(input: string): string {
  if (!input) return '';
  let s = input.toString().toLowerCase().trim();
  s = s.replace(AR_DIACRITICS, '');
  s = s.replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  s = s.replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
  // expand synonyms
  for (const [k, v] of Object.entries(SYNONYMS)) {
    const re = new RegExp(`(^|\\s)${k}(\\s|$)`, 'g');
    if (re.test(s)) s = s.replace(re, ` ${v} `);
  }
  return s.replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'is', 'are', 'how', 'what', 'why',
  'في', 'من', 'الى', 'و', 'او', 'هل', 'كيف', 'ما', 'هو', 'هي',
]);

export function tokenize(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/\s+/)) {
    let t = raw.trim();
    if (!t || STOPWORDS.has(t)) continue;
    // EN light stem
    if (/^[a-z0-9]+$/.test(t)) {
      if (t.length > 4 && t.endsWith('ies')) t = `${t.slice(0, -3)}y`;
      else if (t.length > 3 && t.endsWith('es')) t = t.slice(0, -2);
      else if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1);
    } else {
      // AR light stem: drop prefix ال / و / ف and suffixes
      if (t.length > 4 && t.startsWith('ال')) t = t.slice(2);
      if (t.length > 4 && (t.startsWith('و') || t.startsWith('ف'))) t = t.slice(1);
      if (t.length > 4 && (t.endsWith('ون') || t.endsWith('ين') || t.endsWith('ات'))) t = t.slice(0, -2);
    }
    if (t) out.push(t);
  }
  return out;
}

export function correctTypos(input: string, vocab: Iterable<string>): string {
  const tokens = tokenize(normalizeQuery(input));
  const vocabSet = new Set<string>();
  for (const v of vocab) for (const t of tokenize(normalizeQuery(v))) vocabSet.add(t);
  return tokens
    .map((t) => {
      if (vocabSet.has(t)) return t;
      // 1-edit-distance correction against vocab
      for (const v of vocabSet) {
        if (Math.abs(v.length - t.length) <= 1 && editDistance(t, v) <= 1) return v;
      }
      return t;
    })
    .join(' ');
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  const curr: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}