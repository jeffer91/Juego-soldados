(() => {
  'use strict';

  const VERSION = '19';
  const ENGINE_URL = `src/game-v7.js?v=${VERSION}`;

  function showError(error) {
    console.error('RBTwar v19 no pudo iniciar:', error);
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

  function replacePattern(source, pattern, to, label) {
    if (!pattern.test(source)) throw new Error(`No se encontró patrón: ${label}`);
    return source.replace(pattern, to);
  }

  console.info('RBTwar bootstrap v19');

  fetch(ENGINE_URL, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Motor base HTTP ${response.status}`);
      return response.text();
    })
    .then(source => {
      let code = source.replace(/\r\n?/g, '\n');

      code = replaceRequired(code,'enemyHp:early?.60+(level-1)*.085:1+Math.min(.55,(level-6)*.026)','enemyHp:early ? .60+(level-1)*.085 : 1+Math.min(.55,(level-6)*.026)','enemyHp');
      code = replaceRequired(code,'enemyDamage:early?.56+(level-1)*.085:1+Math.min(.48,(level-6)*.022)','enemyDamage:early ? .56+(level-1)*.085 : 1+Math.min(.48,(level-6)*.022)','enemyDamage');
      code = replaceRequired(code,"mult=targetType==='node'?.34:.46","mult=targetType==='node' ? .34 : .46",'daño a estructuras');

      code = code.replace("const STORAGE_KEY='rbtwar-save-v7',MAX_LEVEL=30;","const STORAGE_KEY='rbtwar-save-v19',MAX_LEVEL=30;");
      code = code.replace("for(const key of [STORAGE_KEY,'rbtwar-save-v6'","for(const key of [STORAGE_KEY,'rbtwar-save-v18','rbtwar-save-v12','rbtwar-save-v11','rbtwar-save-v10','rbtwar-save-v9','rbtwar-save-v8','rbtwar-save-v7','rbtwar-save-v6'");
      code = code.replace('ui.startBtn.textContent=`JUGAR NIVEL ${save.currentLevel}`;',"ui.startBtn.textContent='JUGAR';");
      code = replaceRequired(code,"function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshHud();refreshStartScreen();}","function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(save));refreshHud();refreshStartScreen();queueMicrotask(()=>window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI?.getState?.()})));}",'persistencia');

      code = replaceRequired(code,"let save=loadSave(),game=null,inMenu=true,paused=false,ended=false,selectedSquadId=null,drag=null,pointer={x:-999,y:-999},lastTs=performance.now(),toastTimer=null,view={w:844,h:390,dpr:1};","let save=loadSave(),game=null,inMenu=true,paused=false,ended=false,selectedSquadId=null,drag=null,pointer={x:-999,y:-999},lastTs=performance.now(),toastTimer=null,view={w:844,h:390,dpr:1};let selectedSquadIds=new Set(),selectionBox=null;",'estado de selección múltiple');

      const selectionFunctions = `function selectedSquads(){return [...selectedSquadIds].map(id=>getSquad(id)).filter(s=>s&&s.hp>0);}
function refreshSelectionPanel(){
 const list=selectedSquads();
 game?.squads.forEach(s=>s.selected=selectedSquadIds.has(s.id));
 if(!list.length){selectedSquadId=null;ui.selectionPanel.classList.add('hidden');return;}
 selectedSquadId=list[0].id;
 if(list.length===1){const s=list[0];ui.selectedSquadLabel.textContent=UNITS[s.type].short+' · '+s.count;ui.selectedSquadType.textContent='Nv.'+s.level;}
 else{ui.selectedSquadLabel.textContent=list.length+' PELOTONES';ui.selectedSquadType.textContent=list.reduce((n,s)=>n+s.count,0)+' robots';}
 ui.selectionPanel.classList.remove('hidden');
}
function setSelected(list){selectedSquadIds.clear();for(const s of list||[])if(s&&s.team===TEAM.PLAYER&&s.hp>0)selectedSquadIds.add(s.id);refreshSelectionPanel();}
function selectSquad(s){setSelected(s?[s]:[]);}
function selectSquads(list){setSelected(list);}
function deselect(){selectedSquadIds.clear();if(game)game.squads.forEach(s=>s.selected=false);selectedSquadId=null;ui.selectionPanel.classList.add('hidden');}`;
      code = replacePattern(code,/function selectSquad\(s\)\{[\s\S]*?\}\nfunction deselect\(\)\{[\s\S]*?\}/,selectionFunctions,'funciones de selección');

      const drawRange = `function drawRange(){
 const list=selectedSquads();if(!list.length)return;
 ctx.save();ctx.strokeStyle='rgba(130,220,255,.30)';ctx.fillStyle='rgba(65,184,255,.035)';ctx.lineWidth=1.4;ctx.setLineDash([6,6]);
 for(const s of list){ctx.beginPath();ctx.arc(s.x,s.y,s.range+bodyRadius(s),0,Math.PI*2);ctx.fill();ctx.stroke();}
 ctx.restore();
}`;
      code = replacePattern(code,/function drawRange\(\)\{[\s\S]*?\}\nfunction commandPoint/,drawRange+'\nfunction commandPoint','alcance seleccionado');

      const drawCommand = `function drawCommand(){
 if(drag?.active&&drag.groupIds?.length){
  const group=drag.groupIds.map(id=>getSquad(id)).filter(Boolean),p=commandPoint(drag.target);
  if(group.length&&p){const cx=group.reduce((n,s)=>n+s.x,0)/group.length,cy=group.reduce((n,s)=>n+s.y,0)/group.length;ctx.save();ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=3*scale();ctx.setLineDash([8*scale(),6*scale()]);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(58,134,255,.24)';ctx.strokeStyle='#8fc0ff';ctx.lineWidth=2*scale();ctx.beginPath();ctx.arc(p.x,p.y,17*scale(),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
 }
 if(selectionBox){const x=Math.min(selectionBox.x1,selectionBox.x2),y=Math.min(selectionBox.y1,selectionBox.y2),w=Math.abs(selectionBox.x2-selectionBox.x1),h=Math.abs(selectionBox.y2-selectionBox.y1);ctx.save();ctx.fillStyle='rgba(58,134,255,.10)';ctx.strokeStyle='rgba(120,185,255,.92)';ctx.lineWidth=2*scale();ctx.setLineDash([7*scale(),5*scale()]);ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();}
}`;
      code = replacePattern(code,/function drawCommand\(\)\{[\s\S]*?\}\nfunction drawCastle/,drawCommand+'\nfunction drawCastle','orden y selección visual');

      const hitFunctions = `function playerSquadAt(p,exclude=null,radiusPx=44){
 const radius=radiusPx*scale();return game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.id!==exclude).map(s=>({s,d:dist(p,s)})).filter(x=>x.d<=radius).sort((a,b)=>a.d-b.d)[0]?.s||null;
}
function nodeAt(p){return game.nodes.map(n=>({n,d:dist(p,n)})).filter(x=>x.d<=74*scale()).sort((a,b)=>a.d-b.d)[0]?.n||null;}
function targetAt(p,s,excluded=new Set()){
 const ally=game.squads.filter(a=>a.team===TEAM.PLAYER&&a.hp>0&&a.id!==s.id&&!excluded.has(a.id)).map(a=>({s:a,d:dist(p,a)})).filter(x=>x.d<=80*scale()).sort((a,b)=>a.d-b.d)[0]?.s||null;
 if(ally)return{kind:'ally',squad:ally};const n=nodeAt(p);if(n)return{kind:'node',node:n};const snap=snapToRoad(p.x,p.y);if(snap&&snap.dist<=62*scale())return{kind:'road',snap};return null;
}`;
      code = replacePattern(code,/function playerSquadAt\(p,exclude=null\)\{[\s\S]*?\}\nfunction nodeAt\(p\)\{[\s\S]*?\}\nfunction targetAt\(p,s\)\{[\s\S]*?\}/,hitFunctions,'radios táctiles separados');

      const groupHelpers = `function snapAtProgress(base,progress){
 const r=game.roads[base.roadIndex],p=clamp(progress,.03,.97),along=p*r.total;let seg=0;while(seg<r.cumulative.length-2&&r.cumulative[seg+1]<along)seg++;const a=r.points[seg],b=r.points[seg+1],len=Math.max(.001,r.cumulative[seg+1]-r.cumulative[seg]),t=clamp((along-r.cumulative[seg])/len,0,1);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dist:0,roadIndex:r.index,a:r.a,b:r.b,progress:p,along};
}
function executeGroup(ids,t){
 const list=ids.map(id=>getSquad(id)).filter(s=>s&&s.team===TEAM.PLAYER&&s.hp>0);if(!list.length||!t)return false;
 if(t.kind==='road'){const gap=.032,mid=(list.length-1)/2;list.forEach((s,i)=>commandRoad(s,snapAtProgress(t.snap,t.snap.progress+(i-mid)*gap),'road'));return true;}
 if(t.kind==='node'){list.forEach(s=>commandNode(s,t.node));return true;}
 if(t.kind==='ally'){list.forEach(s=>{if(s.id!==t.squad.id)commandAlly(s,t.squad);});return true;}
 return false;
}
function squadsInBox(box){const x1=Math.min(box.x1,box.x2),x2=Math.max(box.x1,box.x2),y1=Math.min(box.y1,box.y2),y2=Math.max(box.y1,box.y2);return game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&s.x>=x1&&s.x<=x2&&s.y>=y1&&s.y<=y2);}
function squadsNearNode(n,radius=155){return game.squads.filter(s=>s.team===TEAM.PLAYER&&s.hp>0&&dist(s,n)<=radius*scale());}`;
      code = replaceRequired(code,"function execute(s,t){if(!s||!t)return false;",groupHelpers+"\nfunction execute(s,t){if(!s||!t)return false;",'ayudas de movimiento múltiple');

      const pointerFunctions = `function onDown(e){
 if(!game||inMenu||paused||ended)return;e.preventDefault();const p=pointerPos(e);pointer=p;const squad=playerSquadAt(p,null,44),node=!squad?nodeAt(p):null;
 if(squad&&!selectedSquadIds.has(squad.id))selectSquad(squad);
 const groupIds=squad?(selectedSquadIds.has(squad.id)?selectedSquads().map(x=>x.id):[squad.id]):[];
 drag={pointerId:e.pointerId,squadId:squad?.id||null,groupIds,sourceNodeId:node?.team===TEAM.PLAYER?node.id:null,startX:p.x,startY:p.y,x:p.x,y:p.y,active:false,target:null,boxCandidate:!squad&&!node};
 selectionBox=drag.boxCandidate?{x1:p.x,y1:p.y,x2:p.x,y2:p.y}:null;canvas.setPointerCapture?.(e.pointerId);
}
function onMove(e){
 const p=pointerPos(e);pointer=p;if(!drag||drag.pointerId!==e.pointerId)return;drag.x=p.x;drag.y=p.y;const moved=Math.hypot(p.x-drag.startX,p.y-drag.startY);
 if(drag.boxCandidate){selectionBox.x2=p.x;selectionBox.y2=p.y;if(moved>10*scale()){drag.active=true;selectSquads(squadsInBox(selectionBox));}return;}
 if(!drag.active&&moved>12*scale()){
  drag.active=true;
  if(!drag.squadId&&drag.sourceNodeId){const n=getNode(drag.sourceNodeId),a=n?waitingIndividuals(n.index,TEAM.PLAYER,n.unitType):[];if(a.length){const s=formSquad(n,TEAM.PLAYER,Math.min(5,a.length));if(s){drag.squadId=s.id;drag.groupIds=[s.id];selectSquad(s);}}}
 }
 if(drag.active&&drag.groupIds?.length){const primary=getSquad(drag.squadId||drag.groupIds[0]),excluded=new Set(drag.groupIds);drag.target=primary?targetAt(p,primary,excluded):null;}
}
function onUp(e){
 if(!game||inMenu||paused||ended){drag=null;selectionBox=null;return;}e.preventDefault();const p=pointerPos(e);pointer=p;if(!drag||drag.pointerId!==e.pointerId){drag=null;selectionBox=null;return;}
 if(drag.boxCandidate){if(drag.active){const list=squadsInBox(selectionBox);selectSquads(list);if(list.length)showToast(list.length+' pelotones seleccionados.');else deselect();}else deselect();selectionBox=null;drag=null;return;}
 if(drag.active&&drag.groupIds?.length){const primary=getSquad(drag.squadId||drag.groupIds[0]),excluded=new Set(drag.groupIds),t=drag.target||(primary?targetAt(p,primary,excluded):null);if(primary&&t){executeGroup(drag.groupIds,t);deselect();}else showToast('Suelta sobre camino, base o aliado.');}
 else if(drag.squadId){const s=getSquad(drag.squadId);if(s)selectSquad(s);}
 else if(drag.sourceNodeId){const n=getNode(drag.sourceNodeId),near=n?squadsNearNode(n):[];if(near.length){selectSquads(near);showToast(near.length+' pelotones listos.');}else{const sec=n?nextSpawn(n):null;showToast(sec==null?'No hay robots listos.':'Próximo robot en '+sec.toFixed(1)+' s.');}}
 drag=null;selectionBox=null;
}`;
      code = replacePattern(code,/function onDown\(e\)\{[\s\S]*?\}\nfunction onMove\(e\)\{[\s\S]*?\}\nfunction onUp\(e\)\{[\s\S]*?\}\nfunction showToast/,pointerFunctions+'\nfunction showToast','gestos táctiles');

      const autoMerge = `function ordersCompatible(a,b){
 if(!a.route.length&&!b.route.length)return true;
 const ae=a.route.at(-1)||a.order,be=b.route.at(-1)||b.order;if(ae&&be&&Math.hypot((ae.x||a.x)-(be.x||b.x),(ae.y||a.y)-(be.y||b.y))<=95*scale())return true;
 return a.order?.kind==='ally'&&a.order.targetId===b.id||b.order?.kind==='ally'&&b.order.targetId===a.id;
}
function mergeNearby(){
 for(let i=0;i<game.squads.length;i++)for(let j=i+1;j<game.squads.length;j++){
  const a=game.squads[i],b=game.squads[j];if(a.hp<=0||b.hp<=0||a.team!==b.team||a.type!==b.type||a.combatTargetId||b.combatTargetId||a.count>=5&&b.count>=5)continue;
  const d=dist(a,b);if(d>86*scale()||!ordersCompatible(a,b))continue;
  if(d<=50*scale()){const target=a.count>=b.count?a:b,mover=target===a?b:a;mergePair(mover,target,false);continue;}
  const pull=Math.min(1.8*scale(),Math.max(.25,(d-50*scale())*.045)),dx=(b.x-a.x)/Math.max(1,d),dy=(b.y-a.y)/Math.max(1,d);if(!a.combatTargetId){a.x+=dx*pull;a.y+=dy*pull;}if(!b.combatTargetId){b.x-=dx*pull;b.y-=dy*pull;}
 }
}`;
      code = replacePattern(code,/function mergeNearby\(\)\{[\s\S]*?\}\nfunction updateParticles/,autoMerge+'\nfunction updateParticles','unión automática');

      code = code.replace("if(selectedSquadId===m.id)selectSquad(t);return true;","if(selectedSquadIds.has(m.id)){selectedSquadIds.delete(m.id);selectedSquadIds.add(t.id);selectedSquadId=t.id;refreshSelectionPanel();}return true;");

      const cleanup = `function cleanup(){game.squads=game.squads.filter(s=>s.hp>0&&s.count>0);for(const id of [...selectedSquadIds])if(!game.squads.some(s=>s.id===id))selectedSquadIds.delete(id);refreshSelectionPanel();}`;
      code = replacePattern(code,/function cleanup\(\)\{[\s\S]*?\}\nfunction checkDefeat/,cleanup+'\nfunction checkDefeat','limpieza de selección');

      const apiBlock = `
function rbtwarUpgradeCost(type,level){const base={basic:50,fast:65,heavy:80,sniper:90}[type]||50;return Math.round(base*Math.pow(1.72,Math.max(0,level-1)));}
function rbtwarCatalog(){return UNIT_ORDER.map(type=>{const u=UNITS[type],level=Math.max(1,Number(save.unitLevels[type]||1));return{type,name:u.name,short:u.short,unlock:u.unlock,unlocked:save.unlockedLevel>=u.unlock,level,maxLevel:5,cost:level>=5?0:rbtwarUpgradeCost(type,level),hp:u.hp,damage:u.damage,range:u.range,speed:u.speed,production:u.production};});}
function rbtwarState(){const level=Math.max(1,Number(save.currentLevel||1));return{coins:Number(save.coins||0),stars:totalStars(),currentLevel:level,unlockedLevel:Number(save.unlockedLevel||1),catalog:rbtwarCatalog(),levelMeta:{title:TITLES[level-1]||('Nivel '+level),biome:biomeKey(level)}};}
function rbtwarUpgrade(type){if(!UNIT_ORDER.includes(type))return{ok:false,reason:'type'};const u=UNITS[type],level=Math.max(1,Number(save.unitLevels[type]||1));if(save.unlockedLevel<u.unlock)return{ok:false,reason:'locked',unlock:u.unlock};if(level>=5)return{ok:false,reason:'max',level};const cost=rbtwarUpgradeCost(type,level);if(save.coins<cost)return{ok:false,reason:'coins',cost};save.coins-=cost;save.unitLevels[type]=level+1;persist();return{ok:true,level:level+1,cost};}
window.RBTwarAPI={getState:rbtwarState,getCatalog:rbtwarCatalog,upgradeUnit:rbtwarUpgrade,startLevel:(level)=>{startLevel(clamp(Number(level||save.currentLevel)||1,1,save.unlockedLevel));return true;},showHome:()=>{showStart();return true;},restartLevel:()=>{if(!game)return false;startLevel(game.level);return true;}};
`;
      code = replaceRequired(code,"canvas.addEventListener('pointerdown',onDown);",apiBlock+"\ncanvas.addEventListener('pointerdown',onDown);",'punto de API');

      code = replaceRequired(code,"game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);","game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);queueMicrotask(()=>{window.dispatchEvent(new CustomEvent('rbtwar:ready',{detail:window.RBTwarAPI.getState()}));window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI.getState()}));console.info('RBTwar motor v19 listo');});",'inicio final');

      try { new Function(code); }
      catch (syntaxError) { throw new Error(`Sintaxis del motor consolidado: ${syntaxError.message}`); }

      const script = document.createElement('script');
      script.dataset.rbtwarEngine = 'v19-controls';
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(showError);
})();
