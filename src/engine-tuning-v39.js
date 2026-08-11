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

    const difficulty = "function difficultyTier(level){const slot=((level-1)%10)+1;if(slot===10)return'bastion';if(slot===3||slot===6||slot===7||slot===9)return'hard';if(slot===4||slot===8)return'recovery';if(slot===1)return'easy';return'medium';}function levelConfig(level){const rank=Math.min(Math.max(1,level),60),p=Math.min(1,(rank-1)/59),tier=difficultyTier(level),wave={easy:{ai:1.22,prod:1.14,hp:.90,dmg:.88,enemy:0,core:.92},medium:{ai:.96,prod:.96,hp:1.03,dmg:1.03,enemy:0,core:1},hard:{ai:.80,prod:.84,hp:1.13,dmg:1.11,enemy:1,core:1.08},recovery:{ai:1.10,prod:1.08,hp:.97,dmg:.96,enemy:0,core:.96},bastion:{ai:.70,prod:.76,hp:1.22,dmg:1.17,enemy:2,core:1.16}}[tier];let baseAi,baseProd,baseHp,baseDamage,baseEnemy;if(level===1){baseAi=11.5;baseProd=1.48;baseHp=.72;baseDamage=.70;baseEnemy=1;}else if(level===2){baseAi=9.2;baseProd=1.30;baseHp=.84;baseDamage=.82;baseEnemy=1;}else if(level===3){baseAi=7.4;baseProd=1.16;baseHp=.96;baseDamage=.93;baseEnemy=2;}else{baseAi=6.4-Math.min(3.0,(rank-4)*.11);baseProd=1.10-Math.min(.24,(rank-4)*.009);baseHp=1+Math.min(.46,(rank-4)*.021);baseDamage=1+Math.min(.42,(rank-4)*.019);baseEnemy=Math.min(5,2+Math.floor(rank/8));}return{title:levelTitle(level),biome:biomeKey(level),aiDelay:baseAi*wave.ai,playerProduction:1,enemyProduction:baseProd*wave.prod,enemyHp:baseHp*wave.hp,enemyDamage:baseDamage*wave.dmg,initialSpawnInterval:level<=3?1.85-(level-1)*.06:1.66,playerCoreHp:920+rank*20,enemyCoreHp:Math.round((level===1?540+rank*30:760+rank*29)*wave.core),initialEnemy:clamp(baseEnemy+wave.enemy,1,5),difficulty:p,tier};}";
    code = replaceBetween(code, 'function difficultyTier(level){', 'function factoryType(level,index,team){', difficulty, 'balance de dificultad');

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
        console.info('RBTwar ajuste v39 listo · unidades tempranas + dificultad + fluidez');
      } catch (error) {
        node.textContent = originalSource;
        console.error('RBTwar ajuste v39 no pudo aplicarse:', error);
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
