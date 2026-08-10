(() => {
  'use strict';

  window.RBTwarV12Patch = (corrected, replaceOne) => {
    corrected = corrected
      .replace("const STORAGE_KEY='rbtwar-save-v11',MAX_LEVEL=Number.MAX_SAFE_INTEGER,MAX_CAMPAIGN=30;", "const STORAGE_KEY='rbtwar-save-v12',MAX_LEVEL=Number.MAX_SAFE_INTEGER,MAX_CAMPAIGN=30;")
      .replace("for(const key of [STORAGE_KEY,'rbtwar-save-v10'", "for(const key of [STORAGE_KEY,'rbtwar-save-v11','rbtwar-save-v10'");

    const worldHelpers = `function biomeKey(level){
 const order=['desert','canyon','forest','snow','city','elite'];
 return order[Math.floor((Math.max(1,level)-1)/5)%order.length];
}
function worldIndex(level){return Math.floor((Math.max(1,level)-1)/5)%WORLD_NAMES.length;}
function displayTitle(level){
 if(level<=30)return TITLES[level-1];
 const names=['Ruta abierta','Cruce móvil','Control central','Zona de presión','Recuperación','Doble frente','Asalto táctico','Respiro','Último empuje','Bastión'];
 return names[(level-1)%10];
}
function displayZone(level){
 const names={desert:'Desierto',canyon:'Cañón',forest:'Bosque',snow:'Nieve',city:'Ciudad',elite:'Zona Élite'};
 return names[biomeKey(level)]||'Zona de batalla';
}`;
    corrected = replaceOne(
      corrected,
      /function biomeKey\(level\)\{[\s\S]*?\}\nfunction worldIndex\(level\)\{[\s\S]*?\}\nfunction displayTitle\(level\)\{[\s\S]*?\}\nfunction displayZone\(level\)\{[\s\S]*?\}/,
      worldHelpers,
      'niveles numéricos continuos'
    );

    const levelConfig = `function levelConfig(level){
 const slot=(Math.max(1,level)-1)%10,block=Math.floor((Math.max(1,level)-1)/10);
 const waves=[
  {name:'ALIVIO',hp:.72,dmg:.68,prod:1.36,delay:8.2,core:.82,units:1,reward:.92,style:'cautious'},
  {name:'EXPANSIÓN',hp:.86,dmg:.82,prod:1.20,delay:6.5,core:.92,units:2,reward:1,style:'cautious'},
  {name:'CONTROL',hp:.96,dmg:.92,prod:1.09,delay:5.3,core:1,units:2,reward:1.03,style:'balanced'},
  {name:'DESAFÍO',hp:1.10,dmg:1.06,prod:.94,delay:3.9,core:1.10,units:3,reward:1.13,style:'aggressive'},
  {name:'RESPIRO',hp:.76,dmg:.72,prod:1.31,delay:7.4,core:.86,units:1,reward:.94,style:'cautious'},
  {name:'CRUCE',hp:.97,dmg:.94,prod:1.07,delay:5.0,core:1,units:2,reward:1.03,style:'balanced'},
  {name:'PRESIÓN',hp:1.14,dmg:1.10,prod:.91,delay:3.5,core:1.12,units:3,reward:1.16,style:'aggressive'},
  {name:'RECUPERACIÓN',hp:.80,dmg:.76,prod:1.27,delay:6.9,core:.88,units:2,reward:.95,style:'cautious'},
  {name:'ASALTO',hp:1.03,dmg:1.00,prod:1.00,delay:4.5,core:1.04,units:3,reward:1.07,style:'balanced'},
  {name:'BASTIÓN',hp:1.22,dmg:1.17,prod:.85,delay:2.9,core:1.24,units:4,reward:1.35,style:'elite'}
 ];
 const wave=waves[slot],boss=slot===9;
 const growth=1+Math.min(.50,block*.02);
 const early=Math.min(1,Math.max(.72,.72+(level-1)*.055));
 const hpGrowth=growth*(level<=6?early:1),damageGrowth=(1+Math.min(.42,block*.017))*(level<=6?early:1);
 const extraUnits=Math.min(1,Math.floor(block/5));
 return{title:displayTitle(level),biome:biomeKey(level),mission:wave.name,style:wave.style,boss,endless:false,endlessTier:0,wave:slot+1,
  aiDelay:wave.delay+(level<=3?2.5-level*.45:0),
  playerProduction:1,
  enemyProduction:wave.prod,
  enemyHp:wave.hp*hpGrowth,
  enemyDamage:wave.dmg*damageGrowth,
  initialSpawnInterval:level<=5?1.95-(level-1)*.04:1.72,
  playerCoreHp:930+Math.min(level,250)*5,
  enemyCoreHp:(560+Math.min(level,250)*7)*wave.core*growth,
  initialEnemy:Math.min(5,wave.units+extraUnits),
  movement:1,captureTime:wave.name==='ALIVIO'||wave.name==='RESPIRO'||wave.name==='RECUPERACIÓN'?2.30:(boss?2.82:2.55),
  rewardMultiplier:wave.reward,difficulty:growth*wave.hp};
}
function factoryType`;
    corrected = replaceOne(
      corrected,
      /function levelConfig\(level\)\{[\s\S]*?\}\nfunction factoryType/,
      levelConfig,
      'dificultad ondulada'
    );

    const unitStats = `function unitStats(type,team,level){
 const b=UNITS[type],cfg=levelConfig(level),block=Math.floor((Math.max(1,level)-1)/10);
 const enemyLevel=level<=5?1:Math.min(10,1+Math.floor(Math.min(level,40)/9)+Math.floor(Math.max(0,level-40)/40));
 const ownLevel=team===TEAM.PLAYER?Math.max(1,save.unitLevels[type]||1):enemyLevel,up=1+(ownLevel-1)*.12;
 return{level:ownLevel,hp:b.hp*up*(team===TEAM.ENEMY?cfg.enemyHp:1),damage:b.damage*up*(team===TEAM.ENEMY?cfg.enemyDamage:1),speed:b.speed*(1+Math.min(.10,(ownLevel-1)*.015)),fireRate:b.fireRate,range:b.range,projectileSpeed:b.projectileSpeed};
}`;
    corrected = replaceOne(
      corrected,
      /function unitStats\(type,team,level\)\{[\s\S]*?\}\nfunction resizeCanvas/,
      `${unitStats}\nfunction resizeCanvas`,
      'crecimiento enemigo lento'
    );

    const production = `function factoryNetworkMultiplier(n){
 if(!game||n.team===TEAM.NEUTRAL)return 1;
 const owned=game.nodes.filter(x=>x.team===n.team&&x.kind==='factory'&&x.unitType===n.unitType).length;
 return Math.max(.76,1-Math.max(0,owned-1)*.06);
}
function productionInterval(n){
 const lv=Math.max(1,save.unitLevels[n.unitType]||1),upgrade=n.team===TEAM.PLAYER?Math.max(.72,1-(lv-1)*.07):1;
 const rewarded=n.team===TEAM.PLAYER&&game&&game.rewardProductionBoostUntil>game.elapsed ? .75 : 1;
 return UNITS[n.unitType].production*upgrade*factoryNetworkMultiplier(n)*rewarded*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);
}
function nextSpawn`;
    corrected = replaceOne(
      corrected,
      /function factoryNetworkMultiplier\(n\)\{[\s\S]*?\}\nfunction productionInterval\(n\)\{[\s\S]*?\}\nfunction nextSpawn/,
      production,
      'producción y ayuda recompensada'
    );

    const labels = `function updateLabels(){if(!game)return;ui.worldLabel.textContent=displayZone(game.level)+' · Nivel '+game.level;ui.levelProgressText.textContent='Nivel '+game.level+' · '+game.title;ui.prevLevelBtn.disabled=game.level<=1;ui.nextUnlockedBtn.disabled=game.level>=save.unlockedLevel;}`;
    corrected = replaceOne(
      corrected,
      /function updateLabels\(\)\{[\s\S]*?\}\nfunction refreshHud/,
      `${labels}\nfunction refreshHud`,
      'etiquetas numéricas'
    );

    const startScreen = `function refreshStartScreen(){
 if(!ui.levelPath)return;
 const current=Math.max(1,save.currentLevel),meta=levelConfig(current),types=unlockedTypes(current).map(t=>UNITS[t].name).join(' · ');
 ui.startProgress.textContent='Nivel máximo '+save.unlockedLevel;
 ui.startCoins.textContent=save.coins+' monedas';
 ui.selectedLevelInfo.textContent='Nivel '+current+' · '+meta.title+' · '+displayZone(current)+' · '+meta.mission;
 ui.startBtn.textContent='JUGAR NIVEL '+current;
 ui.levelPath.innerHTML='';
 let levels=[];
 if(save.unlockedLevel<=60){
  for(let l=1;l<=save.unlockedLevel+1;l++)levels.push(l);
 }else{
  for(let l=1;l<=6;l++)levels.push(l);
  const from=Math.max(7,current-12),to=Math.min(save.unlockedLevel+1,current+12);
  if(from>7)levels.push('gap');
  for(let l=from;l<=to;l++)levels.push(l);
  const tailFrom=Math.max(to+1,save.unlockedLevel-4);
  if(tailFrom>to+1)levels.push('gap');
  for(let l=tailFrom;l<=save.unlockedLevel+1;l++)levels.push(l);
 }
 const seen=new Set();
 for(const entry of levels){
  if(entry==='gap'){
   const gap=document.createElement('div');gap.className='level-gap';gap.textContent='···';ui.levelPath.appendChild(gap);continue;
  }
  const level=entry;if(seen.has(level))continue;seen.add(level);
  const step=document.createElement('div');step.className='level-step';
  const b=document.createElement('button');b.type='button';b.className='level-node';
  const unlocked=level<=save.unlockedLevel,completed=Number(save.stars[String(level)]||0)>0,boss=level%10===0;
  if(unlocked)b.classList.add('unlocked');if(completed)b.classList.add('completed');if(level===current)b.classList.add('selected');if(!unlocked)b.classList.add('locked');if(boss)b.classList.add('world-start');
  b.disabled=!unlocked;b.innerHTML=unlocked?String(level):'<span class="level-lock">🔒</span>';
  if(unlocked)b.addEventListener('click',()=>{save.currentLevel=level;localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshStartScreen();});
  const st=document.createElement('span');st.className='level-stars';const c=Number(save.stars[String(level)]||0);st.textContent=c?'★'.repeat(c):(boss?'◆':'·');
  step.append(b,st);ui.levelPath.appendChild(step);
 }
 requestAnimationFrame(()=>ui.levelPath.querySelector('.level-node.selected')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}
function traceRoad`;
    corrected = replaceOne(
      corrected,
      /function refreshStartScreen\(\)\{[\s\S]*?\}\nfunction traceRoad/,
      startScreen,
      'camino de niveles ilimitados'
    );

    corrected = corrected.replace(
      "const reward=Math.round((90+game.level*18)*(game.config.rewardMultiplier||1)*(first?1:.35)*(1+(stars-1)*.30));",
      "const reward=Math.round((95+Math.min(520,game.level*8)+Math.floor(game.level/25)*25)*(game.config.rewardMultiplier||1)*(first?1:.35)*(1+(stars-1)*.30));"
    );
    corrected = corrected.replace(
      "save.coins+=reward;",
      "save.coins+=reward;game.lastReward=reward;game.rewardDoubled=false;save.lossStreak=0;"
    );
    corrected = corrected.replace(
      "function loseLevel(){if(ended)return;ended=true;window.dispatchEvent(new CustomEvent('rbtwar:defeat'));",
      "function loseLevel(){if(ended)return;ended=true;save.lossStreak=(save.lossStreak||0)+1;persist();window.dispatchEvent(new CustomEvent('rbtwar:defeat'));"
    );

    const rewardBridge = `function rewardContinueAfterDefeat(){
 if(!game||!ended||ui.resultEyebrow.textContent!=='DERROTA')return false;
 const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER);if(!hq)return false;
 hq.hp=Math.max(1,hq.maxHp*.55);ended=false;paused=false;game.projectiles=[];
 hq.spawnQueue=Math.max(hq.spawnQueue||0,2);hq.spawnCooldown=.25;
 ui.resultModal.classList.add('hidden');showToast('Ayuda activada: CORE 55% + 2 robots.');
 window.dispatchEvent(new CustomEvent('rbtwar:reward-used',{detail:{kind:'continue'}}));return true;
}
function rewardExtraRobots(){
 if(!game||inMenu||ended)return false;const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER);if(!hq)return false;
 hq.spawnQueue=(hq.spawnQueue||0)+2;hq.spawnCooldown=Math.min(hq.spawnCooldown||.25,.25);showToast('Ayuda activada: +2 robots.');
 window.dispatchEvent(new CustomEvent('rbtwar:reward-used',{detail:{kind:'robots'}}));return true;
}
function rewardProductionBoost(seconds=60){
 if(!game||inMenu||ended)return false;game.rewardProductionBoostUntil=Math.max(game.rewardProductionBoostUntil||0,game.elapsed+seconds);showToast('Producción +25% durante 60 s.');
 window.dispatchEvent(new CustomEvent('rbtwar:reward-used',{detail:{kind:'production'}}));return true;
}
function rewardDoubleCoins(){
 if(!game||!ended||ui.resultEyebrow.textContent!=='VICTORIA'||game.rewardDoubled||!game.lastReward)return false;
 save.coins+=game.lastReward;game.rewardDoubled=true;persist();ui.rewardCoins.textContent='+'+(game.lastReward*2)+' 🪙';showToast('Recompensa duplicada.');
 window.dispatchEvent(new CustomEvent('rbtwar:reward-used',{detail:{kind:'doubleCoins'}}));return true;
}
window.RBTwarRewards={
 getAvailability:()=>({lossStreak:Number(save.lossStreak||0),continue:!!(game&&ended&&ui.resultEyebrow.textContent==='DERROTA'),extraRobots:!!(game&&!inMenu&&!ended),productionBoost:!!(game&&!inMenu&&!ended),doubleCoins:!!(game&&ended&&ui.resultEyebrow.textContent==='VICTORIA'&&!game.rewardDoubled)}),
 continueAfterDefeat:rewardContinueAfterDefeat,extraRobots:rewardExtraRobots,productionBoost:rewardProductionBoost,doubleCoins:rewardDoubleCoins
};
function showToast`;
    corrected = replaceOne(corrected, /function showToast/, rewardBridge, 'puente de anuncios recompensados');

    return corrected;
  };
})();