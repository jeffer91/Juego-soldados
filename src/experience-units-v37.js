(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  function state(){try{return window.RBTwarAPI?.getState?.()||null;}catch(_){return null;}}
  function sync(){
    const overlay=$('experienceOverlay');if(!overlay||overlay.classList.contains('hidden'))return;
    if(String($('experienceKicker')?.textContent||'').toUpperCase()!=='NUEVA UNIDAD')return;
    const s=state(),level=Math.max(1,Number(s?.currentLevel||1));
    const unit=(s?.catalog||[]).find(u=>Number(u.unlock)===level);if(!unit)return;
    if($('experienceTitle'))$('experienceTitle').textContent=`Robot ${unit.name}`;
    if($('experienceFeature'))$('experienceFeature').textContent=`⚡ ${unit.name.toUpperCase()} DISPONIBLE`;
  }
  const watch=()=>{const overlay=$('experienceOverlay');if(!overlay||overlay.dataset.units37)return;overlay.dataset.units37='1';new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class','data-mode'],subtree:true,childList:true});};
  new MutationObserver(()=>{watch();sync();}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('rbtwar:ready',()=>{watch();sync();});
  watch();
})();
