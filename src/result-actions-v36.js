(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const btn=$('upgradeResultBtn');
  const modal=$('resultModal');
  if(!btn||!modal)return;

  function victory(){return String($('resultEyebrow')?.textContent||'').toUpperCase().includes('VICTORIA');}
  function sync(){
    const visible=!modal.classList.contains('hidden');
    btn.classList.toggle('hidden',!visible||!victory());
    if(!visible||!victory())return;
    try{
      const s=window.RBTwarAPI?.getState?.();
      const affordable=(s?.catalog||[]).some(u=>u.unlocked&&u.level<u.maxLevel&&u.cost>0&&u.cost<=Number(s.coins||0));
      btn.classList.toggle('upgrade-ready',affordable);
      btn.textContent=affordable?'⬆ MEJORAR':'MEJORAS';
    }catch(_){btn.textContent='MEJORAS';}
  }

  btn.addEventListener('click',()=>{
    try{window.RBTwarAPI?.showHome?.();}catch(_){}
    setTimeout(()=>{
      $('upgradesTab')?.click();
      $('upgradeGrid')?.querySelector('.upgrade-buy:not(:disabled)')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    },0);
  });

  new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['class']});
  window.addEventListener('rbtwar:state',sync);
  sync();
  console.info('RBTwar acciones de resultado v36 listas');
})();
