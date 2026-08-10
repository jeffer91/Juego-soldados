(() => {
  'use strict';

  const VERSION = '21';
  const SOURCE_URL = `src/loader-v14.js?v=${VERSION}`;

  function fail(error) {
    console.error('RBTwar v21 no pudo preparar el motor:', error);
    const toast = document.getElementById('toast');
    const btn = document.getElementById('startBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ERROR'; }
    if (toast) {
      toast.textContent = 'Error al iniciar RBTwar. Revisa la consola.';
      toast.classList.add('show');
    }
  }

  console.info('RBTwar bootstrap v21');

  fetch(SOURCE_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Bootstrap base HTTP ${r.status}`);
      return r.text();
    })
    .then(source => {
      let loader = source.replace(/\r\n?/g, '\n');

      loader = loader
        .replace("const VERSION = '20';", "const VERSION = '21';")
        .replaceAll('RBTwar v20', 'RBTwar v21')
        .replaceAll('bootstrap v20', 'bootstrap v21')
        .replaceAll('motor v20 listo', 'motor v21 listo')
        .replaceAll('v20-controls', 'v21-controls')
        .replace("rbtwar-save-v20',MAX_LEVEL", "rbtwar-save-v21',MAX_LEVEL")
        .replace("'rbtwar-save-v19','rbtwar-save-v18'", "'rbtwar-save-v20','rbtwar-save-v19','rbtwar-save-v18'");

      const marker = '      const selectionFunctions = `function selectedSquads()';
      if (!loader.includes(marker)) throw new Error('No se encontró el punto estable para controles v21');

      const additions = [
        `      code = replaceRequired(code,"function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],.84*s,u.type,u.walkPhase,u.state==='exiting');}","function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],1.05*s,u.type,u.walkPhase,u.state==='exiting');}",'robots individuales del mismo tamaño');`,
        `      code = replaceRequired(code,"function autoForm(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}","function absorbWaitingIntoSquads(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY]){let waiting=waitingIndividuals(n.index,t,n.unitType);if(!waiting.length)continue;const squads=game.squads.filter(s=>s.team===t&&s.type===n.unitType&&s.hp>0&&s.count<5&&!s.combatTargetId&&dist(s,n)<=120*scale()).sort((a,b)=>dist(a,n)-dist(b,n));for(const squad of squads){if(!waiting.length)break;const take=waiting.splice(0,Math.min(5-squad.count,waiting.length));if(!take.length)continue;const ids=new Set(take.map(u=>u.id));game.individuals=game.individuals.filter(u=>!ids.has(u.id));squad.count+=take.length;squad.hp=Math.min(squad.unitHp*squad.count,squad.hp+squad.unitHp*take.length);squad.maxHp=squad.unitHp*squad.count;spawnBurst(squad.x,squad.y,TEAM_COLOR[t],Math.min(6,2+take.length));}repositionWaiting();}}\nfunction autoForm(){absorbWaitingIntoSquads();for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}",'relleno automático de pelotones');`
      ].join('\n');

      loader = loader.replace(marker, additions + '\n\n' + marker);

      try { new Function(loader); }
      catch (e) { throw new Error(`Sintaxis bootstrap v21: ${e.message}`); }

      const script = document.createElement('script');
      script.dataset.rbtwarBootstrap = 'v21';
      script.textContent = loader;
      document.head.appendChild(script);
    })
    .catch(fail);
})();