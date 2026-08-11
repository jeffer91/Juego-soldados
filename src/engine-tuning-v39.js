(() => {
  'use strict';

  const head = document.head;
  if (!head) return;
  const originalAppendChild = head.appendChild;

  const UNLOCKS = {
    fast: 2,
    heavy: 4,
    sniper: 6,
    assault: 8,
    shield: 10,
    repair: 12,
    mortar: 14,
    biker: 16,
    emp: 18,
    guard: 20,
    tank: 22,
    laser: 24,
    engineer: 26,
    hover: 28,
    runner: 30,
    commando: 32,
    demolisher: 34,
    railgun: 36,
    mechanic: 38,
    tesla: 40,
    quad: 42,
    destroyer: 44,
    colossus: 46,
    missile: 48,
    amplifier: 50,
    stealth: 52,
    jumper: 54,
    drone: 56,
    swarm: 58
  };

  function replaceBetween(source, start, end, replacement, label) {
    const a = source.indexOf(start);
    const b = a < 0 ? -1 : source.indexOf(end, a + start.length);
    if (a < 0 || b < 0) throw new Error(`No se encontró ${label}.`);
    return source.slice(0, a) + replacement + '\n' + source.slice(b);
  }

  function tuneEngine(source) {
    let code = source;
    let unlockChanges = 0;

    for (const [type, unlock] of Object.entries(UNLOCKS)) {
      const pattern = new RegExp(`(\\b${type}:\\{name:'[^']+',short:'[^']+',unlock:)\\d+`);
      if (!pattern.test(code)) throw new Error(`Unidad no encontrada: ${type}`);
      code = code.replace(pattern, (_match, prefix) => {
        unlockChanges++;
        return prefix + unlock;
      });
    }
    if (unlockChanges !== Object.keys(UNLOCKS).length) throw new Error('No se actualizó todo el calendario de unidades.');

    // La dificultad depende del nivel, no de cuánto haya mejorado el jugador.
    // Primer muro real: nivel 6. Los niveles 3-4 dejan de ser picos artificiales.
    const difficulty = "function difficultyTier(level){const slot=((level-1)%10)+1;if(slot===10)return'bastion';if(slot===6||slot===9)return'hard';if(slot===5||slot===8)return'recovery';if(slot===1)return'easy';return'medium';}function levelConfig(level){const rank=Math.min(Math.max(1,level),60),p=Math.min(1,(rank-1)/59),tier=difficultyTier(level),wave={easy:{ai:1.25,prod:1.16,hp:.90,dmg:.88,enemy:0,core:.94},medium:{ai:1.02,prod:1.02,hp:1,dmg:1,enemy:0,core:1},hard:{ai:.90,prod:.93,hp:1.06,dmg:1.05,enemy:1,core:1.06},recovery:{ai:1.12,prod:1.10,hp:.96,dmg:.95,enemy:0,core:.96},bastion:{ai:.82,prod:.88,hp:1.10,dmg:1.08,enemy:1,core:1.10}}[tier];let baseAi,baseProd,baseHp,baseDamage,baseEnemy;if(level===1){baseAi=12;baseProd=1.50;baseHp=.70;baseDamage=.68;baseEnemy=1;}else if(level===2){baseAi=10.2;baseProd=1.35;baseHp=.80;baseDamage=.78;baseEnemy=1;}else if(level===3){baseAi=9.2;baseProd=1.28;baseHp=.86;baseDamage=.84;baseEnemy=1;}else if(level===4){baseAi=8.2;baseProd=1.20;baseHp=.92;baseDamage=.90;baseEnemy=2;}else if(level===5){baseAi=7.8;baseProd=1.18;baseHp=.96;baseDamage=.94;baseEnemy=2;}else{baseAi=7.2-Math.min(2.8,(rank-6)*.10);baseProd=1.14-Math.min(.20,(rank-6)*.008);baseHp=1.02+Math.min(.40,(rank-6)*.018);baseDamage=1.01+Math.min(.36,(rank-6)*.016);baseEnemy=Math.min(5,2+Math.floor(rank/9));}return{title:levelTitle(level),biome:biomeKey(level),aiDelay:baseAi*wave.ai,playerProduction:1,enemyProduction:baseProd*wave.prod,enemyHp:baseHp*wave.hp,enemyDamage:baseDamage*wave.dmg,initialSpawnInterval:level<=3?1.88-(level-1)*.05:1.68,playerCoreHp:940+rank*20,enemyCoreHp:Math.round((level===1?540+rank*28:740+rank*27)*wave.core),initialEnemy:clamp(baseEnemy+wave.enemy,1,5),difficulty:p,tier};}";
    code = replaceBetween(code, 'function difficultyTier(level){', 'function factoryType(level,index,team){', difficulty, 'balance de dificultad');

    // Las mejoras del jugador son poder permanente y más perceptible.
    // El enemigo mantiene una progresión fija por nivel y nunca escala porque el jugador mejore.
    const unitStats = "function unitStats(type,team,level){const b=UNITS[type],cfg=levelConfig(level),ownLevel=team===TEAM.PLAYER?Math.max(1,save.unitLevels[type]||1):Math.min(5,(level<=5?1:1+Math.floor((level-4)/5))),up=team===TEAM.PLAYER?1+(ownLevel-1)*.16:1+(ownLevel-1)*.10,speedUp=team===TEAM.PLAYER?1+Math.min(.12,(ownLevel-1)*.02):1+Math.min(.08,(ownLevel-1)*.012);return{level:ownLevel,hp:b.hp*up*(team===TEAM.ENEMY?cfg.enemyHp:1),damage:b.damage*up*(team===TEAM.ENEMY?cfg.enemyDamage:1),speed:b.speed*speedUp,fireRate:b.fireRate,range:b.range,projectileSpeed:b.projectileSpeed};}";
    code = replaceBetween(code, 'function unitStats(type,team,level){', 'function resizeCanvas(){', unitStats, 'impacto de mejoras');

    const resize = "function resizeCanvas(){const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height)),dpr=Math.min(devicePixelRatio||1,2),cw=Math.round(w*dpr),ch=Math.round(h*dpr),needsLayout=canvas.width!==cw||canvas.height!==ch||view.w!==w||view.h!==h||view.dpr!==dpr||!game||!game.roads||game.roads.length===0;if(!needsLayout)return;if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}view={w,h,dpr};ctx.setTransform(dpr,0,0,dpr,0,0);positionNodes();rebuildRoads();repositionWaiting();}";
    code = replaceBetween(code, 'function resizeCanvas(){', 'function scale(){', resize, 'optimización de canvas');

    new Function(code);
    return code;
  }

  head.appendChild = function patchedAppendChild(node) {
    if (node?.tagName === 'SCRIPT' && node.dataset?.rbtwarEngine === 'v26-visual' && typeof node.textContent === 'string') {
      const originalSource = node.textContent;
      try {
        node.textContent = tuneEngine(originalSource);
        console.info('RBTwar ajuste v40 listo · mejoras con impacto + muro desde nivel 6 + fluidez');
      } catch (error) {
        node.textContent = originalSource;
        console.error('RBTwar ajuste v40 no pudo aplicarse:', error);
      } finally {
        head.appendChild = originalAppendChild;
      }
    }
    return originalAppendChild.call(this, node);
  };

  setTimeout(() => {
    if (head.appendChild !== originalAppendChild) head.appendChild = originalAppendChild;
  }, 30000);
})();
