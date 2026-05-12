// 1×1 transparent tracking pixel served from external sites that embed the
// "Verified on Qitaat" badge. Each request inserts one `badge_impressions`
// row, then returns a transparent GIF with strict no-cache headers so the
// browser re-fetches it on every page render.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Minimal 1×1 transparent GIF (43 bytes).
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Access-Control-Allow-Origin': '*',
};

function pixel(): Response {
  return new Response(TRANSPARENT_GIF, { status: 200, headers: PIXEL_HEADERS });
}

function safeHost(referer: string | null): string | null {
  if (!referer) return null;
  try { return new URL(referer).hostname.replace(/^www\./, '').slice(0, 200); } catch { return null; }
}

Deno.serve(async (req) => {
  // Always return 200 OK with a pixel — never break the embedding page.
  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('u');
    const variant = url.searchParams.get('v');
    if (!username) return pixel();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: biz } = await supabase
      .from('businesses')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (biz?.id) {
      await supabase.from('badge_impressions').insert({
        business_id: biz.id,
        username: biz.username,
        variant: variant ? variant.slice(0, 32) : null,
        referrer_host: safeHost(req.headers.get('referer')),
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 512) || null,
      });
    }
  } catch (_err) {
    // Swallow — pixel must always render.
  }
  return pixel();
});