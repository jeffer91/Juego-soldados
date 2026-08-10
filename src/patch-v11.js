(() => {
  'use strict';

  window.RBTwarV11Patch = (corrected, replaceOne) => {
    corrected = corrected
      .replace("const STORAGE_KEY='rbtwar-save-v9',MAX_LEVEL=30;", "const STORAGE_KEY='rbtwar-save-v11',MAX_LEVEL=Number.MAX_SAFE_INTEGER,MAX_CAMPAIGN=30;")
      .replace("for(const key of [STORAGE_KEY,'rbtwar-save-v8'", "for(const key of [STORAGE_KEY,'rbtwar-save-v10','rbtwar-save-v9','rbtwar-save-v8'");

    const worldHelpers = `function biomeKey(level){
 const order=['desert','canyon','forest','snow','city','elite'];
 if(level<=MAX_CAMPAIGN)return order[Math.min(5,Math.floor((level-1)/5))];
 return order[Math.floor((level-MAX_CAMPAIGN-1)/5)%order.length];
}
function worldIndex(level){return level<=MAX_CAMPAIGN?Math.min(5,Math.floor((level-1)/5)):5;}
function displayTitle(level){return level<=MAX_CAMPAIGN?TITLES[level-1]:\`Frente \${level-MAX_CAMPAIGN}\`;}
function displayZone(level){return level<=MAX_CAMPAIGN?WORLD_NAMES[worldIndex(level)]:'Frente Infinito';}`;
    corrected = replaceOne(
      corrected,
      /function biomeKey\(level\)\{[\s\S]*?\}\nfunction worldIndex\(level\)\{[\s\S]*?\}/,
      worldHelpers,
      'mundo infinito'
    );

    const levelConfig = `function levelConfig(level){
 const campaign=level<=MAX_CAMPAIGN,cycleLevel=campaign?level:((level-MAX_CAMPAIGN-1)%MAX_CAMPAIGN)+1;
 const idx=(cycleLevel-1)%5,world=Math.floor((cycleLevel-1)/5),early=level<=5,boss=idx===4,endlessTier=campaign?0:1+Math.floor((level-MAX_CAMPAIGN-1)/5);
 const phase=['EXPANSIÓN','CRUCE TÁCTICO','CONTROL CENTRAL','PRESIÓN','BASTIÓN'][idx];
 const mission=campaign?phase:\`FRENTE \${level-MAX_CAMPAIGN} · \${phase}\`;
 const style=campaign?(level<=3?'cautious':level<=10?'balanced':level<=20?'aggressive':'elite'):'elite';
 const worldMove=[1,.98,.93,1.04,1.02,1][world]||1;
 const p=campaign?(level-1)/29:1+endlessTier*.05;
 return{title:displayTitle(level),biome:biomeKey(level),mission,style,boss,endless:!campaign,endlessTier,
  aiDelay:campaign?(early?13-(level-1)*1.35:6.4-Math.min(3.4,(level-6)*.11)):Math.max(1.25,2.8-endlessTier*.055),
  playerProduction:world===4?.94:1,
  enemyProduction:campaign?(early?1.72-(level-1)*.12:Math.max(.79,1.14-(level-6)*.011)):Math.max(.62,.82-endlessTier*.012),
  enemyHp:campaign?(early?.58+(level-1)*.085:1+Math.min(.50,(level-6)*.024)+(boss?.08:0)):(1.45+Math.min(1.35,endlessTier*.065)+(boss?.10:0)),
  enemyDamage:campaign?(early?.54+(level-1)*.08:1+Math.min(.44,(level-6)*.020)+(boss?.06:0)):(1.35+Math.min(1.15,endlessTier*.052)+(boss?.08:0)),
  initialSpawnInterval:campaign?(early?1.95-(level-1)*.045:1.70):Math.max(1.25,1.62-endlessTier*.008),
  playerCoreHp:920+Math.min(level,MAX_CAMPAIGN)*18+endlessTier*18,
  enemyCoreHp:campaign?((early?500+level*32:735+level*28)*(boss?1.20:1)):((1500+endlessTier*88)*(boss?1.24:1)),
  initialEnemy:campaign?(early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(level/8)+(boss?1:0))):Math.min(5,3+Math.floor(endlessTier/4)),
  movement:worldMove,captureTime:campaign?(early?2.35:2.55+(boss?.25:0)):(2.72+Math.min(.55,endlessTier*.025)),
  rewardMultiplier:(boss?1.30:1)*(campaign?1:(1.20+Math.min(1.4,endlessTier*.055))),difficulty:p};
}
function factoryType`;
    corrected = replaceOne(
      corrected,
      /function levelConfig\(level\)\{[\s\S]*?\}\nfunction factoryType/,
      levelConfig,
      'dificultad infinita'
    );

    const unitStats = `function unitStats(type,team,level){
 const b=UNITS[type],cfg=levelConfig(level),enemyBase=Math.min(level,MAX_CAMPAIGN),enemyExtra=Math.max(0,level-MAX_CAMPAIGN);
 const enemyLevel=level<=5?1:Math.min(10,1+Math.floor((enemyBase-4)/5)+Math.floor(enemyExtra/20));
 const ownLevel=team===TEAM.PLAYER?Math.max(1,save.unitLevels[type]||1):enemyLevel,up=1+(ownLevel-1)*.12;
 return{level:ownLevel,hp:b.hp*up*(team===TEAM.ENEMY?cfg.enemyHp:1),damage:b.damage*up*(team===TEAM.ENEMY?cfg.enemyDamage:1),speed:b.speed*cfg.movement*(1+Math.min(.10,(ownLevel-1)*.015)),fireRate:b.fireRate,range:b.range,projectileSpeed:b.projectileSpeed};
}`;
    corrected = replaceOne(
      corrected,
      /function unitStats\(type,team,level\)\{[\s\S]*?\}\nfunction resizeCanvas/,
      `${unitStats}\nfunction resizeCanvas`,
      'niveles de unidades infinitos'
    );

    const production = `function factoryNetworkMultiplier(n){
 if(!game||n.team===TEAM.NEUTRAL)return 1;
 const owned=game.nodes.filter(x=>x.team===n.team&&x.kind==='factory'&&x.unitType===n.unitType).length;
 return Math.max(.76,1-Math.max(0,owned-1)*.06);
}
function productionInterval(n){
 const lv=Math.max(1,save.unitLevels[n.unitType]||1),upgrade=n.team===TEAM.PLAYER?Math.max(.72,1-(lv-1)*.07):1;
 return UNITS[n.unitType].production*upgrade*factoryNetworkMultiplier(n)*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);
}
function nextSpawn`;
    corrected = replaceOne(
      corrected,
      /function productionInterval\(n\)\{[\s\S]*?\}\nfunction nextSpawn/,
      production,
      'red de fábricas'
    );

    const combatRules = `function counterMultiplier(attacker,defender){
 if(attacker==='fast'&&defender==='sniper')return 1.38;
 if(attacker==='heavy'&&defender==='fast')return 1.34;
 if(attacker==='sniper'&&defender==='heavy')return 1.42;
 if(attacker==='sniper'&&defender==='fast')return .76;
 if(attacker==='fast'&&defender==='heavy')return .78;
 if(attacker==='heavy'&&defender==='sniper')return .84;
 return 1;
}
function preferredCounter(type){return type==='sniper'?'fast':type==='fast'?'heavy':type==='heavy'?'sniper':'basic';}
function capturePower(type){return type==='basic'?1.35:type==='fast'?1.08:type==='heavy'?.82:.72;}
function structureMultiplier(type){return type==='basic'?1.15:type==='heavy'?1.08:type==='sniper'?.86:1;}
function armorMultiplier(projectile,target){return target?.type==='heavy'&&projectile.unitType!=='sniper'?.85:1;}
function dominantType(team){
 const score={basic:0,fast:0,heavy:0,sniper:0};
 for(const s of game.squads)if(s.team===team&&s.hp>0)score[s.type]=(score[s.type]||0)+s.count;
 return Object.entries(score).sort((a,b)=>b[1]-a[1])[0]?.[0]||'basic';
}
function nearestEnemy(s){
 let target=null,best=Infinity;
 const allies=game.squads.filter(a=>a.team===s.team&&a.hp>0&&dist(a,s)<=190*scale());
 const focused=new Set(allies.map(a=>a.combatTargetId).filter(Boolean)),allyIds=new Set(allies.map(a=>a.id));
 for(const o of game.squads){
  if(o.team===s.team||o.hp<=0)continue;
  const d=effectiveDistance(s,o);if(d>s.range)continue;
  let score=d-(counterMultiplier(s.type,o.type)-1)*74*scale();
  if(focused.has(o.id))score-=42*scale();
  if(o.combatTargetId&&allyIds.has(o.combatTargetId))score-=28*scale();
  if(score<best){best=score;target=o;}
 }
 return target;
}`;
    corrected = replaceOne(
      corrected,
      /function nearestEnemy\(s\)\{[\s\S]*?\}\nfunction nodeUnder/,
      `${combatRules}\nfunction nodeUnder`,
      'ventajas entre clases'
    );

    const volley = `function fireVolley(shooter,target,targetType){
 const shots=Math.min(shooter.type==='sniper'?1:shooter.type==='heavy'?2:3,shooter.count),baseMult=targetType==='node'?.34:.46;
 const matchup=targetType==='squad'?counterMultiplier(shooter.type,target.type):structureMultiplier(shooter.type),total=shooter.damage*shooter.count*baseMult*matchup,spread=formation(shots,9*scale());
 for(let i=0;i<shots;i++){
  const[ox,oy]=spread[i];
  game.projectiles.push({id:game.projectileIdCounter++,team:shooter.team,unitType:shooter.type,x:shooter.x+ox,y:shooter.y+oy-3*scale(),prevX:shooter.x+ox,prevY:shooter.y+oy-3*scale(),targetType,targetId:target.id,speed:shooter.projectileSpeed,damage:total/shots,life:2.2,maxLife:2.2});
 }
 spawnMuzzle(shooter.x,shooter.y,TEAM_COLOR[shooter.team],shooter.type);
 window.dispatchEvent(new CustomEvent('rbtwar:shot',{detail:{team:shooter.team,type:shooter.type}}));
}`;
    corrected = replaceOne(
      corrected,
      /function fireVolley\(shooter,target,targetType\)\{[\s\S]*?\}\nfunction updateProjectiles/,
      `${volley}\nfunction updateProjectiles`,
      'daño por enfrentamiento'
    );

    const hit = `function applyHit(p,t){
 const damage=p.targetType==='squad'?p.damage*armorMultiplier(p,t):p.damage;
 t.hp-=damage;
 if(p.targetType==='squad'){
  syncCount(t);
  if(p.unitType==='heavy'){
   for(const other of game.squads){
    if(other.id===t.id||other.team===p.team||other.hp<=0||dist(other,t)>48*scale())continue;
    other.hp-=damage*.16*armorMultiplier(p,other);syncCount(other);
    if(other.hp<=0)explodeAt(other.x,other.y,TEAM_COLOR[other.team],.82);
   }
  }
  if(t.hp<=0)explodeAt(t.x,t.y,TEAM_COLOR[t.team],1.05);
 }else if(t.hp<=0){
  t.hp=0;explodeAt(t.x,t.y,TEAM_COLOR[t.team],2.25);
  if(p.team===TEAM.PLAYER)winLevel();else loseLevel();
 }
 spawnImpact(t.x,t.y,p.team);
}`;
    corrected = replaceOne(
      corrected,
      /function applyHit\(p,t\)\{[\s\S]*?\}\nfunction syncCount/,
      `${hit}\nfunction syncCount`,
      'blindaje y daño en área'
    );

    const capture = `function updateCapture(dt){
 const radius=50*scale(),captureTime=game.config.captureTime||2.6;
 for(const n of game.nodes){
  if(n.kind==='hq'||n.hp<=0)continue;
  const near=game.squads.filter(s=>s.hp>0&&dist(s,n)<=radius),teams=[...new Set(near.map(s=>s.team))];
  if(teams.length!==1){n.captureProgress=Math.max(0,n.captureProgress-dt*.6);if(n.captureProgress===0)n.captureTeam=null;continue;}
  const team=teams[0];
  if(team===n.team){n.captureProgress=0;n.captureTeam=null;continue;}
  const power=Math.min(2.25,near.reduce((sum,s)=>sum+capturePower(s.type)*(.45+s.count*.11),0));
  n.captureTeam=team;n.captureProgress+=dt*power;
  if(n.captureProgress>=captureTime){
   n.team=team;n.spawnQueue=0;n.spawnCooldown=game.config.initialSpawnInterval;n.productionTimer=0;n.captureProgress=0;n.captureTeam=null;
   spawnBurst(n.x,n.y,TEAM_COLOR[team],14);game.shake=Math.max(game.shake||0,.08);
   window.dispatchEvent(new CustomEvent('rbtwar:capture',{detail:{team,type:n.unitType}}));
   if(team===TEAM.PLAYER){const owned=game.nodes.filter(x=>x.team===TEAM.PLAYER&&x.kind==='factory'&&x.unitType===n.unitType).length;showToast(\`Fábrica \${UNITS[n.unitType].name} conquistada · red x\${owned}.\`);}
  }
 }
}`;
    corrected = replaceOne(
      corrected,
      /function updateCapture\(dt\)\{[\s\S]*?\}\nfunction mergePair/,
      `${capture}\nfunction mergePair`,
      'captura estratégica'
    );

    corrected = corrected.replace(
      "const neutralLeft=game.nodes.some(n=>n.team===TEAM.NEUTRAL);",
      "const neutralLeft=game.nodes.some(n=>n.team===TEAM.NEUTRAL),playerMain=dominantType(TEAM.PLAYER),wantedCounter=preferredCounter(playerMain);"
    );
    corrected = corrected.replace(
      "if(x.n.team===TEAM.NEUTRAL)v-=game.config.style==='cautious'?180:75;",
      "if(x.n.team===TEAM.NEUTRAL)v-=game.config.style==='cautious'?180:75;if(x.n.kind==='factory'&&x.n.unitType===wantedCounter)v-=game.config.style==='elite'?105:58;"
    );

    const updateLabels = `function updateLabels(){if(!game)return;ui.worldLabel.textContent=game.level<=MAX_CAMPAIGN?\`\${game.biome.name} · Nivel \${game.level}\`:\`Frente Infinito · \${game.level-MAX_CAMPAIGN}\`;ui.levelProgressText.textContent=game.level<=MAX_CAMPAIGN?\`Nivel \${game.level} · \${game.title}\`:\`∞ Frente \${game.level-MAX_CAMPAIGN} · \${game.config.mission}\`;ui.prevLevelBtn.disabled=game.level<=1;ui.nextUnlockedBtn.disabled=game.level>=save.unlockedLevel;}`;
    corrected = replaceOne(
      corrected,
      /function updateLabels\(\)\{[\s\S]*?\}\nfunction refreshHud/,
      `${updateLabels}\nfunction refreshHud`,
      'etiquetas del frente infinito'
    );

    const startScreen = `function refreshStartScreen(){
 if(!ui.levelPath)return;
 const endlessUnlocked=save.unlockedLevel>MAX_CAMPAIGN,current=save.currentLevel,meta=levelConfig(current),types=unlockedTypes(current).map(t=>UNITS[t].name).join(' · ');
 ui.startProgress.textContent=endlessUnlocked?\`Campaña completa · Frente \${save.unlockedLevel-MAX_CAMPAIGN}\`:\`\${save.unlockedLevel} de \${MAX_CAMPAIGN} niveles desbloqueados\`;
 ui.startCoins.textContent=\`\${save.coins} monedas\`;
 ui.selectedLevelInfo.textContent=current<=MAX_CAMPAIGN?\`Nivel \${current} · \${displayTitle(current)} · \${displayZone(current)} · \${meta.mission} · \${types}\`:\`∞ Frente \${current-MAX_CAMPAIGN} · \${meta.mission} · \${game?.biome?.name||BIOMES[meta.biome].name} · \${types}\`;
 ui.startBtn.textContent=current<=MAX_CAMPAIGN?\`JUGAR NIVEL \${current}\`:\`JUGAR FRENTE \${current-MAX_CAMPAIGN}\`;
 ui.levelPath.innerHTML='';
 const addStep=(level,label,unlocked,completed=false,endless=false)=>{
  const step=document.createElement('div');step.className='level-step'+(endless?' endless-step':'');
  const b=document.createElement('button');b.type='button';b.className='level-node';
  if(unlocked)b.classList.add('unlocked');if(completed)b.classList.add('completed');if(level===save.currentLevel)b.classList.add('selected');if(!unlocked)b.classList.add('locked');if(endless)b.classList.add('endless-node');
  if(level>1&&level<=MAX_CAMPAIGN&&[6,11,16,21,26].includes(level))b.classList.add('world-start');
  b.disabled=!unlocked;b.innerHTML=unlocked?label:'<span class="level-lock">🔒</span>';
  if(unlocked)b.addEventListener('click',()=>{save.currentLevel=level;localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshStartScreen();window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI?.getState?.()}));});
  const st=document.createElement('span');st.className='level-stars';const c=Number(save.stars[String(level)]||0);st.textContent=c?'★'.repeat(c):(unlocked?(endless?'∞':'·'):'');step.append(b,st);ui.levelPath.appendChild(step);
 };
 for(let level=1;level<=MAX_CAMPAIGN;level++)addStep(level,String(level),level<=save.unlockedLevel,Number(save.stars[String(level)]||0)>0,false);
 if(endlessUnlocked){
  const latest=Math.max(MAX_CAMPAIGN+1,save.unlockedLevel),chosen=current>MAX_CAMPAIGN?current:latest;
  addStep(chosen,'∞',true,Number(save.stars[String(chosen)]||0)>0,true);
 }else addStep(MAX_CAMPAIGN+1,'∞',false,false,true);
 requestAnimationFrame(()=>ui.levelPath.querySelector('.level-node.selected')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}`;
    corrected = replaceOne(
      corrected,
      /function refreshStartScreen\(\)\{[\s\S]*?\}\nfunction traceRoad/,
      `${startScreen}\nfunction traceRoad`,
      'camino infinito'
    );

    return corrected;
  };
})();