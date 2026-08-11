(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const familyMeta=[
    {icon:'◆',name:'INFANTERÍA'},
    {icon:'◉',name:'VELOCIDAD'},
    {icon:'⬢',name:'BLINDADO'},
    {icon:'◎',name:'ALCANCE'},
    {icon:'✚',name:'SOPORTE'},
    {icon:'✦',name:'ESPECIAL'}
  ];

  function state(){try{return window.RBTwarAPI?.getState?.()||null;}catch(_){return null;}}

  function refreshBattleUnits(){
    const s=state();if(!s)return;
    const catalog=s.catalog||[],types=(s.battleUnits||[]).slice(0,4);
    const units=types.map(t=>catalog.find(u=>u.type===t)).filter(Boolean);
    const target=$('campaignUnits');
    if(target)target.textContent=units.length?units.map(u=>u.short).join(' · '):'BAS';
    const badge=document.querySelector('.army-badge small');
    if(badge)badge.textContent='EN ESTA BATALLA';
  }

  function decorateUpgradeCards(){
    const s=state();if(!s)return;
    const catalog=s.catalog||[];
    for(const u of catalog){
      const card=document.querySelector(`.upgrade-card.unit-${u.type}`);if(!card)continue;
      card.dataset.family=String(u.family||0);
      const meta=familyMeta[u.family||0]||familyMeta[0];
      const emblem=card.querySelector('.unit-emblem');if(emblem)emblem.textContent=meta.icon;
      const copy=card.querySelector('.unit-copy span');
      if(copy&&u.unlocked)copy.textContent=`${meta.name} · ${u.role||''}`.replace(/ · $/,'');
    }
  }

  function refresh(){requestAnimationFrame(()=>{refreshBattleUnits();decorateUpgradeCards();});}
  window.addEventListener('rbtwar:ready',refresh);
  window.addEventListener('rbtwar:state',refresh);
  const grid=$('upgradeGrid');if(grid)new MutationObserver(refresh).observe(grid,{childList:true,subtree:true});
  const info=$('selectedLevelInfo');if(info)new MutationObserver(refreshBattleUnits).observe(info,{childList:true,subtree:true,characterData:true});
  refresh();
  console.info('RBTwar catálogo visual v37 listo');
})();
