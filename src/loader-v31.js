(() => {
  'use strict';
  const SOURCE_URL='src/loader-v26.js?v=31';
  const API_MARKER='window.RBTwarAPI={';
  function fail(error){console.error('RBTwar v31 no pudo preparar ayudas:',error);const toast=document.getElementById('toast');if(toast){toast.textContent='Error al preparar ayudas de partida.';toast.classList.add('show');}}
  console.info('RBTwar bootstrap v31');
  fetch(SOURCE_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Bootstrap HTTP ${r.status}`);return r.text();}).then(loader=>{
    if(!loader.includes(API_MARKER))throw new Error('Punto de extensión no encontrado.');
    const assistApi=`
function rbtwarAssistState(){
 if(!game)return{active:false};
 const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER);
 const squads=game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.count>0);
 return{active:!inMenu&&!ended,level:game.level,coreHp:hq?Math.round(hq.hp):0,coreMaxHp:hq?Math.round(hq.maxHp):0,corePct:hq?Math.round(100*clamp(hq.hp/Math.max(1,hq.maxHp),0,1)):0,squads:squads.length,robots:squads.reduce((n,s)=>n+s.count,0)};
}
function rbtwarApplyReward(kind){
 if(!game||inMenu||ended)return{ok:false,reason:'inactive'};
 const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER&&n.hp>0);
 const squads=game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.count>0);
 if(kind==='reinforcements'){
  let remaining=2,added=0;const targets=[...squads].filter(s=>s.count<5).sort((a,b)=>a.count-b.count||a.hp-b.hp);
  for(const q of targets){if(remaining<=0)break;const take=Math.min(remaining,5-q.count);if(take<=0)continue;q.count+=take;q.maxHp=q.unitHp*q.count;q.hp=Math.min(q.maxHp,q.hp+q.unitHp*take);remaining-=take;added+=take;spawnBurst(q.x,q.y,TEAM_COLOR.player,6+take*3);}
  if(remaining>0){const node=game.nodes.find(n=>n.team===TEAM.PLAYER&&n.hp>0);if(node){node.spawnQueue+=remaining;node.spawnCooldown=Math.min(node.spawnCooldown||.3,.3);added+=remaining;spawnBurst(node.x,node.y,TEAM_COLOR.player,8);}}
  return{ok:added>0,kind,added};
 }
 if(kind==='core_repair'){
  if(!hq)return{ok:false,reason:'no_core'};const before=hq.hp;hq.hp=Math.min(hq.maxHp,hq.hp+hq.maxHp*.35);spawnBurst(hq.x,hq.y,TEAM_COLOR.player,16);return{ok:hq.hp>before,kind,healed:Math.round(hq.hp-before),corePct:Math.round(100*hq.hp/hq.maxHp)};
 }
 if(kind==='army_power'){
  if(!squads.length)return{ok:false,reason:'no_squads'};if(game._rewardArmyPower)return{ok:false,reason:'already'};game._rewardArmyPower=true;for(const q of squads){q.damage*=1.25;q.hp=Math.min(q.maxHp,q.hp+q.maxHp*.15);spawnBurst(q.x,q.y,TEAM_COLOR.player,7);}return{ok:true,kind,squads:squads.length,damageBoost:25};
 }
 return{ok:false,reason:'unknown'};
}
`;
    loader=loader.replace(API_MARKER,assistApi+'\n'+API_MARKER);
    loader=loader.replace(" restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;}\n};"," restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;},\n getAssistState:rbtwarAssistState,\n applyReward:rbtwarApplyReward\n};");
    if(!loader.includes('applyReward:rbtwarApplyReward'))throw new Error('No se pudo extender RBTwarAPI.');
    try{new Function(loader);}catch(e){throw new Error(`Sintaxis bootstrap v31: ${e.message}`);}
    const script=document.createElement('script');script.dataset.rbtwarBootstrap='v31';script.textContent=loader;document.head.appendChild(script);
  }).catch(fail);
})();