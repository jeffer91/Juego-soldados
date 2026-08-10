(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const names={desert:'Desierto',canyon:'Cañón',forest:'Bosque',snow:'Nieve',city:'Ciudad',elite:'Zona Élite'};

  function state(){try{return window.RBTwarAPI?.getState?.()||null;}catch(_){return null;}}

  function ensureCycleNav(){
    let nav=$('cycleNav');
    if(nav)return nav;
    const head=document.querySelector('.level-map-head');
    if(!head)return null;
    nav=document.createElement('div');
    nav.id='cycleNav';nav.className='cycle-nav';
    nav.innerHTML='<button id="cyclePrev" type="button" aria-label="Ciclo anterior">‹</button><strong id="cycleLabel">CICLO 1</strong><button id="cycleNext" type="button" aria-label="Ciclo siguiente">›</button>';
    head.appendChild(nav);
    $('cyclePrev')?.addEventListener('click',()=>moveCycle(-1));
    $('cycleNext')?.addEventListener('click',()=>moveCycle(1));
    return nav;
  }

  function moveCycle(delta){
    const s=state();if(!s||typeof window.RBTwarAPI?.selectLevel!=='function')return;
    const current=Math.max(1,Number(s.currentLevel||1));
    const currentCycle=Math.floor((current-1)/30)+1;
    const unlocked=Math.max(1,Number(s.unlockedLevel||1));
    const maxCycle=Math.floor((unlocked-1)/30)+1;
    const targetCycle=Math.max(1,Math.min(maxCycle,currentCycle+delta));
    if(targetCycle===currentCycle)return;
    const first=(targetCycle-1)*30+1;
    const last=targetCycle*30;
    const target=delta<0?Math.min(last,unlocked):Math.min(first,unlocked);
    window.RBTwarAPI.selectLevel(target);
    try{window.RBTwarAnalytics?.track?.('cycle_select',{cycle:targetCycle,level:target});}catch(_){}
  }

  function fixExperienceBiome(){
    const kicker=$('experienceKicker'),title=$('experienceTitle');
    if(!kicker||!title)return;
    if(String(kicker.textContent||'').trim().toUpperCase()!=='NUEVA ZONA')return;
    const key=String(title.textContent||'').trim().toLowerCase();
    if(names[key])title.textContent=names[key];
  }

  function refresh(){
    const s=state();if(!s)return;
    const level=Math.max(1,Number(s.currentLevel||1));
    const unlocked=Math.max(1,Number(s.unlockedLevel||1));
    const cycle=Math.max(1,Number(s.levelMeta?.cycle||Math.floor((level-1)/30)+1));
    const maxCycle=Math.floor((unlocked-1)/30)+1;
    const zone=names[s.levelMeta?.biome]||'Zona';
    const z=$('campaignZone');if(z)z.textContent=`${zone} · Ciclo ${cycle}`;
    const p=document.querySelector('.campaign-progress small');if(p)p.textContent=`OLA ${((level-1)%10)+1}/10 · CICLO ${cycle}`;
    const start=$('startProgress');if(start)start.textContent=`Nivel máximo ${unlocked} · Ciclo ${cycle}`;
    const nav=ensureCycleNav();
    if(nav){
      const label=$('cycleLabel');if(label)label.textContent=`CICLO ${cycle}`;
      const prev=$('cyclePrev'),next=$('cycleNext');
      if(prev)prev.disabled=cycle<=1;
      if(next)next.disabled=cycle>=maxCycle;
    }
    document.body.dataset.cycle=String(cycle);
    fixExperienceBiome();
  }

  function selfTest(){
    const api=window.RBTwarAPI,s=state(),issues=[];
    if(!api)issues.push('API');
    for(const name of ['getState','selectLevel','getAssistState','canReward','applyReward'])if(typeof api?.[name]!=='function')issues.push(name);
    if(!s?.levelMeta?.difficulty)issues.push('difficulty');
    if(!Number.isFinite(Number(s?.levelMeta?.cycle)))issues.push('cycle');
    if(!Array.isArray(s?.catalog)||!s.catalog.length)issues.push('catalog');
    if(issues.length){console.error('RBTwar v34 autoprueba: faltan',issues);return false;}
    console.info('RBTwar v34 autoprueba OK');
    return true;
  }

  window.addEventListener('rbtwar:ready',()=>{setTimeout(()=>{refresh();selfTest();},0);});
  window.addEventListener('rbtwar:state',()=>setTimeout(refresh,0));
  const selected=$('selectedLevelInfo');if(selected)new MutationObserver(()=>setTimeout(refresh,0)).observe(selected,{childList:true,characterData:true,subtree:true});
  const bodyObserver=new MutationObserver(()=>setTimeout(fixExperienceBiome,0));
  bodyObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(refresh,0);
  console.info('RBTwar progresión visual v34 lista');
})();
