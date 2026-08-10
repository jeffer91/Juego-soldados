(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const labels={easy:'FÁCIL',medium:'NORMAL',hard:'RETO',recovery:'DESCANSO',bastion:'BASTIÓN'};
  let lastKey='';

  function ensureBadge(){
    let badge=$('difficultyBadge');
    if(badge)return badge;
    const summary=document.querySelector('.campaign-summary');
    if(!summary)return null;
    badge=document.createElement('div');
    badge.id='difficultyBadge';
    badge.className='difficulty-badge medium';
    badge.innerHTML='<small>DIFICULTAD</small><strong>NORMAL</strong>';
    summary.appendChild(badge);
    return badge;
  }

  function refresh(){
    const state=window.RBTwarAPI?.getState?.();
    if(!state)return;
    const tier=state.levelMeta?.difficulty||'medium',level=Number(state.currentLevel||1);
    const badge=ensureBadge();
    if(badge){badge.className=`difficulty-badge ${tier}`;const strong=badge.querySelector('strong');if(strong)strong.textContent=labels[tier]||'NORMAL';}
    document.body.dataset.difficulty=tier;
    const key=`${level}-${tier}`;
    if(key!==lastKey){
      lastKey=key;
      try{window.RBTwarAnalytics?.track?.('balance_profile',{level,tier});}catch(_){}
    }
  }

  window.addEventListener('rbtwar:ready',refresh);
  window.addEventListener('rbtwar:state',refresh);
  const selected=$('selectedLevelInfo');if(selected)new MutationObserver(()=>setTimeout(refresh,0)).observe(selected,{childList:true,characterData:true,subtree:true});
  setTimeout(refresh,0);
})();
