import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const allowed = new Set([
  'session_start','session_end','level_select','cycle_select','level_start','level_win','level_fail','level_retry','level_exit','unit_upgrade',
  'balance_profile','assist_available','ad_offer','ad_clicked','ad_started','ad_completed','reward_received','ad_failed','ad_skipped','analytics_endpoint_changed'
]);
const text = (v: unknown, max=180) => typeof v === 'string' ? v.slice(0,max) : null;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'POST') return new Response('Method not allowed',{status:405,headers:cors});
  try {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > 180000) return new Response('Payload too large',{status:413,headers:cors});
    const body = await req.json();
    const events = Array.isArray(body?.events) ? body.events.slice(0,60) : [];
    if (!events.length) return Response.json({ok:true,accepted:0},{headers:cors});

    const rows = events.flatMap((e: any) => {
      if (!e || !allowed.has(String(e.event || '')) || !e.event_id || !e.install_id || !e.session_id || !e.ts) return [];
      const parsedTs = new Date(e.ts);
      if (Number.isNaN(parsedTs.getTime())) return [];
      return [{
        event_id:text(e.event_id,90), ts:parsedTs.toISOString(), app_version:text(e.app_version,30), install_id:text(e.install_id,90), session_id:text(e.session_id,90), event:text(e.event,60),
        level:num(e.level), unlocked_level:num(e.unlocked_level), biome:text(e.biome,30), coins:num(e.coins), stars_total:num(e.stars_total), run_id:text(e.run_id,90),
        active_seconds:num(e.active_seconds), wall_seconds:num(e.wall_seconds), stars:num(e.stars), reward_coins:num(e.reward_coins), unit_type:text(e.unit_type,40),
        from_level:num(e.from_level), to_level:num(e.to_level), cost:num(e.cost), placement:text(e.placement,80), reward:text(e.reward,80), raw:e
      }];
    });
    if (!rows.length) return Response.json({ok:true,accepted:0},{headers:cors});

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false}});
    const {error} = await supabase.from('rbtwar_analytics_events').upsert(rows,{onConflict:'event_id',ignoreDuplicates:true});
    if (error) throw error;
    return Response.json({ok:true,accepted:rows.length},{headers:{...cors,'cache-control':'no-store'}});
  } catch (err) {
    console.error(err);
    return Response.json({ok:false,error:'analytics_ingest_failed'},{status:400,headers:{...cors,'cache-control':'no-store'}});
  }
});
