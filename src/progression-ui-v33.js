(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const names={desert:'Desierto',canyon:'Cañón',forest:'Bosque',snow:'Nieve',city:'Ciudad',elite:'Élite'};
  function refresh(){
    const s=window.RBTwarAPI?.getState?.();
    if(!s)return;
    const level=Math.max(1,Number(s.currentLevel||1));
    const cycle=Math.max(1,Number(s.levelMeta?.cycle||Math.floor((level-1)/30)+1));
    const zone=names[s.levelMeta?.biome]||'Zona';
    const z=$('campaignZone');if(z)z.textContent=`${zone} · Ciclo ${cycle}`;
    const p=document.querySelector('.campaign-progress small');if(p)p.textContent=`OLA ${((level-1)%10)+1}/10 · CICLO ${cycle}`;
    const start=$('startProgress');if(start&&!String(start.textContent||'').includes('Ciclo'))start.textContent=`Nivel máximo ${s.unlockedLevel} · Ciclo ${cycle}`;
    document.body.dataset.cycle=String(cycle);
  }
  window.addEventListener('rbtwar:ready',()=>setTimeout(refresh,0));
  window.addEventListener('rbtwar:state',()=>setTimeout(refresh,0));
  const selected=$('selectedLevelInfo');if(selected)new MutationObserver(()=>setTimeout(refresh,0)).observe(selected,{childList:true,characterData:true,subtree:true});
  setTimeout(refresh,0);
  console.info('RBTwar progresión visual v33 lista');
})();