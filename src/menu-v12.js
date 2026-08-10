(() => {
  'use strict';

  const info = {
    basic: { title: 'CAPTURADOR', text: 'Captura +35% · +15% contra estructuras', strong: 'Ideal para conquistar fábricas y CORE.' },
    fast: { title: 'CAZADOR', text: 'Ventaja contra Francotirador · débil contra Pesado', strong: 'Úsalo para cerrar distancias rápidamente.' },
    heavy: { title: 'BLINDADO', text: 'Ventaja contra Rápido · 15% blindaje · daño en área', strong: 'Excelente para romper grupos enemigos.' },
    sniper: { title: 'LARGO ALCANCE', text: 'Ventaja contra Pesado · débil contra Rápido', strong: 'Manténlo detrás de otros pelotones.' }
  };
  const biomeNames={desert:'Desierto',canyon:'Cañón',forest:'Bosque',snow:'Nieve',city:'Ciudad',elite:'Zona Élite'};
  const $ = id => document.getElementById(id);
  const grid=$('upgradeGrid'),campaignZone=$('campaignZone'),campaignProgressFill=$('campaignProgressFill'),startProgress=$('startProgress');
  const progressLabel=document.querySelector('.campaign-progress small');

  function state(){return window.RBTwarAPI?.getState?.()||null;}

  function decorateCards(){
    if(!grid)return;
    for(const [type,copy] of Object.entries(info)){
      const card=grid.querySelector(`.unit-${type}`);if(!card)continue;
      let role=card.querySelector('.strategy-role');
      if(!role){
        role=document.createElement('div');role.className='strategy-role';
        const action=card.querySelector('.upgrade-buy');if(action)card.insertBefore(role,action);else card.appendChild(role);
      }
      role.innerHTML=`<small>${copy.title}</small><strong>${copy.text}</strong><span>${copy.strong}</span>`;
    }
  }

  function refreshProgress(){
    const s=state();if(!s)return;
    const level=Math.max(1,s.currentLevel||1),max=Math.max(1,s.unlockedLevel||1),meta=s.levelMeta||{};
    if(campaignZone)campaignZone.textContent=`${biomeNames[meta.biome]||'Zona'} · Nivel ${level}`;
    if(campaignProgressFill)campaignProgressFill.style.width=`${(((level-1)%10)+1)*10}%`;
    if(progressLabel)progressLabel.textContent='CICLO DE 10 NIVELES';
    if(startProgress)startProgress.textContent=`Nivel máximo ${max}`;
    document.body.classList.toggle('boss-level',level%10===0);
  }

  function refresh(){requestAnimationFrame(()=>{decorateCards();refreshProgress();});}
  window.addEventListener('rbtwar:ready',refresh);
  window.addEventListener('rbtwar:state',refresh);
  if(grid)new MutationObserver(refresh).observe(grid,{childList:true,subtree:true});
  const selectedLevelInfo=$('selectedLevelInfo');
  if(selectedLevelInfo)new MutationObserver(refreshProgress).observe(selectedLevelInfo,{childList:true,characterData:true,subtree:true});
  refresh();
})();