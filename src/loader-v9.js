(() => {
  'use strict';

  const fail = (message) => { throw new Error(`RBTwar v9: ${message}`); };
  const replaceOne = (source, pattern, replacement, label) => {
    const next = source.replace(pattern, replacement);
    if (next === source) fail(`no se pudo aplicar ${label}`);
    return next;
  };

  fetch('src/game-v7.js?rev=9')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v9 (${response.status})`);
      return response.text();
    })
    .then(source => {
      let corrected = source
        .replace('enemyHp:early?.60+', 'enemyHp:early ? .60 +')
        .replace('enemyDamage:early?.56+', 'enemyDamage:early ? .56 +')
        .replace("const STORAGE_KEY='rbtwar-save-v7',MAX_LEVEL=30;", "const STORAGE_KEY='rbtwar-save-v9',MAX_LEVEL=30;")
        .replace("for(const key of [STORAGE_KEY,'rbtwar-save-v6'", "for(const key of [STORAGE_KEY,'rbtwar-save-v8','rbtwar-save-v7','rbtwar-save-v6'")
        .replace(
          "function productionInterval(n){return UNITS[n.unitType].production*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);}",
          "function productionInterval(n){const lv=Math.max(1,save.unitLevels[n.unitType]||1),boost=n.team===TEAM.PLAYER?Math.max(.72,1-(lv-1)*.07):1;return UNITS[n.unitType].production*boost*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);}"
        );

      const templates = `const TEMPLATES=[
 {nodes:[[.07,.50,'P'],[.28,.20,'N'],[.38,.50,'N'],[.28,.80,'N'],[.68,.50,'E'],[.93,.50,'H']],edges:[[0,1],[0,2],[0,3],[1,4],[2,4],[3,4],[4,5]]},
 {nodes:[[.07,.52,'P'],[.25,.25,'N'],[.30,.76,'N'],[.49,.44,'N'],[.65,.74,'E'],[.74,.25,'E'],[.93,.52,'H']],edges:[[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,6],[5,6]]},
 {nodes:[[.07,.50,'P'],[.24,.50,'N'],[.42,.20,'N'],[.42,.80,'N'],[.60,.50,'N'],[.76,.25,'E'],[.76,.75,'E'],[.94,.50,'H']],edges:[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[4,6],[5,7],[6,7]]},
 {nodes:[[.07,.50,'P'],[.23,.24,'N'],[.23,.76,'N'],[.42,.50,'N'],[.58,.22,'N'],[.58,.78,'N'],[.76,.50,'E'],[.94,.50,'H']],edges:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6],[6,7]]},
 {nodes:[[.06,.50,'P'],[.22,.18,'N'],[.22,.82,'N'],[.40,.34,'N'],[.40,.66,'N'],[.58,.50,'N'],[.72,.20,'E'],[.72,.80,'E'],[.94,.50,'H']],edges:[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[5,6],[5,7],[6,8],[7,8],[3,4]]},
 {nodes:[[.07,.50,'P'],[.20,.28,'N'],[.34,.18,'N'],[.34,.66,'N'],[.52,.38,'N'],[.65,.68,'E'],[.78,.38,'E'],[.93,.50,'H']],edges:[[0,1],[1,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,6],[6,7]]},
 {nodes:[[.07,.50,'P'],[.25,.18,'N'],[.25,.82,'N'],[.47,.50,'N'],[.68,.18,'E'],[.68,.82,'E'],[.93,.50,'H']],edges:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6],[1,2],[4,5]]},
 {nodes:[[.06,.50,'P'],[.23,.50,'N'],[.39,.18,'N'],[.39,.82,'N'],[.55,.50,'N'],[.72,.18,'E'],[.72,.82,'E'],[.94,.50,'H']],edges:[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[4,6],[5,7],[6,7],[2,3],[5,6]]},
 {nodes:[[.06,.50,'P'],[.22,.25,'N'],[.22,.75,'N'],[.44,.25,'N'],[.44,.75,'N'],[.63,.50,'N'],[.77,.26,'E'],[.77,.74,'E'],[.94,.50,'H']],edges:[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[5,6],[5,7],[6,8],[7,8],[3,4]]},
 {nodes:[[.06,.50,'P'],[.20,.20,'N'],[.20,.80,'N'],[.37,.50,'N'],[.55,.20,'N'],[.55,.80,'N'],[.70,.50,'E'],[.82,.24,'E'],[.82,.76,'E'],[.95,.50,'H']],edges:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6],[6,7],[6,8],[7,9],[8,9],[4,5]]}
];`;
      corrected = replaceOne(corrected, /const TEMPLATES=\[[\s\S]*?\];\nconst defaultSave=/, `${templates}\nconst defaultSave=`, 'plantillas de mapas');

      const levelConfig = `function levelConfig(level){
 const idx=(level-1)%5,world=Math.floor((level-1)/5),early=level<=5,boss=idx===4;
 const mission=['EXPANSIÓN','CRUCE TÁCTICO','CONTROL CENTRAL','PRESIÓN','BASTIÓN'][idx];
 const style=level<=3?'cautious':level<=10?'balanced':level<=20?'aggressive':'elite';
 const worldMove=[1,.98,1,.93,1.04,1.02][world]||1;
 const p=(level-1)/29;
 return{title:TITLES[level-1],biome:biomeKey(level),mission,style,boss,
  aiDelay:early?13-(level-1)*1.35:6.4-Math.min(3.4,(level-6)*.11),
  playerProduction:world===4?.94:1,
  enemyProduction:early?1.72-(level-1)*.12:Math.max(.79,1.14-(level-6)*.011),
  enemyHp:early?.58+(level-1)*.085:1+Math.min(.50,(level-6)*.024)+(boss?.08:0),
  enemyDamage:early?.54+(level-1)*.08:1+Math.min(.44,(level-6)*.020)+(boss?.06:0),
  initialSpawnInterval:early?1.95-(level-1)*.045:1.70,
  playerCoreHp:920+level*18,
  enemyCoreHp:(early?500+level*32:735+level*28)*(boss?1.20:1),
  initialEnemy:early?Math.min(3,1+Math.floor((level-1)/2)):Math.min(5,2+Math.floor(level/8)+(boss?1:0)),
  movement:worldMove,captureTime:early?2.35:2.55+(boss?.25:0),rewardMultiplier:boss?1.30:1,difficulty:p};
}
function factoryType`;
      corrected = replaceOne(corrected, /function levelConfig\(level\)\{[\s\S]*?\}\nfunction factoryType/, levelConfig, 'progresión de dificultad');

      const factoryType = `function factoryType(level,index,team){
 const types=unlockedTypes(level);
 if(team===TEAM.PLAYER&&index===0)return'basic';
 if(level===4&&index>0)return index%2?'fast':'basic';
 if(level===8&&index>0)return index%3===0?'heavy':types[(index+level)%types.length];
 if(level===12&&index>0)return index%3===1?'sniper':types[(index+level)%types.length];
 if(types.length===1)return'basic';
 const offset=team===TEAM.ENEMY?1:0;
 return types[(index+level+offset)%types.length];
}`;
      corrected = replaceOne(corrected, /function factoryType\(level,index,team\)\{[\s\S]*?\}\nfunction makeLevel/, `${factoryType}\nfunction makeLevel`, 'tipos de fábrica');

      const makeLevel = `function makeLevel(level){
 const cfg=levelConfig(level),rand=randFactory(2048+level*9173),templateIndex=((level-1)+(Math.floor((level-1)/5)*2))%TEMPLATES.length,tpl=TEMPLATES[templateIndex],nodes=[];
 tpl.nodes.forEach((n,i)=>{
  let[nx,ny,role]=n;
  const shift=level<=2?0:.012+Math.min(.014,level*.0005);
  nx+=((rand()-.5)*shift);ny+=((rand()-.5)*shift);
  const team=role==='P'?TEAM.PLAYER:role==='H'?TEAM.ENEMY:role==='E'?TEAM.ENEMY:TEAM.NEUTRAL;
  const kind=(role==='P'||role==='H')?'hq':'factory';
  const q=team===TEAM.PLAYER?5:team===TEAM.ENEMY?(kind==='hq'?Math.min(5,cfg.initialEnemy+1):cfg.initialEnemy):0;
  const type=factoryType(level,i,team);
  let maxHp=kind==='hq'?(team===TEAM.PLAYER?cfg.playerCoreHp:cfg.enemyCoreHp):(410+level*7+(cfg.boss?35:0));
  nodes.push({id:\`N\${i}\`,index:i,nx,ny,x:0,y:0,team,kind,unitType:type,spawnQueue:q,spawnCooldown:.9+i*.08,productionTimer:0,captureTeam:null,captureProgress:0,maxHp,hp:maxHp});
 });
 const obstacles=Array.from({length:6+Math.floor(level/7)},()=>({x:.13+rand()*.74,y:.13+rand()*.74,r:13+rand()*12,rot:rand()*Math.PI}));
 return{level,config:cfg,title:cfg.title,biome:BIOMES[cfg.biome],nodes,edges:tpl.edges.map(e=>[...e]),roads:[],obstacles,individuals:[],squads:[],projectiles:[],particles:[],elapsed:0,aiThink:.8,idCounter:1,individualIdCounter:1,projectileIdCounter:1};
}`;
      corrected = replaceOne(corrected, /function makeLevel\(level\)\{[\s\S]*?\}\nfunction unitStats/, `${makeLevel}\nfunction unitStats`, 'generación de niveles');

      const unitStats = `function unitStats(type,team,level){const b=UNITS[type],cfg=levelConfig(level),ownLevel=team===TEAM.PLAYER?Math.max(1,save.unitLevels[type]||1):(level<=5?1:1+Math.floor((level-4)/5)),up=1+(ownLevel-1)*.12;return{level:ownLevel,hp:b.hp*up*(team===TEAM.ENEMY?cfg.enemyHp:1),damage:b.damage*up*(team===TEAM.ENEMY?cfg.enemyDamage:1),speed:b.speed*cfg.movement*(1+Math.min(.10,(ownLevel-1)*.015)),fireRate:b.fireRate,range:b.range,projectileSpeed:b.projectileSpeed};}`;
      corrected = replaceOne(corrected, /function unitStats\(type,team,level\)\{[\s\S]*?\}\nfunction resizeCanvas/, `${unitStats}\nfunction resizeCanvas`, 'movimiento por zona');

      const updateAI = `function updateAI(dt){
 if(game.elapsed<game.config.aiDelay)return;
 game.aiThink-=dt;if(game.aiThink>0)return;
 game.aiThink=Math.max(1.15,2.95-game.level*.048);
 const idle=game.squads.filter(s=>s.team===TEAM.ENEMY&&s.hp>0&&!s.route.length&&!s.combatTargetId);
 if(!idle.length)return;
 const neutralLeft=game.nodes.some(n=>n.team===TEAM.NEUTRAL);
 const enemyFactories=game.nodes.filter(n=>n.team===TEAM.ENEMY&&n.kind==='factory').length;
 const chooseFor=(s)=>{
  const snap=snapToRoad(s.x,s.y),cur=snap.progress<.5?snap.a:snap.b;
  let candidates=game.nodes.map(n=>({n,path:shortest(cur,n.index)})).filter(x=>x.n.team!==TEAM.ENEMY&&x.path.nodes.length>1);
  if(game.config.style==='cautious'&&neutralLeft)candidates=candidates.filter(x=>x.n.team===TEAM.NEUTRAL);
  candidates.sort((a,b)=>{
   const score=x=>{
    let v=x.path.cost;
    if(x.n.team===TEAM.NEUTRAL)v-=game.config.style==='cautious'?180:75;
    if(x.n.kind==='hq')v+=game.config.style==='elite'?-90:game.config.style==='aggressive'?-25:150;
    if(x.n.team===TEAM.PLAYER&&x.n.kind==='factory')v-=game.config.style==='elite'?85:game.config.style==='aggressive'?45:0;
    if(enemyFactories<1&&x.n.team===TEAM.NEUTRAL)v-=60;
    return v;
   };
   return score(a)-score(b);
  });
  return candidates[0]?.n||null;
 };
 if(game.config.style==='elite'&&idle.length>=2){const target=chooseFor(idle[0]);if(target){commandNode(idle[0],target);commandNode(idle[1],target);for(let i=2;i<idle.length;i++){const t=chooseFor(idle[i]);if(t)commandNode(idle[i],t);}return;}}
 for(const s of idle){const t=chooseFor(s);if(t)commandNode(s,t);}
}`;
      corrected = replaceOne(corrected, /function updateAI\(dt\)\{[\s\S]*?\}\nfunction updateMovement/, `${updateAI}\nfunction updateMovement`, 'IA por etapas');

      corrected = replaceOne(
        corrected,
        /function updateCapture\(dt\)\{[\s\S]*?\}\nfunction mergePair/,
        `function updateCapture(dt){const radius=50*scale(),captureTime=game.config.captureTime||2.6;for(const n of game.nodes){if(n.kind==='hq'||n.hp<=0)continue;const near=game.squads.filter(s=>s.hp>0&&dist(s,n)<=radius),teams=[...new Set(near.map(s=>s.team))];if(teams.length!==1){n.captureProgress=Math.max(0,n.captureProgress-dt*.6);if(n.captureProgress===0)n.captureTeam=null;continue;}const team=teams[0];if(team===n.team){n.captureProgress=0;n.captureTeam=null;continue;}n.captureTeam=team;n.captureProgress+=dt;if(n.captureProgress>=captureTime){n.team=team;n.spawnQueue=0;n.spawnCooldown=game.config.initialSpawnInterval;n.productionTimer=0;n.captureProgress=0;n.captureTeam=null;spawnBurst(n.x,n.y,TEAM_COLOR[team],10);if(team===TEAM.PLAYER)showToast(\`Fábrica \${UNITS[n.unitType].name} conquistada.\`);}}}\nfunction mergePair`,
        'captura por dificultad'
      );

      corrected = corrected.replace(
        "const reward=Math.round((90+game.level*18)*(first?1:.35)*(1+(stars-1)*.30));",
        "const reward=Math.round((90+game.level*18)*(game.config.rewardMultiplier||1)*(first?1:.35)*(1+(stars-1)*.30));"
      );

      const drawGround = `function drawGround(){
 ctx.fillStyle=game.biome.ground;ctx.fillRect(0,0,view.w,view.h);const s=scale(),name=game.biome.name;
 ctx.save();ctx.globalAlpha=.13;ctx.fillStyle=game.biome.ground2;
 if(name==='Ciudad'){
  ctx.strokeStyle=game.biome.ground2;ctx.lineWidth=1;for(let x=0;x<view.w;x+=48*s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,view.h);ctx.stroke();}for(let y=0;y<view.h;y+=48*s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(view.w,y);ctx.stroke();}
 }else if(name==='Bosque'){
  for(let y=18*s;y<view.h;y+=58*s)for(let x=12*s;x<view.w;x+=64*s){ctx.beginPath();ctx.arc(x+((y/58/s)%2)*22*s,y,12*s,0,Math.PI*2);ctx.fill();}
 }else if(name==='Nieve'){
  ctx.strokeStyle=game.biome.ground2;ctx.lineWidth=2*s;for(let y=14*s;y<view.h;y+=54*s)for(let x=8*s;x<view.w;x+=70*s){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12*s,y-5*s);ctx.stroke();}
 }else if(name==='Zona Élite'){
  ctx.strokeStyle=game.biome.ground2;ctx.lineWidth=1.2*s;for(let y=0;y<view.h;y+=56*s)for(let x=0;x<view.w;x+=64*s){ctx.beginPath();ctx.arc(x+(y/56/s%2)*32*s,y,14*s,0,Math.PI*2);ctx.stroke();}
 }else{
  const step=66*s;for(let y=0;y<view.h+step;y+=step)for(let x=0;x<view.w+step;x+=step){ctx.beginPath();ctx.ellipse(x+((y/step)%2)*step*.3,y,step*.32,step*.16,0,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}`;
      corrected = replaceOne(corrected, /function drawGround\(\)\{[\s\S]*?\}\nfunction drawRoads/, `${drawGround}\nfunction drawRoads`, 'terrenos por mundo');

      const drawObstacles = `function drawObstacles(){const s=scale(),name=game.biome.name;for(const o of game.obstacles){const x=o.x*view.w,y=o.y*view.h,r=o.r*s;if(game.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<r+52*s))continue;ctx.save();ctx.translate(x,y);ctx.rotate(o.rot);ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(3*s,6*s,r,r*.55,0,0,Math.PI*2);ctx.fill();if(name==='Bosque'){ctx.rotate(-o.rot);ctx.fillStyle='#315537';ctx.beginPath();ctx.arc(0,-r*.16,r*.72,0,Math.PI*2);ctx.fill();ctx.fillStyle='#203c28';ctx.fillRect(-2*s,r*.18,4*s,r*.72);}else if(name==='Ciudad'){ctx.fillStyle='#414951';ctx.beginPath();ctx.roundRect(-r*.75,-r*.58,r*1.5,r*1.16,3*s);ctx.fill();ctx.fillStyle='rgba(170,215,235,.18)';for(let yy=-r*.38;yy<r*.35;yy+=8*s)for(let xx=-r*.48;xx<r*.45;xx+=9*s)ctx.fillRect(xx,yy,3*s,3*s);}else if(name==='Nieve'){ctx.fillStyle='#71858b';ctx.beginPath();ctx.moveTo(-r, r*.28);ctx.lineTo(-r*.36,-r*.62);ctx.lineTo(r*.22,-r*.42);ctx.lineTo(r,r*.30);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.moveTo(-r*.36,-r*.62);ctx.lineTo(r*.22,-r*.42);ctx.lineTo(0,-r*.12);ctx.closePath();ctx.fill();}else if(name==='Zona Élite'){ctx.fillStyle='#35313e';ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.7,-r*.15);ctx.lineTo(r*.45,r*.70);ctx.lineTo(-r*.45,r*.70);ctx.lineTo(-r*.7,-r*.15);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(95,205,255,.38)';ctx.stroke();}else{ctx.fillStyle=game.biome.obstacle;ctx.beginPath();ctx.roundRect(-r,-r*.40,r*2,r*.80,r*.28);ctx.fill();ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.ellipse(-r*.25,-r*.12,r*.38,r*.11,0,0,Math.PI*2);ctx.fill();}ctx.restore();}}`;
      corrected = replaceOne(corrected, /function drawObstacles\(\)\{[\s\S]*?\}\nfunction drawRange/, `${drawObstacles}\nfunction drawRange`, 'obstáculos por mundo');

      corrected = corrected.replace(
        "ui.selectedLevelInfo.textContent=`Nivel ${save.currentLevel} · ${TITLES[save.currentLevel-1]} · ${WORLD_NAMES[wi]} · ${types}`;",
        "ui.selectedLevelInfo.textContent=`Nivel ${save.currentLevel} · ${TITLES[save.currentLevel-1]} · ${WORLD_NAMES[wi]} · ${levelConfig(save.currentLevel).mission} · ${types}`;"
      );

      const apiSource = `
function rbtwarUpgradeCost(type){const base={basic:45,fast:65,heavy:85,sniper:100}[type]||60,lv=Math.max(1,save.unitLevels[type]||1);return Math.round((base*Math.pow(lv,1.2))/5)*5;}
function rbtwarCatalog(){return UNIT_ORDER.map(type=>{const info=UNITS[type],level=Math.max(1,save.unitLevels[type]||1);return{type,name:info.name,short:info.short,unlock:info.unlock,level,maxLevel:5,cost:level>=5?null:rbtwarUpgradeCost(type),unlocked:save.unlockedLevel>=info.unlock,speed:info.speed,hp:info.hp,damage:info.damage,range:info.range,production:info.production};});}
window.RBTwarAPI={
 getState:()=>({coins:save.coins,stars:totalStars(),unlockedLevel:save.unlockedLevel,currentLevel:save.currentLevel,unitLevels:{...save.unitLevels},levelMeta:levelConfig(save.currentLevel),catalog:rbtwarCatalog()}),
 getCatalog:rbtwarCatalog,
 upgradeUnit:(type)=>{if(!UNIT_ORDER.includes(type))return{ok:false,reason:'invalid'};const info=UNITS[type];if(save.unlockedLevel<info.unlock)return{ok:false,reason:'locked',unlock:info.unlock};const level=Math.max(1,save.unitLevels[type]||1);if(level>=5)return{ok:false,reason:'max'};const cost=rbtwarUpgradeCost(type);if(save.coins<cost)return{ok:false,reason:'coins',cost,coins:save.coins};save.coins-=cost;save.unitLevels[type]=level+1;persist();window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI.getState()}));return{ok:true,type,level:level+1,cost,coins:save.coins};}
};
`;

      corrected = replaceOne(
        corrected,
        'game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);',
        `${apiSource}\ngame=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();window.dispatchEvent(new CustomEvent('rbtwar:ready',{detail:window.RBTwarAPI.getState()}));requestAnimationFrame(loop);`,
        'API de mejoras'
      );

      const script = document.createElement('script');
      script.textContent = corrected;
      document.head.appendChild(script);
    })
    .catch(error => {
      console.error(error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Error al cargar el motor del juego. Recarga la página.';
        toast.classList.add('show');
      }
    });
})();