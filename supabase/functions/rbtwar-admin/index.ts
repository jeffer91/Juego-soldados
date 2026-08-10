import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods':'GET, OPTIONS'
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'GET') return new Response('Method not allowed',{status:405,headers:cors});
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return Response.json({error:'unauthorized'},{status:401,headers:cors});
    const token = auth.slice(7);
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await service.auth.getUser(token);
    const user=userData?.user;
    if(userError||!user) return Response.json({error:'unauthorized'},{status:401,headers:cors});
    const {data:admin}=await service.from('rbtwar_admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(!admin) return Response.json({error:'forbidden'},{status:403,headers:cors});

    const requestUrl=new URL(req.url);
    const days=Math.max(1,Math.min(365,Number(requestUrl.searchParams.get('days')||30)||30));
    const {data,error}=await service.rpc('rbtwar_admin_metrics',{p_days:days});
    if(error) throw error;
    return Response.json({...data,range_days:days},{headers:{...cors,'cache-control':'no-store'}});
  } catch(err){
    console.error(err);
    return Response.json({error:'admin_metrics_failed'},{status:500,headers:{...cors,'cache-control':'no-store'}});
  }
});
