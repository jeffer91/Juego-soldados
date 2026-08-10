(() => {
  'use strict';
  const LOCAL_KEY = 'rbtwar-analytics-v29';
  const ENDPOINT_KEY = 'rbtwar-admin-endpoint-v30';
  const TOKEN_KEY = 'rbtwar-admin-token-v30';
  const $ = id => document.getElementById(id);
  const n = v => Number(v || 0);
  const pct = (a,b) => b > 0 ? Math.round((a / b) * 100) : 0;
  const fmtMinutes = sec => `${(n(sec) / 60).toFixed(n(sec) >= 600 ? 0 : 1)} min promedio`;
  let mode = 'local';
  let lastData = null;

  function localStore(){
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function groupLevels(events){
    const map = new Map();
    for(const e of events || []){
      const level = Math.max(1,n(e.level));
      if(!map.has(level)) map.set(level,{level,starts:0,wins:0,fails:0,exits:0,activeTotal:0,ended:0,installs:new Set()});
      const x=map.get(level); if(e.install_id)x.installs.add(e.install_id);
      if(e.event==='level_start')x.starts++;
      else if(e.event==='level_win'){x.wins++;x.activeTotal+=n(e.active_seconds);x.ended++;}
      else if(e.event==='level_fail'){x.fails++;x.activeTotal+=n(e.active_seconds);x.ended++;}
      else if(e.event==='level_exit')x.exits++;
    }
    return [...map.values()].sort((a,b)=>a.level-b.level).map(x=>({
      level:x.level,starts:x.starts,wins:x.wins,fails:x.fails,exits:x.exits,
      success_rate:pct(x.wins,x.wins+x.fails),avg_seconds:x.ended?Math.round(x.activeTotal/x.ended):0,
      installs:x.installs.size
    }));
  }

  function groupAds(events){
    const map=new Map();
    for(const e of events || []){
      if(!String(e.event||'').startsWith('ad_') && e.event!=='reward_received')continue;
      const key=e.placement||'sin_ubicación';
      if(!map.has(key))map.set(key,{placement:key,offers:0,clicks:0,starts:0,completes:0,rewards:0});
      const x=map.get(key);
      if(e.event==='ad_offer')x.offers++; else if(e.event==='ad_clicked')x.clicks++; else if(e.event==='ad_started')x.starts++; else if(e.event==='ad_completed')x.completes++; else if(e.event==='reward_received')x.rewards++;
    }
    return [...map.values()].map(x=>({...x,completion_rate:pct(x.completes,x.starts||x.offers)}));
  }

  function localMetrics(){
    const s=localStore();
    const events=s?.events||[],sessions=s?.sessions||[];
    const installs=new Set(events.map(e=>e.install_id).filter(Boolean)); if(s?.installId)installs.add(s.installId);
    const totals=s?.totals||{};
    const endedSessions=sessions.filter(x=>n(x.active_seconds)>0);
    const avgSession=endedSessions.length?Math.round(endedSessions.reduce((a,x)=>a+n(x.active_seconds),0)/endedSessions.length):0;
    const levels=groupLevels(events),ads=groupAds(events);
    const starts=n(totals.levelsStarted),wins=n(totals.wins),fails=n(totals.fails),exits=n(totals.exits);
    return {
      source:'local',overview:{installs:Math.max(1,installs.size),sessions:n(totals.sessions||sessions.length),avg_session_seconds:avgSession,levels_started:starts,wins,fails,exits,upgrades:n(totals.upgrades),ad_offers:n(totals.adOffers),ad_starts:n(totals.adStarts),ad_completes:n(totals.adCompletes),rewards:n(totals.rewardsGranted),max_level:n(s?.maxLevelSeen||1),win_rate:pct(wins,wins+fails)},
      levels,ads,recent:[...events].slice(-60).reverse(),daily:[]
    };
  }

  async function remoteMetrics(){
    const endpoint=localStorage.getItem(ENDPOINT_KEY)||'';
    const token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(!endpoint||!token)throw new Error('Falta endpoint o token de administrador.');
    const url=new URL(endpoint,location.href); url.searchParams.set('days','30');
    const r=await fetch(url,{headers:{authorization:`Bearer ${token}`,accept:'application/json'},credentials:'omit'});
    if(!r.ok)throw new Error(`Backend HTTP ${r.status}`);
    const data=await r.json(); return {...data,source:'remote'};
  }

  function setText(id,value){const el=$(id);if(el)el.textContent=String(value);}
  function eventDetail(e){
    const bits=[]; if(e.level)bits.push(`Nivel ${e.level}`); if(e.unit_type)bits.push(e.unit_type); if(e.placement)bits.push(e.placement); if(e.active_seconds!=null)bits.push(`${e.active_seconds}s`); if(e.reward_coins)bits.push(`+${e.reward_coins} monedas`); return bits.join(' · ')||'—';
  }

  function renderFunnel(levels){
    const root=$('levelFunnel'); if(!root)return;
    if(!levels?.length){root.className='funnel empty';root.textContent='Juega algunos niveles para generar datos.';return;}
    root.className='funnel';root.innerHTML='';
    const max=Math.max(1,...levels.map(x=>n(x.installs||x.starts)));
    for(const x of levels.slice(0,40)){
      const value=n(x.installs||x.starts),height=Math.max(8,Math.round((value/max)*120));
      const div=document.createElement('div');div.className='funnel-level';
      div.innerHTML=`<b>${value}</b><div class="funnel-bar" style="height:${height}px"></div><span>N${x.level}</span>`;root.appendChild(div);
    }
  }

  function renderLevels(levels){
    const body=$('levelTable'); if(!body)return;
    if(!levels?.length){body.innerHTML='<tr><td colspan="7" class="empty-cell">Sin partidas registradas.</td></tr>';return;}
    body.innerHTML=levels.map(x=>{const rate=n(x.success_rate);return `<tr><td><b>${x.level}</b></td><td>${n(x.starts)}</td><td>${n(x.wins)}</td><td>${n(x.fails)}</td><td>${n(x.exits)}</td><td><span class="rate-pill${rate<45?' low':''}">${rate}%</span></td><td>${n(x.avg_seconds)?`${n(x.avg_seconds)} s`:'—'}</td></tr>`}).join('');
  }

  function renderAds(ads,overview){
    const root=$('adsSummary');if(!root)return;
    if(!ads?.length){root.className='mini-bars empty';root.textContent='Todavía no hay eventos de anuncios.';return;}
    root.className='mini-bars'; const max=Math.max(1,...ads.map(x=>n(x.offers)));
    root.innerHTML=ads.slice(0,8).map(x=>`<div class="mini-row"><label>${x.placement}</label><div class="mini-track"><div class="mini-fill" style="width:${Math.max(2,(n(x.offers)/max)*100)}%"></div></div><b>${n(x.completes)}/${n(x.offers)}</b></div>`).join('');
  }

  function renderRecent(events){
    const root=$('recentEvents');if(!root)return;setText('eventCount',`${events?.length||0} eventos`);
    if(!events?.length){root.className='event-list empty';root.textContent='No hay eventos todavía.';return;}
    root.className='event-list';root.innerHTML=events.slice(0,40).map(e=>{const d=new Date(e.ts||e.received_at||Date.now());return `<div class="event-row"><time>${d.toLocaleString([], {month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time><strong>${e.event||'evento'}</strong><span>${eventDetail(e)}</span><b>${e.install_id?String(e.install_id).slice(0,7):''}</b></div>`}).join('');
  }

  function render(data){
    lastData=data; const o=data?.overview||{}; mode=data?.source==='remote'?'remote':'local';
    const badge=$('sourceBadge');if(badge){badge.textContent=mode==='remote'?'REMOTO':'LOCAL';badge.className=`source-badge ${mode}`;}
    setText('connectionText',mode==='remote'?'Datos agregados de todos los jugadores conectados al backend.':'Mostrando los datos de prueba guardados en este dispositivo.');
    setText('metricInstalls',n(o.installs||1));setText('metricSessions',n(o.sessions));setText('metricSessionAvg',fmtMinutes(o.avg_session_seconds));setText('metricStarts',n(o.levels_started));setText('metricWinRate',`${n(o.win_rate)}% victorias`);setText('metricMaxLevel',Math.max(1,n(o.max_level)));setText('metricUpgrades',n(o.upgrades));setText('metricAds',n(o.ad_completes));setText('metricAdRate',`${pct(n(o.ad_completes),n(o.ad_starts||o.ad_offers))}% completados`);
    const rate=n(o.win_rate);const donut=$('resultDonut');if(donut)donut.style.setProperty('--value',rate);setText('donutValue',`${rate}%`);setText('legendWins',n(o.wins));setText('legendFails',n(o.fails));setText('legendExits',n(o.exits));setText('funnelHint',mode==='remote'?'Últimos 30 días':'Este dispositivo');
    renderFunnel(data.levels||[]);renderLevels(data.levels||[]);renderAds(data.ads||[],o);renderRecent(data.recent||[]);
  }

  async function refresh(){
    const endpoint=localStorage.getItem(ENDPOINT_KEY),token=sessionStorage.getItem(TOKEN_KEY);
    if(endpoint&&token){try{return render(await remoteMetrics())}catch(err){console.warn(err);setText('connectionText',`Backend no disponible: ${err.message}. Mostrando datos locales.`);}}
    render(localMetrics());
  }

  function download(){const payload=lastData||localMetrics();const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rbtwar-admin-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}

  $('refreshBtn')?.addEventListener('click',refresh);$('exportBtn')?.addEventListener('click',download);
  $('connectionBtn')?.addEventListener('click',()=>{const d=$('connectionDialog');$('adminEndpoint').value=localStorage.getItem(ENDPOINT_KEY)||'';$('adminToken').value=sessionStorage.getItem(TOKEN_KEY)||'';d?.showModal();});
  $('saveConnectionBtn')?.addEventListener('click',e=>{e.preventDefault();const endpoint=$('adminEndpoint').value.trim(),token=$('adminToken').value.trim();if(endpoint)localStorage.setItem(ENDPOINT_KEY,endpoint);else localStorage.removeItem(ENDPOINT_KEY);if(token)sessionStorage.setItem(TOKEN_KEY,token);else sessionStorage.removeItem(TOKEN_KEY);$('connectionDialog')?.close();refresh();});
  refresh(); console.info('RBTwar Admin v30 listo');
})();
