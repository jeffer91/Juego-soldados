(() => {
  'use strict';

  const SOURCE_URL = 'src/loader-v26.js?v=34';
  const API_MARKER = 'window.RBTwarAPI={';
  const VALIDATION_MARKER = '      try {\n        new Function(code);';

  function fail(error) {
    console.error('RBTwar v34 no pudo preparar la progresión:', error);
    const toast = document.getElementById('toast');
    const btn = document.getElementById('startBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ERROR'; }
    if (toast) { toast.textContent = 'Error al preparar RBTwar v34.'; toast.classList.add('show'); }
  }

  console.info('RBTwar bootstrap v34');

  fetch(SOURCE_URL, { cache:'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Bootstrap HTTP ${r.status}`);
      return r.text();
    })
    .then(loader => {
      if (!loader.includes(API_MARKER)) throw new Error('Punto de extensión API no encontrado.');
      if (!loader.includes(VALIDATION_MARKER)) throw new Error('Punto de progresión no encontrado.');

      const progressionPatch = `
      // RBTwar v34: niveles continuos, ciclos, balance y economía estables.
      code = replaceRequired(
        code,
        "const STORAGE_KEY='rbtwar-save-v26',MAX_LEVEL=30;",
        "const STORAGE_KEY='rbtwar-save-v34',MAX_LEVEL=Number.MAX_SAFE_INTEGER;",
        'guardado continuo v34'
      );
      code = code.replace(
        "for(const key of [STORAGE_KEY,'rbtwar-save-v25'",
        "for(const key of [STORAGE_KEY,'rbtwar-save-v33','rbtwar-save-v26','rbtwar-save-v25'"
      );
      code = replaceRequired(
        code,
        "function biomeKey(level){return ['desert','canyon','forest','snow','city','elite'][Math.min(5,Math.floor((level-1)/5))];}\\nfunction worldIndex(level){return Math.min(5,Math.floor((level-1)/5));}",
        "const EXTRA_TITLE_A=['Operación','Asalto','Frontera','Nexo','Bastión','Ruta','Sector','Cruce'];const EXTRA_TITLE_B=['Solar','Delta','Ónix','Nova','Vector','Titán','Aurora','Prisma'];const EXTRA_TITLE_C=['I','II','III','IV','V','VI','VII','VIII'];function levelTitle(level){if(TITLES[level-1])return TITLES[level-1];const i=Math.max(0,level-31),a=EXTRA_TITLE_A[i%EXTRA_TITLE_A.length],b=EXTRA_TITLE_B[Math.floor(i/EXTRA_TITLE_A.length)%EXTRA_TITLE_B.length],c=EXTRA_TITLE_C[Math.floor(i/(EXTRA_TITLE_A.length*EXTRA_TITLE_B.length))%EXTRA_TITLE_C.length];return a+' '+b+' '+c;}function biomeKey(level){const keys=['desert','canyon','forest','snow','city','elite'];return keys[Math.floor((Math.max(1,level)-1)/5)%keys.length];}function worldIndex(level){return Math.floor((Math.max(1,level)-1)/5)%WORLD_NAMES.length;}function worldName(level){const idx=worldIndex(level),cycle=Math.floor((Math.max(1,level)-1)/30)+1;return cycle===1?WORLD_NAMES[idx]:WORLD_NAMES[idx]+' · Ciclo '+cycle;}",
        'títulos y mundos continuos v34'
      );
      code = replaceRequired(
        code,
        "function levelConfig(level){const p=(level-1)/29,early=level<=5;return{title:TITLES[level-1],biome:biomeKey(level),aiDelay:early?13-(level-1)*1.35:6.7-Math.min(3.6,(level-6)*.12),playerProduction:1,enemyProduction:early?1.65-(level-1)*.11:1.14-Math.min(.29,(level-6)*.012),enemyHp:early ? .60+(level-1)*.085 : 1+Math.min(.55,(level-6)*.026),enemyDamage:early ? .56+(level-1)*.085 : 1+Math.min(.48,(level-6)*.022),initialSpawnInterval:early?1.9-(level-1)*.04:1.68,playerCoreHp:900+level*18,enemyCoreHp:early?510+level*35:760+level*30,initialEnemy:early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(level/7)),difficulty:p};}",
        "function difficultyTier(level){const slot=((level-1)%10)+1;if(slot===10)return'bastion';if(slot===4||slot===7||slot===9)return'hard';if(slot===5||slot===8)return'recovery';if(slot===1)return'easy';return'medium';}function levelConfig(level){const rank=Math.min(Math.max(1,level),60),p=Math.min(1,(rank-1)/59),early=level<=3,tier=difficultyTier(level),wave={easy:{ai:1.20,prod:1.12,hp:.92,dmg:.90,enemy:0,core:.94},medium:{ai:1,prod:1,hp:1,dmg:1,enemy:0,core:1},hard:{ai:.86,prod:.90,hp:1.10,dmg:1.08,enemy:1,core:1.05},recovery:{ai:1.18,prod:1.14,hp:.94,dmg:.92,enemy:-1,core:.94},bastion:{ai:.78,prod:.84,hp:1.16,dmg:1.12,enemy:1,core:1.12}}[tier],baseAi=early?13-(level-1)*1.6:6.6-Math.min(3.2,(rank-4)*.115),baseProd=early?1.58-(level-1)*.10:1.12-Math.min(.25,(rank-4)*.010),baseHp=early ? .64+(level-1)*.10 : 1+Math.min(.46,(rank-4)*.021),baseDamage=early ? .60+(level-1)*.09 : 1+Math.min(.42,(rank-4)*.019),baseEnemy=early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(rank/7));return{title:levelTitle(level),biome:biomeKey(level),aiDelay:baseAi*wave.ai,playerProduction:1,enemyProduction:baseProd*wave.prod,enemyHp:baseHp*wave.hp,enemyDamage:baseDamage*wave.dmg,initialSpawnInterval:early?1.90-(level-1)*.05:1.68,playerCoreHp:920+rank*20,enemyCoreHp:Math.round((early?520+rank*32:760+rank*29)*wave.core),initialEnemy:clamp(baseEnemy+wave.enemy,1,5),difficulty:p,tier};}",
        'curva continua v34'
      );
      code = replaceRequired(
        code,
        "const reward=Math.round((90+game.level*18)*(first?1:.35)*(1+(stars-1)*.30));",
        "const tier=game.config.tier||'medium',tierBonus=tier==='bastion'?1.25:tier==='hard'?1.15:tier==='recovery' ? .95 : 1,rewardRank=Math.min(game.level,80),reward=Math.round((58+rewardRank*12)*tierBonus*(first?1:.28)*(1+(stars-1)*.20));",
        'economía continua v34'
      );
      code = code.replace(
        "const obstacles=Array.from({length:7+Math.floor(level/8)},",
        "const obstacles=Array.from({length:7+Math.min(9,Math.floor(level/8))},"
      );
      code = code.replace(
        ":430+level*7;nodes.push({id:",
        ":430+Math.min(level,60)*7;nodes.push({id:"
      );
      code = code.replace(
        "(level<=5?1:1+Math.floor((level-4)/5))",
        "Math.min(5,(level<=5?1:1+Math.floor((level-4)/5)))"
      );
      const progressNeedle='ui.startProgress.textContent='+String.fromCharCode(96)+'\${save.unlockedLevel} de \${MAX_LEVEL} niveles desbloqueados'+String.fromCharCode(96)+';';
      code = replaceRequired(
        code,
        progressNeedle,
        "ui.startProgress.textContent='Nivel máximo '+save.unlockedLevel+' · Ciclo '+(Math.floor((save.currentLevel-1)/30)+1);",
        'contador de niveles continuo'
      );
      code = code.replace("TITLES[save.currentLevel-1]","levelTitle(save.currentLevel)");
      code = code.replace("WORLD_NAMES[wi]","worldName(save.currentLevel)");
      code = replaceRequired(
        code,
        "for(let level=1;level<=MAX_LEVEL;level++)",
        "const cycleStart=Math.floor((save.currentLevel-1)/30)*30+1,cycleEnd=cycleStart+29;for(let level=cycleStart;level<=cycleEnd;level++)",
        'ventana de 30 niveles'
      );
      code = code.replace("if(level>1&&[6,11,16,21,26].includes(level))","if(level>1&&(level-1)%5===0)");
`;

      loader = loader.replace(VALIDATION_MARKER, progressionPatch + VALIDATION_MARKER);

      const costPattern = / const base=\{basic:50,fast:65,heavy:80,sniper:90\}\[type\]\|\|50;\s*return Math\.round\(base\*Math\.pow\(1\.72,Math\.max\(0,level-1\)\)\);/;
      if (!costPattern.test(loader)) throw new Error('Bloque de precios no encontrado.');
      loader = loader.replace(costPattern, " const base={basic:65,fast:80,heavy:100,sniper:120}[type]||65;\n return Math.round(base*Math.pow(1.58,Math.max(0,level-1)));");

      const oldState = "return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:TITLES[level-1]||('Nivel '+level),biome:biomeKey(level)}};";
      const newState = "return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:typeof levelTitle==='function'?levelTitle(level):(TITLES[level-1]||('Nivel '+level)),biome:biomeKey(level),difficulty:typeof difficultyTier==='function'?difficultyTier(level):'medium',cycle:Math.floor((level-1)/30)+1}};";
      if (!loader.includes(oldState)) throw new Error('Estado API no encontrado.');
      loader = loader.replace(oldState, newState);

      const assistApi = `
function rbtwarAssistState(){
 if(!game)return{active:false};
 const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER);
 const squads=game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.count>0);
 return{active:!inMenu&&!ended,level:game.level,elapsed:Math.round(game.elapsed||0),tier:game.config?.tier||'medium',coreHp:hq?Math.round(hq.hp):0,coreMaxHp:hq?Math.round(hq.maxHp):0,corePct:hq?Math.round(100*clamp(hq.hp/Math.max(1,hq.maxHp),0,1)):0,squads:squads.length,robots:squads.reduce((n,s)=>n+s.count,0)};
}
function rbtwarCanReward(kind){
 const st=rbtwarAssistState();if(!st.active)return{ok:false,reason:'inactive'};
 if(kind==='core_repair')return{ok:st.coreMaxHp>0&&st.coreHp<st.coreMaxHp,reason:st.coreHp>=st.coreMaxHp?'core_full':''};
 if(kind==='army_power')return{ok:st.squads>0&&!game._rewardArmyPower,reason:st.squads<=0?'no_squads':game._rewardArmyPower?'already':''};
 if(kind==='reinforcements')return{ok:true};
 return{ok:false,reason:'unknown'};
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
  if(!hq)return{ok:false,reason:'no_core'};const before=hq.hp;hq.hp=Math.min(hq.maxHp,hq.hp+hq.maxHp*.30);spawnBurst(hq.x,hq.y,TEAM_COLOR.player,16);return{ok:hq.hp>before,kind,healed:Math.round(hq.hp-before),corePct:Math.round(100*hq.hp/hq.maxHp)};
 }
 if(kind==='army_power'){
  if(!squads.length)return{ok:false,reason:'no_squads'};if(game._rewardArmyPower)return{ok:false,reason:'already'};game._rewardArmyPower=true;for(const q of squads){q.damage*=1.20;q.hp=Math.min(q.maxHp,q.hp+q.maxHp*.10);spawnBurst(q.x,q.y,TEAM_COLOR.player,7);}return{ok:true,kind,squads:squads.length,damageBoost:20};
 }
 return{ok:false,reason:'unknown'};
}
`;

      loader = loader.replace(API_MARKER, assistApi + '\n' + API_MARKER);

      const apiEndPattern = / restartLevel:\(\)=>\{if\(!game\)return false;startLevel\(game\.level\);return true;\}\s*\};/;
      if (!apiEndPattern.test(loader)) throw new Error('Cierre de RBTwarAPI no encontrado.');
      loader = loader.replace(apiEndPattern, " restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;},\n selectLevel:(level)=>{const n=clamp(Math.round(Number(level)||1),1,save.unlockedLevel);save.currentLevel=n;persist();return rbtwarState();},\n getAssistState:rbtwarAssistState,\n canReward:rbtwarCanReward,\n applyReward:rbtwarApplyReward\n};");

      if (!loader.includes('applyReward:rbtwarApplyReward')) throw new Error('No se pudo extender RBTwarAPI.');
      if (!loader.includes('canReward:rbtwarCanReward')) throw new Error('No se pudo insertar la validación de recompensas.');
      if (!loader.includes('niveles continuos')) throw new Error('No se pudo insertar la progresión v34.');

      try { new Function(loader); }
      catch (e) { throw new Error(`Sintaxis bootstrap v34: ${e.message}`); }

      const script = document.createElement('script');
      script.dataset.rbtwarBootstrap = 'v34';
      script.textContent = loader;
      document.head.appendChild(script);
    })
    .catch(fail);
})();
