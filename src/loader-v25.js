(() => {
  'use strict';

  const VERSION = '25';
  const ENGINE_URL = `src/game-v7.js?v=${VERSION}`;

  function showError(error) {
    console.error('RBTwar v25 no pudo iniciar:', error);
    const toast = document.getElementById('toast');
    const btn = document.getElementById('startBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'ERROR';
    }
    if (toast) {
      toast.textContent = 'Error al iniciar el juego. Revisa la consola.';
      toast.classList.add('show');
    }
  }

  function replaceRequired(source, from, to, label) {
    if (!source.includes(from)) throw new Error(`No se encontró: ${label}`);
    return source.replace(from, to);
  }

  console.info('RBTwar bootstrap v25');

  fetch(ENGINE_URL, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Motor base HTTP ${response.status}`);
      return response.text();
    })
    .then(source => {
      let code = source.replace(/\r\n?/g, '\n');

      // Correcciones de sintaxis conocidas del motor base.
      code = replaceRequired(
        code,
        'enemyHp:early?.60+(level-1)*.085:1+Math.min(.55,(level-6)*.026)',
        'enemyHp:early ? .60+(level-1)*.085 : 1+Math.min(.55,(level-6)*.026)',
        'enemyHp'
      );
      code = replaceRequired(
        code,
        'enemyDamage:early?.56+(level-1)*.085:1+Math.min(.48,(level-6)*.022)',
        'enemyDamage:early ? .56+(level-1)*.085 : 1+Math.min(.48,(level-6)*.022)',
        'enemyDamage'
      );
      code = replaceRequired(
        code,
        "mult=targetType==='node'?.34:.46",
        "mult=targetType==='node' ? .34 : .46",
        'daño a estructuras'
      );

      // Guardado estable y migración desde versiones anteriores.
      code = code.replace(
        "const STORAGE_KEY='rbtwar-save-v7',MAX_LEVEL=30;",
        "const STORAGE_KEY='rbtwar-save-v25',MAX_LEVEL=30;"
      );
      code = code.replace(
        "for(const key of [STORAGE_KEY,'rbtwar-save-v6'",
        "for(const key of [STORAGE_KEY,'rbtwar-save-v24','rbtwar-save-v23','rbtwar-save-v22','rbtwar-save-v21','rbtwar-save-v20','rbtwar-save-v19','rbtwar-save-v18','rbtwar-save-v12','rbtwar-save-v11','rbtwar-save-v10','rbtwar-save-v9','rbtwar-save-v8','rbtwar-save-v7','rbtwar-save-v6'"
      );

      // Interfaz: botón simple y estado sincronizado.
      code = code.replace(
        'ui.startBtn.textContent=`JUGAR NIVEL ${save.currentLevel}`;',
        "ui.startBtn.textContent='JUGAR';"
      );
      code = replaceRequired(
        code,
        "function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshHud();refreshStartScreen();}",
        "function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshHud();refreshStartScreen();queueMicrotask(()=>window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI?.getState?.()})));}",
        'persistencia'
      );

      // Mejoras seguras que no dependen de loaders encadenados.
      code = code.replace(
        "function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],.84*s,u.type,u.walkPhase,u.state==='exiting');}",
        "function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],1.05*s,u.type,u.walkPhase,u.state==='exiting');}"
      );
      code = code.replace(
        "function playerSquadAt(p,exclude=null){const radius=74*scale();",
        "function playerSquadAt(p,exclude=null){const radius=42*scale();"
      );
      code = code.replace(
        "function autoForm(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}",
        "function absorbWaitingIntoSquads(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY]){let waiting=waitingIndividuals(n.index,t,n.unitType);if(!waiting.length)continue;const squads=game.squads.filter(s=>s.team===t&&s.type===n.unitType&&s.hp>0&&s.count<5&&!s.combatTargetId&&dist(s,n)<=120*scale()).sort((a,b)=>dist(a,n)-dist(b,n));for(const squad of squads){if(!waiting.length)break;const take=waiting.splice(0,Math.min(5-squad.count,waiting.length));if(!take.length)continue;const ids=new Set(take.map(u=>u.id));game.individuals=game.individuals.filter(u=>!ids.has(u.id));squad.count+=take.length;squad.hp=Math.min(squad.unitHp*squad.count,squad.hp+squad.unitHp*take.length);squad.maxHp=squad.unitHp*squad.count;}repositionWaiting();}}function autoForm(){absorbWaitingIntoSquads();for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}"
      );

      // CORRECCIÓN v25: un objetivo de combate eliminado dejaba combatTargetId con un ID viejo.
      // updateMovement veía ese ID y detenía el pelotón para siempre. Ahora se limpia antes de pausar.
      code = replaceRequired(
        code,
        "function updateMovement(dt){for(const s of game.squads){s.bob+=dt*4;if(s.hp<=0||s.combatTargetId)continue;",
        "function updateMovement(dt){for(const s of game.squads){s.bob+=dt*4;if(s.combatTargetId&&!getSquad(s.combatTargetId))s.combatTargetId=null;if(s.hp<=0||s.combatTargetId)continue;",
        'reanudar movimiento después del combate'
      );

      // También limpiar el objetivo si murió, desapareció o salió del rango.
      code = replaceRequired(
        code,
        "let t=s.combatTargetId?getSquad(s.combatTargetId):null;if(t&&(t.hp<=0||effectiveDistance(s,t)>s.range*1.22)){s.combatTargetId=null;t=null;}",
        "let t=s.combatTargetId?getSquad(s.combatTargetId):null;if(s.combatTargetId&&(!t||t.hp<=0||effectiveDistance(s,t)>s.range*1.22)){s.combatTargetId=null;t=null;}",
        'limpieza de objetivo de combate'
      );

      // API única para menú y mejoras.
      const apiBlock = `
function rbtwarUpgradeCost(type,level){
 const base={basic:50,fast:65,heavy:80,sniper:90}[type]||50;
 return Math.round(base*Math.pow(1.72,Math.max(0,level-1)));
}
function rbtwarCatalog(){
 return UNIT_ORDER.map(type=>{
  const u=UNITS[type],level=Math.max(1,Number(save.unitLevels[type]||1));
  return{type,name:u.name,short:u.short,unlock:u.unlock,unlocked:save.unlockedLevel>=u.unlock,level,maxLevel:5,cost:level>=5?0:rbtwarUpgradeCost(type,level),hp:u.hp,damage:u.damage,range:u.range,speed:u.speed,production:u.production};
 });
}
function rbtwarState(){
 const level=Math.max(1,Number(save.currentLevel||1));
 return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:TITLES[level-1]||('Nivel '+level),biome:biomeKey(level)}};
}
function rbtwarUpgrade(type){
 if(!UNIT_ORDER.includes(type))return{ok:false,reason:'type'};
 const u=UNITS[type],level=Math.max(1,Number(save.unitLevels[type]||1));
 if(save.unlockedLevel<u.unlock)return{ok:false,reason:'locked',unlock:u.unlock};
 if(level>=5)return{ok:false,reason:'max',level};
 const cost=rbtwarUpgradeCost(type,level);
 if(save.coins<cost)return{ok:false,reason:'coins',cost};
 save.coins-=cost;save.unitLevels[type]=level+1;persist();
 return{ok:true,level:level+1,cost};
}
window.RBTwarAPI={
 getState:rbtwarState,
 getCatalog:rbtwarCatalog,
 upgradeUnit:rbtwarUpgrade,
 startLevel:(level)=>{startLevel(clamp(Number(level||save.currentLevel)||1,1,save.unlockedLevel));return true;},
 showHome:()=>{showStart();return true;},
 restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;}
};
`;

      code = replaceRequired(
        code,
        "canvas.addEventListener('pointerdown',onDown);",
        apiBlock + "\ncanvas.addEventListener('pointerdown',onDown);",
        'punto de API'
      );

      code = replaceRequired(
        code,
        "game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);",
        "game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);queueMicrotask(()=>{window.dispatchEvent(new CustomEvent('rbtwar:ready',{detail:window.RBTwarAPI.getState()}));window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI.getState()}));console.info('RBTwar motor v25 listo');});",
        'inicio final'
      );

      try {
        new Function(code);
      } catch (syntaxError) {
        throw new Error(`Sintaxis del motor consolidado: ${syntaxError.message}`);
      }

      const script = document.createElement('script');
      script.dataset.rbtwarEngine = 'v25-stable';
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(showError);
})();
