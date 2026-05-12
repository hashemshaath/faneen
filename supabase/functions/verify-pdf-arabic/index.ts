// PDF-AR3: Backend Arabic-PDF verifier.
// Accepts a base64-encoded PDF (or raw bytes), scans uncompressed text-showing
// operands for mojibake markers (jsPDF + Helvetica fallback), and returns a
// pdftotext-style report for inline display in the diagnostics panel.
// No file is persisted, no external dependency is fetched; runs purely on
// the request bytes.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEXT_OPERAND_REGEX = /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*(?:Tj|TJ|')/g;
const MOJIBAKE_MARKER = /þ\S?þ\S?þ|þ.{0,2}ò|þ.{0,2}ª|þ.{0,2}ä/;
const REQUIRED_ARABIC = ['العقد', 'الضريبة', 'الضمان', 'الشروط'];

const decodeBase64 = (b64: string): Uint8Array => {
  const clean = b64.replace(/^data:application\/pdf;base64,/, '');
  const binary = atob(clean);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};

const bytesToLatin1 = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ status: 'FAIL', error: 'method_not_allowed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = req.headers.get('content-type') ?? '';
    let bytes: Uint8Array;
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (typeof body?.pdfBase64 !== 'string') {
        return new Response(JSON.stringify({ status: 'FAIL', error: 'missing_pdfBase64' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      bytes = decodeBase64(body.pdfBase64);
    } else {
      bytes = new Uint8Array(await req.arrayBuffer());
    }

    if (bytes.length < 32 || !(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      return new Response(JSON.stringify({ status: 'FAIL', error: 'not_a_pdf', byteLength: bytes.length }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = bytesToLatin1(bytes);
    const operands: string[] = [];
    let match: RegExpExecArray | null;
    TEXT_OPERAND_REGEX.lastIndex = 0;
    while ((match = TEXT_OPERAND_REGEX.exec(raw)) !== null) {
      operands.push(match[1]);
      if (operands.length > 8000) break;
    }
    const joined = operands.join('\n');
    const mojibakeCount = (joined.match(/þ/g) ?? []).length;
    const mojibakeDetected = MOJIBAKE_MARKER.test(joined) || mojibakeCount > 6;
    const arabicHits = Object.fromEntries(REQUIRED_ARABIC.map((w) => [w, joined.includes(w)]));
    const status = mojibakeDetected ? 'FAIL' : 'PASS';
    const sample = (mojibakeDetected
      ? operands.find((op) => /þ/.test(op))
      : operands.find((op) => /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(op))) ?? operands[0] ?? '';

    const report = [
      `# PDF Arabic verification report`,
      `status: ${status}`,
      `byteLength: ${bytes.length}`,
      `textOperands: ${operands.length}`,
      `mojibakeCount: ${mojibakeCount}`,
      `mojibakeDetected: ${mojibakeDetected}`,
      `arabicWordHits: ${JSON.stringify(arabicHits)}`,
      `sample: ${sample.slice(0, 240)}`,
    ].join('\n');

    return new Response(JSON.stringify({
      status,
      mojibakeDetected,
      mojibakeCount,
      sample: sample.slice(0, 240),
      verifiedAt: new Date().toISOString(),
      source: 'backend',
      report,
      arabicWordHits: arabicHits,
      byteLength: bytes.length,
      textOperands: operands.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ status: 'FAIL', error: 'verifier_exception', message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
