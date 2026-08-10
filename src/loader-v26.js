(() => {
  'use strict';

  const VERSION = '26';
  const ENGINE_URL = `src/game-v7.js?v=${VERSION}`;

  function showError(error) {
    console.error('RBTwar v26 no pudo iniciar:', error);
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

  console.info('RBTwar bootstrap v26');

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
        "const STORAGE_KEY='rbtwar-save-v26',MAX_LEVEL=30;"
      );
      code = code.replace(
        "for(const key of [STORAGE_KEY,'rbtwar-save-v6'",
        "for(const key of [STORAGE_KEY,'rbtwar-save-v25','rbtwar-save-v24','rbtwar-save-v23','rbtwar-save-v22','rbtwar-save-v21','rbtwar-save-v20','rbtwar-save-v19','rbtwar-save-v18','rbtwar-save-v12','rbtwar-save-v11','rbtwar-save-v10','rbtwar-save-v9','rbtwar-save-v8','rbtwar-save-v7','rbtwar-save-v6'"
      );

      // Interfaz y correcciones funcionales estables de v25.
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
      code = code.replace(
        "function playerSquadAt(p,exclude=null){const radius=74*scale();",
        "function playerSquadAt(p,exclude=null){const radius=42*scale();"
      );
      code = code.replace(
        "function autoForm(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}",
        "function absorbWaitingIntoSquads(){for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY]){let waiting=waitingIndividuals(n.index,t,n.unitType);if(!waiting.length)continue;const squads=game.squads.filter(s=>s.team===t&&s.type===n.unitType&&s.hp>0&&s.count<5&&!s.combatTargetId&&dist(s,n)<=120*scale()).sort((a,b)=>dist(a,n)-dist(b,n));for(const squad of squads){if(!waiting.length)break;const take=waiting.splice(0,Math.min(5-squad.count,waiting.length));if(!take.length)continue;const ids=new Set(take.map(u=>u.id));game.individuals=game.individuals.filter(u=>!ids.has(u.id));squad.count+=take.length;squad.hp=Math.min(squad.unitHp*squad.count,squad.hp+squad.unitHp*take.length);squad.maxHp=squad.unitHp*squad.count;}repositionWaiting();}}function autoForm(){absorbWaitingIntoSquads();for(const n of game.nodes)for(const t of[TEAM.PLAYER,TEAM.ENEMY])while(waitingIndividuals(n.index,t,n.unitType).length>=5)formSquad(n,t,5);}"
      );
      code = replaceRequired(
        code,
        "function updateMovement(dt){for(const s of game.squads){s.bob+=dt*4;if(s.hp<=0||s.combatTargetId)continue;",
        "function updateMovement(dt){for(const s of game.squads){s.bob+=dt*4;if(s.combatTargetId&&!getSquad(s.combatTargetId))s.combatTargetId=null;if(s.hp<=0||s.combatTargetId)continue;",
        'reanudar movimiento después del combate'
      );
      code = replaceRequired(
        code,
        "let t=s.combatTargetId?getSquad(s.combatTargetId):null;if(t&&(t.hp<=0||effectiveDistance(s,t)>s.range*1.22)){s.combatTargetId=null;t=null;}",
        "let t=s.combatTargetId?getSquad(s.combatTargetId):null;if(s.combatTargetId&&(!t||t.hp<=0||effectiveDistance(s,t)>s.range*1.22)){s.combatTargetId=null;t=null;}",
        'limpieza de objetivo de combate'
      );

      // Paleta de batalla más viva y amistosa.
      code = replaceRequired(
        code,
        "const TEAM_COLOR=Object.freeze({player:'#36b8ff',enemy:'#ff5d68',neutral:'#c7bfae'});",
        "const TEAM_COLOR=Object.freeze({player:'#2F9BFF',enemy:'#FF5A6B',neutral:'#F2B84B'});",
        'paleta de equipos'
      );
      code = replaceRequired(
        code,
        "desert:{name:'Desierto',ground:'#b99b63',ground2:'#9c7f4d',road:'#70583c',roadEdge:'#58452f',obstacle:'#5f513f'},\n canyon:{name:'Cañón',ground:'#a77d53',ground2:'#835f3e',road:'#694b35',roadEdge:'#503827',obstacle:'#614536'},\n forest:{name:'Bosque',ground:'#698856',ground2:'#537044',road:'#6e5b43',roadEdge:'#554633',obstacle:'#315537'},\n snow:{name:'Nieve',ground:'#cbdcdf',ground2:'#a9c1c6',road:'#75898e',roadEdge:'#62767a',obstacle:'#60767c'},\n city:{name:'Ciudad',ground:'#747b84',ground2:'#5d646d',road:'#343b43',roadEdge:'#252b31',obstacle:'#444b53'},\n elite:{name:'Zona Élite',ground:'#595563',ground2:'#494551',road:'#34313a',roadEdge:'#24212a',obstacle:'#393642'}",
        "desert:{name:'Desierto',ground:'#E9C77D',ground2:'#D7AD5D',road:'#A27B4E',roadEdge:'#7B5A39',obstacle:'#8B704E'},\n canyon:{name:'Cañón',ground:'#E5A873',ground2:'#C98155',road:'#98664A',roadEdge:'#714733',obstacle:'#8B5C43'},\n forest:{name:'Bosque',ground:'#8EC777',ground2:'#69A55A',road:'#8E7654',roadEdge:'#6A553D',obstacle:'#3F7A49'},\n snow:{name:'Nieve',ground:'#E7F5F8',ground2:'#C7E3EA',road:'#9AAFB6',roadEdge:'#718A92',obstacle:'#7D969E'},\n city:{name:'Ciudad',ground:'#A8B3C0',ground2:'#8796A6',road:'#626E7B',roadEdge:'#4B5661',obstacle:'#6D7885'},\n elite:{name:'Zona Élite',ground:'#8E86A8',ground2:'#6F6888',road:'#5E586D',roadEdge:'#45404F',obstacle:'#605A70'}",
        'biomas'
      );

      // Suelo con profundidad y detalles ligeros según bioma.
      code = replaceRequired(
        code,
        "function drawGround(){ctx.fillStyle=game.biome.ground;ctx.fillRect(0,0,view.w,view.h);const s=scale(),step=66*s;ctx.globalAlpha=.14;ctx.fillStyle=game.biome.ground2;for(let y=0;y<view.h+step;y+=step)for(let x=0;x<view.w+step;x+=step){ctx.beginPath();ctx.ellipse(x+((y/step)%2)*step*.3,y,step*.32,step*.16,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}",
        "function drawGround(){const g=ctx.createLinearGradient(0,0,0,view.h);g.addColorStop(0,game.biome.ground);g.addColorStop(1,game.biome.ground2);ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);const s=scale(),step=72*s;ctx.globalAlpha=.10;ctx.fillStyle='#ffffff';for(let y=step*.3;y<view.h+step;y+=step)for(let x=0;x<view.w+step;x+=step){ctx.beginPath();ctx.ellipse(x+((y/step)%2)*step*.32,y,step*.28,step*.12,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=.10;ctx.fillStyle=game.biome.obstacle;for(let i=0;i<18;i++){const x=((i*137+game.level*41)%997)/997*view.w,y=((i*83+game.level*67)%613)/613*view.h,r=(2+(i%4))*s;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}"
      );

      // Caminos más anchos, suaves y con mejor lectura visual.
      code = replaceRequired(
        code,
        "function drawRoads(){const s=scale();ctx.lineCap='round';ctx.lineJoin='round';for(const r of game.roads){ctx.strokeStyle='rgba(0,0,0,.20)';ctx.lineWidth=48*s;traceRoad(r);ctx.stroke();ctx.strokeStyle=game.biome.roadEdge;ctx.lineWidth=41*s;traceRoad(r);ctx.stroke();ctx.strokeStyle=game.biome.road;ctx.lineWidth=35*s;traceRoad(r);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2*s;ctx.setLineDash([7*s,12*s]);traceRoad(r);ctx.stroke();ctx.setLineDash([]);}}",
        "function drawRoads(){const s=scale();ctx.lineCap='round';ctx.lineJoin='round';for(const r of game.roads){ctx.strokeStyle='rgba(70,45,20,.18)';ctx.lineWidth=56*s;traceRoad(r);ctx.stroke();ctx.strokeStyle=game.biome.roadEdge;ctx.lineWidth=50*s;traceRoad(r);ctx.stroke();ctx.strokeStyle=game.biome.road;ctx.lineWidth=43*s;traceRoad(r);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=2.2*s;ctx.setLineDash([9*s,13*s]);traceRoad(r);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=.16;ctx.strokeStyle='#fff';ctx.lineWidth=1*s;traceRoad(r);ctx.stroke();ctx.globalAlpha=1;}}",
        'caminos'
      );

      // Obstáculos más decorativos y menos pesados visualmente.
      code = replaceRequired(
        code,
        "function drawObstacles(){const s=scale();for(const o of game.obstacles){const x=o.x*view.w,y=o.y*view.h,r=o.r*s;if(game.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<r+52*s))continue;ctx.save();ctx.translate(x,y);ctx.rotate(o.rot);ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(3*s,6*s,r,r*.55,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=game.biome.obstacle;ctx.beginPath();ctx.roundRect(-r,-r*.40,r*2,r*.80,r*.28);ctx.fill();ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.ellipse(-r*.25,-r*.12,r*.38,r*.11,0,0,Math.PI*2);ctx.fill();ctx.restore();}}",
        "function drawObstacles(){const s=scale();for(const o of game.obstacles){const x=o.x*view.w,y=o.y*view.h,r=o.r*s;if(game.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<r+52*s))continue;ctx.save();ctx.translate(x,y);ctx.rotate(o.rot);ctx.fillStyle='rgba(40,55,70,.14)';ctx.beginPath();ctx.ellipse(3*s,7*s,r*1.03,r*.52,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=game.biome.obstacle;ctx.beginPath();ctx.roundRect(-r,-r*.42,r*2,r*.84,r*.30);ctx.fill();ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-r*.24,-r*.13,r*.40,r*.11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.20;ctx.strokeStyle='#fff';ctx.lineWidth=1.2*s;ctx.beginPath();ctx.roundRect(-r,-r*.42,r*2,r*.84,r*.30);ctx.stroke();ctx.restore();ctx.globalAlpha=1;}}",
        'obstáculos'
      );

      // CORE: fortaleza clara, legible y con torres.
      code = replaceRequired(
        code,
        "function drawCastle(n,color,s){const r=39*s;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.ellipse(4*s,18*s,r*1.35,r*.62,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#313d45';ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1.3*s;ctx.beginPath();ctx.roundRect(-r*1.08,-r*.50,r*2.16,r*1.18,8*s);ctx.fill();ctx.stroke();ctx.fillStyle='#202b33';ctx.strokeStyle=color;ctx.lineWidth=3*s;ctx.beginPath();ctx.roundRect(-r*.72,-r*.60,r*1.44,r*1.10,5*s);ctx.fill();ctx.stroke();for(const side of[-1,1]){const tx=side*r*.82;ctx.fillStyle='#27343d';ctx.strokeStyle=color;ctx.lineWidth=2.5*s;ctx.beginPath();ctx.roundRect(tx-r*.30,-r*.78,r*.60,r*1.05,5*s);ctx.fill();ctx.stroke();ctx.fillStyle='#394852';ctx.fillRect(tx-r*.31,-r*.91,r*.13,r*.16);ctx.fillRect(tx-r*.08,-r*.91,r*.16,r*.16);ctx.fillRect(tx+r*.18,-r*.91,r*.13,r*.16);}ctx.fillStyle='#3b4952';for(let i=-2;i<=2;i++)ctx.fillRect(i*r*.22-r*.08,-r*.75,r*.16,r*.16);ctx.fillStyle='#0c141a';ctx.beginPath();ctx.roundRect(-r*.25,-r*.17,r*.50,r*.55,4*s);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2.3*s;ctx.stroke();const pulse=1+Math.sin(game.elapsed*3)*.06;ctx.fillStyle=color;ctx.globalAlpha=.30;ctx.beginPath();ctx.arc(0,r*.03,r*.15*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#f1f7fb';ctx.font=`900 ${8.5*s}px system-ui`;ctx.textAlign='center';ctx.fillText('CORE',0,-r*.40);ctx.strokeStyle='#e8f2f7';ctx.beginPath();ctx.moveTo(r*.95,-r*.80);ctx.lineTo(r*.95,-r*1.38);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(r*.95,-r*1.36);ctx.lineTo(r*1.43,-r*1.20);ctx.lineTo(r*.95,-r*1.04);ctx.closePath();ctx.fill();const w=r*1.65;ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.roundRect(-w/2,r*.78,w,5*s,2*s);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-w/2,r*.78,w*clamp(n.hp/n.maxHp,0,1),5*s,2*s);ctx.fill();ctx.restore();}",
        "function drawCastle(n,color,s){const r=40*s;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(50,70,90,.20)';ctx.beginPath();ctx.ellipse(3*s,20*s,r*1.38,r*.56,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#F7FBFF';ctx.strokeStyle='#C6D7E7';ctx.lineWidth=1.7*s;ctx.beginPath();ctx.roundRect(-r*1.06,-r*.42,r*2.12,r*1.06,10*s);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.globalAlpha=.16;ctx.beginPath();ctx.roundRect(-r*.72,-r*.56,r*1.44,r*.86,8*s);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=color;ctx.lineWidth=3.2*s;ctx.stroke();for(const side of[-1,1]){const tx=side*r*.82;ctx.fillStyle='#E9F2FA';ctx.strokeStyle=color;ctx.lineWidth=2.5*s;ctx.beginPath();ctx.roundRect(tx-r*.30,-r*.76,r*.60,r*1.02,8*s);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.globalAlpha=.90;for(let i=-1;i<=1;i++)ctx.fillRect(tx+i*r*.18-r*.06,-r*.88,r*.12,r*.17);ctx.globalAlpha=1;}ctx.fillStyle='#DCE8F2';for(let i=-2;i<=2;i++)ctx.fillRect(i*r*.22-r*.07,-r*.69,r*.14,r*.17);ctx.fillStyle='#24384A';ctx.beginPath();ctx.roundRect(-r*.25,-r*.08,r*.50,r*.47,6*s);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2.6*s;ctx.stroke();const pulse=1+Math.sin(game.elapsed*3.2)*.08;ctx.fillStyle=color;ctx.globalAlpha=.26;ctx.beginPath();ctx.arc(0,r*.08,r*.17*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#17324D';ctx.font=`950 ${9*s}px system-ui`;ctx.textAlign='center';ctx.fillText('CORE',0,-r*.37);ctx.strokeStyle='#8197AA';ctx.lineWidth=1.4*s;ctx.beginPath();ctx.moveTo(r*.92,-r*.74);ctx.lineTo(r*.92,-r*1.34);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(r*.92,-r*1.32);ctx.lineTo(r*1.42,-r*1.14);ctx.lineTo(r*.92,-r*.98);ctx.closePath();ctx.fill();const w=r*1.72;ctx.fillStyle='rgba(43,66,86,.22)';ctx.beginPath();ctx.roundRect(-w/2,r*.76,w,6*s,3*s);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-w/2,r*.76,w*clamp(n.hp/n.maxHp,0,1),6*s,3*s);ctx.fill();ctx.restore();}",
        'CORE visual'
      );

      // Fábricas más simpáticas y diferentes del CORE.
      code = replaceRequired(
        code,
        "function drawFactory(n,color,s){const r=31*s,label=UNITS[n.unitType].short;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(4*s,14*s,r*1.35,r*.60,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b3841';ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.roundRect(-r*1.05,-r*.46,r*2.10,r*1.05,7*s);ctx.fill();ctx.stroke();ctx.fillStyle='#1b252d';ctx.strokeStyle=color;ctx.lineWidth=2.8*s;ctx.beginPath();ctx.roundRect(-r*.76,-r*.56,r*1.52,r*.96,6*s);ctx.fill();ctx.stroke();ctx.fillStyle='#374650';ctx.beginPath();ctx.moveTo(-r*.76,-r*.56);ctx.lineTo(-r*.46,-r*.78);ctx.lineTo(r*.48,-r*.78);ctx.lineTo(r*.76,-r*.56);ctx.closePath();ctx.fill();ctx.fillStyle='#0a1116';ctx.strokeStyle=color;ctx.lineWidth=2*s;ctx.beginPath();ctx.roundRect(-r*.38,-r*.15,r*.76,r*.55,3*s);ctx.fill();ctx.stroke();ctx.fillStyle='#e8f5ff';ctx.font=`900 ${8.5*s}px system-ui`;ctx.textAlign='center';ctx.fillText(label,0,-r*.49);ctx.fillStyle=color;ctx.beginPath();ctx.arc(-r*.58,-r*.33,2.2*s,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(r*.58,-r*.33,2.2*s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e3edf2';ctx.beginPath();ctx.moveTo(r*.80,-r*.66);ctx.lineTo(r*.80,-r*1.22);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(r*.80,-r*1.20);ctx.lineTo(r*1.28,-r*1.05);ctx.lineTo(r*.80,-r*.88);ctx.closePath();ctx.fill();ctx.restore();}",
        "function drawFactory(n,color,s){const r=31*s,label=UNITS[n.unitType].short;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(50,70,90,.18)';ctx.beginPath();ctx.ellipse(3*s,15*s,r*1.38,r*.56,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#F7FBFF';ctx.strokeStyle='#CADBE9';ctx.lineWidth=1.6*s;ctx.beginPath();ctx.roundRect(-r*1.04,-r*.42,r*2.08,r*.98,10*s);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.globalAlpha=.14;ctx.beginPath();ctx.roundRect(-r*.77,-r*.53,r*1.54,r*.84,8*s);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=color;ctx.lineWidth=2.8*s;ctx.stroke();ctx.fillStyle='#DCE9F4';ctx.beginPath();ctx.moveTo(-r*.77,-r*.53);ctx.lineTo(-r*.47,-r*.76);ctx.lineTo(r*.47,-r*.76);ctx.lineTo(r*.77,-r*.53);ctx.closePath();ctx.fill();ctx.strokeStyle='#B9CAD8';ctx.lineWidth=1*s;ctx.stroke();ctx.fillStyle='#24384A';ctx.strokeStyle=color;ctx.lineWidth=2.2*s;ctx.beginPath();ctx.roundRect(-r*.38,-r*.10,r*.76,r*.48,5*s);ctx.fill();ctx.stroke();ctx.fillStyle='#17324D';ctx.font=`950 ${9*s}px system-ui`;ctx.textAlign='center';ctx.fillText(label,0,-r*.43);ctx.fillStyle=color;ctx.beginPath();ctx.arc(-r*.58,-r*.29,2.5*s,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(r*.58,-r*.29,2.5*s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8197AA';ctx.lineWidth=1.3*s;ctx.beginPath();ctx.moveTo(r*.82,-r*.61);ctx.lineTo(r*.82,-r*1.18);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(r*.82,-r*1.16);ctx.lineTo(r*1.30,-r*1.01);ctx.lineTo(r*.82,-r*.84);ctx.closePath();ctx.fill();ctx.restore();}",
        'fábricas visuales'
      );

      // Indicador de producción más limpio.
      code = replaceRequired(
        code,
        "function drawBadge(n,s){if(n.team===TEAM.NEUTRAL||n.hp<=0)return;const y=n.y+(n.kind==='hq'?53:43)*s,w=Math.min(5,waitingCount(n)),sec=nextSpawn(n),int=n.spawnQueue>0?game.config.initialSpawnInterval:productionInterval(n),prog=sec==null?0:clamp(1-sec/Math.max(.01,int),0,1);ctx.fillStyle='rgba(5,12,18,.86)';ctx.beginPath();ctx.roundRect(n.x-35*s,y,70*s,20*s,8*s);ctx.fill();ctx.fillStyle='#e4f0f8';ctx.font=`800 ${8.2*s}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`${UNITS[n.unitType].short} ${w}/5`,n.x-29*s,y+10*s);ctx.textAlign='right';ctx.fillText(sec==null?'':`${sec.toFixed(1)}s`,n.x+29*s,y+10*s);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2.8*s;ctx.beginPath();ctx.arc(n.x+4*s,y+10*s,6*s,-Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.strokeStyle=TEAM_COLOR[n.team];ctx.beginPath();ctx.arc(n.x+4*s,y+10*s,6*s,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);ctx.stroke();}",
        "function drawBadge(n,s){if(n.team===TEAM.NEUTRAL||n.hp<=0)return;const y=n.y+(n.kind==='hq'?53:43)*s,w=Math.min(5,waitingCount(n)),sec=nextSpawn(n),int=n.spawnQueue>0?game.config.initialSpawnInterval:productionInterval(n),prog=sec==null?0:clamp(1-sec/Math.max(.01,int),0,1);ctx.fillStyle='rgba(255,255,255,.93)';ctx.strokeStyle='rgba(70,100,125,.18)';ctx.lineWidth=1*s;ctx.beginPath();ctx.roundRect(n.x-35*s,y,70*s,20*s,9*s);ctx.fill();ctx.stroke();ctx.fillStyle='#17324D';ctx.font=`900 ${8.2*s}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`${UNITS[n.unitType].short} ${w}/5`,n.x-29*s,y+10*s);ctx.textAlign='right';ctx.fillText(sec==null?'':`${sec.toFixed(1)}s`,n.x+29*s,y+10*s);ctx.strokeStyle='#D4E0E9';ctx.lineWidth=2.8*s;ctx.beginPath();ctx.arc(n.x+4*s,y+10*s,6*s,-Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.strokeStyle=TEAM_COLOR[n.team];ctx.beginPath();ctx.arc(n.x+4*s,y+10*s,6*s,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);ctx.stroke();}",
        'badge de producción'
      );

      // Robots más claros, amigables y distinguibles por silueta.
      code = replaceRequired(
        code,
        "function drawRobot(x,y,color,size,type,phase=0,moving=false){const info=UNITS[type],sz=size*info.size,bob=moving?Math.sin(phase)*.9*sz:0,leg=moving?Math.sin(phase)*2.4*sz:0,py=y+bob;ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.ellipse(x+1.5*sz,py+8*sz,7*sz,3.2*sz,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#18232c';ctx.lineWidth=3*sz;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-3*sz,py+4*sz);ctx.lineTo(x-4*sz-leg,py+9*sz);ctx.moveTo(x+3*sz,py+4*sz);ctx.lineTo(x+4*sz+leg,py+9*sz);ctx.stroke();ctx.fillStyle=type==='heavy'?'#34404a':'#263746';ctx.strokeStyle=color;ctx.lineWidth=2*sz;ctx.beginPath();ctx.roundRect(x-6*sz,py-3*sz,12*sz,10*sz,type==='heavy'?2*sz:3*sz);ctx.fill();ctx.stroke();ctx.fillStyle='#304756';ctx.beginPath();ctx.roundRect(x-5.5*sz,py-10*sz,11*sz,8*sz,3*sz);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.globalAlpha=.88;ctx.beginPath();ctx.roundRect(x-3.8*sz,py-7.7*sz,7.6*sz,2.4*sz,1.2*sz);ctx.fill();ctx.globalAlpha=1;if(type==='fast'){ctx.strokeStyle=color;ctx.lineWidth=1.5*sz;ctx.beginPath();ctx.moveTo(x-7*sz,py+2*sz);ctx.lineTo(x-11*sz,py+5*sz);ctx.moveTo(x+7*sz,py+2*sz);ctx.lineTo(x+11*sz,py+5*sz);ctx.stroke();}else if(type==='heavy'){ctx.fillStyle='#17222b';ctx.beginPath();ctx.arc(x-8*sz,py,3.5*sz,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+8*sz,py,3.5*sz,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#d7e7ef';ctx.lineWidth=(type==='sniper'?1.7:2)*sz;ctx.beginPath();ctx.moveTo(x+5*sz,py+1*sz);ctx.lineTo(x+(type==='sniper'?14:10)*sz,py-(type==='sniper'?2:1)*sz);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+(type==='sniper'?14.5:10.5)*sz,py-(type==='sniper'?2.2:1.2)*sz,1.3*sz,0,Math.PI*2);ctx.fill();}",
        "function drawRobot(x,y,color,size,type,phase=0,moving=false){const info=UNITS[type],sz=size*info.size,bob=moving?Math.sin(phase)*.8*sz:0,leg=moving?Math.sin(phase)*2.2*sz:0,py=y+bob;ctx.fillStyle='rgba(45,65,80,.18)';ctx.beginPath();ctx.ellipse(x+1.5*sz,py+8.6*sz,7.4*sz,3.1*sz,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#5D7182';ctx.lineWidth=2.5*sz;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-3*sz,py+4*sz);ctx.lineTo(x-4*sz-leg,py+9*sz);ctx.moveTo(x+3*sz,py+4*sz);ctx.lineTo(x+4*sz+leg,py+9*sz);ctx.stroke();ctx.fillStyle=type==='heavy'?'#D7E3EC':'#EDF5FA';ctx.strokeStyle=color;ctx.lineWidth=2*sz;ctx.beginPath();ctx.roundRect(x-(type==='heavy'?7:6)*sz,py-3*sz,(type==='heavy'?14:12)*sz,10*sz,type==='heavy'?3*sz:4*sz);ctx.fill();ctx.stroke();ctx.fillStyle='#F7FBFF';ctx.beginPath();ctx.roundRect(x-5.6*sz,py-10*sz,11.2*sz,8*sz,4*sz);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-3.8*sz,py-7.5*sz,7.6*sz,2.5*sz,1.4*sz);ctx.fill();ctx.fillStyle='#17324D';ctx.globalAlpha=.42;ctx.beginPath();ctx.arc(x-2.3*sz,py-6.25*sz,.65*sz,0,Math.PI*2);ctx.arc(x+2.3*sz,py-6.25*sz,.65*sz,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(type==='fast'){ctx.strokeStyle=color;ctx.lineWidth=1.8*sz;ctx.beginPath();ctx.moveTo(x-7*sz,py+1*sz);ctx.lineTo(x-11*sz,py+4*sz);ctx.moveTo(x+7*sz,py+1*sz);ctx.lineTo(x+11*sz,py+4*sz);ctx.stroke();ctx.fillStyle='#FFCC33';ctx.beginPath();ctx.arc(x-8.5*sz,py+4.5*sz,1.4*sz,0,Math.PI*2);ctx.arc(x+8.5*sz,py+4.5*sz,1.4*sz,0,Math.PI*2);ctx.fill();}else if(type==='heavy'){ctx.fillStyle='#6B7F90';ctx.beginPath();ctx.arc(x-8.2*sz,py,3.6*sz,0,Math.PI*2);ctx.arc(x+8.2*sz,py,3.6*sz,0,Math.PI*2);ctx.fill();}else if(type==='sniper'){ctx.fillStyle='#FFCC33';ctx.beginPath();ctx.arc(x,py-11.8*sz,1.8*sz,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#64798A';ctx.lineWidth=(type==='sniper'?1.7:2)*sz;ctx.beginPath();ctx.moveTo(x+5*sz,py+1*sz);ctx.lineTo(x+(type==='sniper'?14:10)*sz,py-(type==='sniper'?2:1)*sz);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+(type==='sniper'?14.5:10.5)*sz,py-(type==='sniper'?2.2:1.2)*sz,1.5*sz,0,Math.PI*2);ctx.fill();}"
      );
      code = code.replace(
        "function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],.84*s,u.type,u.walkPhase,u.state==='exiting');}",
        "function drawIndividuals(){const s=scale();for(const u of game.individuals)drawRobot(u.x,u.y,TEAM_COLOR[u.team],1.05*s,u.type,u.walkPhase,u.state==='exiting');}"
      );

      // Selección más clara y menos agresiva.
      code = replaceRequired(
        code,
        "function drawSquads(){const s=scale();for(const q of game.squads){const color=TEAM_COLOR[q.team],offs=formation(q.count,17*s*UNITS[q.type].size);if(q.selected){ctx.fillStyle='rgba(255,255,255,.07)';ctx.strokeStyle='#fff';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(q.x,q.y,33*s,0,Math.PI*2);ctx.fill();ctx.stroke();}const moving=q.route.length>0||q.order?.kind==='ally';offs.forEach(([ox,oy],i)=>drawRobot(q.x+ox,q.y+oy,color,1.05*s,q.type,q.bob+i*.7,moving));const hp=clamp(q.hp/Math.max(1,q.maxHp),0,1);if(hp<.99){const w=42*s;ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(q.x-w/2,q.y-37*s,w,4*s);ctx.fillStyle=color;ctx.fillRect(q.x-w/2,q.y-37*s,w*hp,4*s);}}}",
        "function drawSquads(){const s=scale();for(const q of game.squads){const color=TEAM_COLOR[q.team],offs=formation(q.count,17*s*UNITS[q.type].size);if(q.selected){ctx.fillStyle='rgba(255,255,255,.18)';ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2.5*s;ctx.beginPath();ctx.arc(q.x,q.y,32*s,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=1.5*s;ctx.beginPath();ctx.arc(q.x,q.y,36*s,0,Math.PI*2);ctx.stroke();}const moving=q.route.length>0||q.order?.kind==='ally';offs.forEach(([ox,oy],i)=>drawRobot(q.x+ox,q.y+oy,color,1.05*s,q.type,q.bob+i*.7,moving));const hp=clamp(q.hp/Math.max(1,q.maxHp),0,1);if(hp<.99){const w=42*s;ctx.fillStyle='rgba(255,255,255,.80)';ctx.fillRect(q.x-w/2,q.y-37*s,w,5*s);ctx.fillStyle=color;ctx.fillRect(q.x-w/2,q.y-37*s,w*hp,5*s);}}}"
      );

      // Proyectiles con núcleo luminoso y estela más visible.
      code = replaceRequired(
        code,
        "function drawProjectiles(){const s=scale();ctx.lineCap='round';for(const p of game.projectiles){const color=TEAM_COLOR[p.team],wide=p.unitType==='heavy'?6:p.unitType==='sniper'?3:5;ctx.globalAlpha=.30;ctx.strokeStyle=color;ctx.lineWidth=wide*s;ctx.beginPath();ctx.moveTo(p.prevX,p.prevY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=.95;ctx.strokeStyle=p.unitType==='sniper'?'#fff6b6':'#f7fbff';ctx.lineWidth=(p.unitType==='sniper'?1.8:1.4)*s;ctx.beginPath();ctx.moveTo(p.prevX,p.prevY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=9*s;ctx.beginPath();ctx.arc(p.x,p.y,(p.unitType==='heavy'?4:p.unitType==='sniper'?2.7:3.2)*s,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}ctx.globalAlpha=1;}",
        "function drawProjectiles(){const s=scale();ctx.lineCap='round';for(const p of game.projectiles){const color=TEAM_COLOR[p.team],wide=p.unitType==='heavy'?8:p.unitType==='sniper'?4:6;ctx.globalAlpha=.22;ctx.strokeStyle=color;ctx.lineWidth=wide*s;ctx.shadowColor=color;ctx.shadowBlur=12*s;ctx.beginPath();ctx.moveTo(p.prevX,p.prevY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle=p.unitType==='sniper'?'#FFF2A8':'#FFFFFF';ctx.lineWidth=(p.unitType==='sniper'?2.2:1.8)*s;ctx.beginPath();ctx.moveTo(p.prevX,p.prevY);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=p.unitType==='heavy'?'#FFCC33':color;ctx.beginPath();ctx.arc(p.x,p.y,(p.unitType==='heavy'?4.8:p.unitType==='sniper'?3.2:3.8)*s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(p.x,p.y,(p.unitType==='heavy'?2.0:1.5)*s,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}ctx.globalAlpha=1;}",
        'proyectiles'
      );

      // Partículas con una pequeña aura.
      code = replaceRequired(
        code,
        "function drawParticles(){const s=scale();for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,(p.size||2.2)*s,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}",
        "function drawParticles(){const s=scale();for(const p of game.particles){const a=clamp(p.life/p.maxLife,0,1);ctx.globalAlpha=a*.22;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,(p.size||2.2)*s*2.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,(p.size||2.2)*s,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}"
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
        "game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);queueMicrotask(()=>{window.dispatchEvent(new CustomEvent('rbtwar:ready',{detail:window.RBTwarAPI.getState()}));window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI.getState()}));console.info('RBTwar motor v26 listo');});",
        'inicio final'
      );

      try {
        new Function(code);
      } catch (syntaxError) {
        throw new Error(`Sintaxis del motor consolidado: ${syntaxError.message}`);
      }

      const script = document.createElement('script');
      script.dataset.rbtwarEngine = 'v26-visual';
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(showError);
})();
