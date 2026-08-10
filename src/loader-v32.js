(() => {
  'use strict';

  const SOURCE_URL = 'src/loader-v26.js?v=32';
  const API_MARKER = 'window.RBTwarAPI={';
  const VALIDATION_MARKER = '      try {\n        new Function(code);';

  function fail(error) {
    console.error('RBTwar v32 no pudo preparar el balance:', error);
    const toast = document.getElementById('toast');
    const btn = document.getElementById('startBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ERROR'; }
    if (toast) { toast.textContent = 'Error al preparar el balance del juego.'; toast.classList.add('show'); }
  }

  console.info('RBTwar bootstrap v32');

  fetch(SOURCE_URL, { cache:'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Bootstrap HTTP ${r.status}`);
      return r.text();
    })
    .then(loader => {
      if (!loader.includes(API_MARKER)) throw new Error('Punto de extensión API no encontrado.');
      if (!loader.includes(VALIDATION_MARKER)) throw new Error('Punto de balance no encontrado.');

      const balancePatch = `
      // Balance v32: curva ondulada de dificultad, recompensas y economía.
      code = replaceRequired(
        code,
        "function levelConfig(level){const p=(level-1)/29,early=level<=5;return{title:TITLES[level-1],biome:biomeKey(level),aiDelay:early?13-(level-1)*1.35:6.7-Math.min(3.6,(level-6)*.12),playerProduction:1,enemyProduction:early?1.65-(level-1)*.11:1.14-Math.min(.29,(level-6)*.012),enemyHp:early ? .60+(level-1)*.085 : 1+Math.min(.55,(level-6)*.026),enemyDamage:early ? .56+(level-1)*.085 : 1+Math.min(.48,(level-6)*.022),initialSpawnInterval:early?1.9-(level-1)*.04:1.68,playerCoreHp:900+level*18,enemyCoreHp:early?510+level*35:760+level*30,initialEnemy:early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(level/7)),difficulty:p};}",
        "function difficultyTier(level){const slot=((level-1)%10)+1;if(slot===10)return'bastion';if(slot===4||slot===7||slot===9)return'hard';if(slot===5||slot===8)return'recovery';if(slot===1)return'easy';return'medium';}function levelConfig(level){const p=(level-1)/29,early=level<=3,tier=difficultyTier(level),wave={easy:{ai:1.20,prod:1.12,hp:.92,dmg:.90,enemy:0,core:.94},medium:{ai:1,prod:1,hp:1,dmg:1,enemy:0,core:1},hard:{ai:.86,prod:.90,hp:1.10,dmg:1.08,enemy:1,core:1.05},recovery:{ai:1.18,prod:1.14,hp:.94,dmg:.92,enemy:-1,core:.94},bastion:{ai:.78,prod:.84,hp:1.16,dmg:1.12,enemy:1,core:1.12}}[tier],baseAi=early?13-(level-1)*1.6:6.6-Math.min(3.2,(level-4)*.115),baseProd=early?1.58-(level-1)*.10:1.12-Math.min(.25,(level-4)*.010),baseHp=early ? .64+(level-1)*.10 : 1+Math.min(.46,(level-4)*.021),baseDamage=early ? .60+(level-1)*.09 : 1+Math.min(.42,(level-4)*.019),baseEnemy=early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(level/7));return{title:TITLES[level-1],biome:biomeKey(level),aiDelay:baseAi*wave.ai,playerProduction:1,enemyProduction:baseProd*wave.prod,enemyHp:baseHp*wave.hp,enemyDamage:baseDamage*wave.dmg,initialSpawnInterval:early?1.90-(level-1)*.05:1.68,playerCoreHp:920+level*20,enemyCoreHp:Math.round((early?520+level*32:760+level*29)*wave.core),initialEnemy:clamp(baseEnemy+wave.enemy,1,5),difficulty:p,tier};}",
        'curva de dificultad v32'
      );
      code = replaceRequired(
        code,
        "const reward=Math.round((90+game.level*18)*(first?1:.35)*(1+(stars-1)*.30));",
        "const tier=game.config.tier||'medium',tierBonus=tier==='bastion'?1.25:tier==='hard'?1.15:tier==='recovery' ? .95 : 1,reward=Math.round((58+game.level*12)*tierBonus*(first?1:.28)*(1+(stars-1)*.20));",
        'economía de recompensas v32'
      );
`;

      loader = loader.replace(VALIDATION_MARKER, balancePatch + VALIDATION_MARKER);

      loader = loader.replace(
        " const base={basic:50,fast:65,heavy:80,sniper:90}[type]||50;\n return Math.round(base*Math.pow(1.72,Math.max(0,level-1)));",
        " const base={basic:65,fast:80,heavy:100,sniper:120}[type]||65;\n return Math.round(base*Math.pow(1.58,Math.max(0,level-1)));"
      );

      loader = loader.replace(
        "return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:TITLES[level-1]||('Nivel '+level),biome:biomeKey(level)}};",
        "return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:TITLES[level-1]||('Nivel '+level),biome:biomeKey(level),difficulty:typeof difficultyTier==='function'?difficultyTier(level):'medium'}};"
      );

      const assistApi = `
function rbtwarAssistState(){
 if(!game)return{active:false};
 const hq=game.nodes.find(n=>n.kind==='hq'&&n.team===TEAM.PLAYER);
 const squads=game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.count>0);
 return{active:!inMenu&&!ended,level:game.level,elapsed:Math.round(game.elapsed||0),tier:game.config?.tier||'medium',coreHp:hq?Math.round(hq.hp):0,coreMaxHp:hq?Math.round(hq.maxHp):0,corePct:hq?Math.round(100*clamp(hq.hp/Math.max(1,hq.maxHp),0,1)):0,squads:squads.length,robots:squads.reduce((n,s)=>n+s.count,0)};
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
      loader = loader.replace(
        " restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;}\n};",
        " restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;},\n getAssistState:rbtwarAssistState,\n applyReward:rbtwarApplyReward\n};"
      );

      if (!loader.includes('applyReward:rbtwarApplyReward')) throw new Error('No se pudo extender RBTwarAPI.');
      if (!loader.includes('curva de dificultad v32')) throw new Error('No se pudo insertar el balance v32.');

      try { new Function(loader); }
      catch (e) { throw new Error(`Sintaxis bootstrap v32: ${e.message}`); }

      const script = document.createElement('script');
      script.dataset.rbtwarBootstrap = 'v32';
      script.textContent = loader;
      document.head.appendChild(script);
    })
    .catch(fail);
})();
