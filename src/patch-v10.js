(() => {
  'use strict';

  window.RBTwarV10Patch = (corrected, replaceOne) => {
    corrected = corrected.replace('projectileIdCounter:1};', 'projectileIdCounter:1,shake:0,flash:0};');

    const allySupport = `function commandAlly(s,a){
 if(!s||!a||s.id===a.id)return;
 const mergeable=s.type===a.type&&a.count<5;
 s.order={kind:'ally',targetId:a.id,repath:0,mode:mergeable?'merge':'support'};
 s.combatTargetId=null;
 repathAlly(s,a);
}
function repathAlly(s,a){s.route=routeBetween(snapToRoad(s.x,s.y),snapToRoad(a.x,a.y));if(s.order)s.order.repath=.30;}
function supportDistance(s,a){return bodyRadius(s)+bodyRadius(a)+18*scale();}
function holdSupportPosition(s,a){
 const wanted=supportDistance(s,a),dx=s.x-a.x,dy=s.y-a.y,d=Math.hypot(dx,dy)||1;
 if(d<wanted*.70){s.x=a.x+dx/d*wanted;s.y=a.y+dy/d*wanted;}
 s.route=[];
}`;
    corrected = replaceOne(
      corrected,
      /function commandAlly\(s,a\)\{[\s\S]*?\}\nfunction repathAlly\(s,a\)\{[\s\S]*?\}\nfunction productionInterval/,
      `${allySupport}\nfunction productionInterval`,
      'apoyo entre pelotones'
    );

    const movement = `function updateMovement(dt){
 for(const s of game.squads){
  s.bob+=dt*4;
  if(s.hp<=0||s.combatTargetId)continue;
  if(s.order?.kind==='ally'){
   const a=getSquad(s.order.targetId);
   if(!a||a.hp<=0||a.team!==s.team){s.order=null;s.route=[];}
   else{
    const close=dist(s,a)<=supportDistance(s,a)+10*scale();
    if(close){
     if(s.order.mode==='merge'&&s.type===a.type&&a.count<5){
      mergePair(s,a,false);
      if(s.hp<=0||s.count<=0)continue;
      s.order={kind:'ally',targetId:a.id,repath:.28,mode:'support'};
     }
     holdSupportPosition(s,a);
     s.order.repath-=dt;
     if(dist(s,a)>supportDistance(s,a)+24*scale()||s.order.repath<=0){repathAlly(s,a);}
     continue;
    }
    s.order.repath-=dt;
    if(s.order.repath<=0)repathAlly(s,a);
   }
  }
  if(!s.route.length)continue;
  const t=s.route[0],dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy),step=s.speed*dt;
  if(d<=step+2){s.x=t.x;s.y=t.y;s.route.shift();if(!s.route.length&&s.order?.kind!=='ally')s.order=null;}
  else{s.x+=dx/d*step;s.y+=dy/d*step;}
 }
}`;
    corrected = replaceOne(
      corrected,
      /function updateMovement\(dt\)\{[\s\S]*?\}\nfunction bodyRadius/,
      `${movement}\nfunction bodyRadius`,
      'movimiento de apoyo'
    );

    const targeting = `function nearestEnemy(s){
 let target=null,best=Infinity;
 const allies=game.squads.filter(a=>a.team===s.team&&a.hp>0&&dist(a,s)<=190*scale());
 const focused=new Set(allies.map(a=>a.combatTargetId).filter(Boolean));
 const allyIds=new Set(allies.map(a=>a.id));
 for(const o of game.squads){
  if(o.team===s.team||o.hp<=0)continue;
  const d=effectiveDistance(s,o);if(d>s.range)continue;
  let score=d;
  if(focused.has(o.id))score-=42*scale();
  if(o.combatTargetId&&allyIds.has(o.combatTargetId))score-=28*scale();
  if(o.type==='sniper')score-=8*scale();
  if(score<best){best=score;target=o;}
 }
 return target;
}`;
    corrected = replaceOne(
      corrected,
      /function nearestEnemy\(s\)\{[\s\S]*?\}\nfunction nodeUnder/,
      `${targeting}\nfunction nodeUnder`,
      'fuego coordinado'
    );

    const volley = `function fireVolley(shooter,target,targetType){
 const shots=Math.min(shooter.type==='sniper'?1:shooter.type==='heavy'?2:3,shooter.count),mult=targetType==='node'?.34:.46,total=shooter.damage*shooter.count*mult,spread=formation(shots,9*scale());
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
      'feedback de disparos'
    );

    const hit = `function applyHit(p,t){
 t.hp-=p.damage;
 if(p.targetType==='squad'){
  syncCount(t);
  if(t.hp<=0){explodeAt(t.x,t.y,TEAM_COLOR[t.team],1.05);}
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
      'destrucción mejorada'
    );

    const capture = `function updateCapture(dt){
 const radius=50*scale(),captureTime=game.config.captureTime||2.6;
 for(const n of game.nodes){
  if(n.kind==='hq'||n.hp<=0)continue;
  const near=game.squads.filter(s=>s.hp>0&&dist(s,n)<=radius),teams=[...new Set(near.map(s=>s.team))];
  if(teams.length!==1){n.captureProgress=Math.max(0,n.captureProgress-dt*.6);if(n.captureProgress===0)n.captureTeam=null;continue;}
  const team=teams[0];
  if(team===n.team){n.captureProgress=0;n.captureTeam=null;continue;}
  n.captureTeam=team;n.captureProgress+=dt;
  if(n.captureProgress>=captureTime){
   n.team=team;n.spawnQueue=0;n.spawnCooldown=game.config.initialSpawnInterval;n.productionTimer=0;n.captureProgress=0;n.captureTeam=null;
   spawnBurst(n.x,n.y,TEAM_COLOR[team],14);game.shake=Math.max(game.shake||0,.08);
   window.dispatchEvent(new CustomEvent('rbtwar:capture',{detail:{team,type:n.unitType}}));
   if(team===TEAM.PLAYER)showToast(\`Fábrica \${UNITS[n.unitType].name} conquistada.\`);
  }
 }
}`;
    corrected = replaceOne(
      corrected,
      /function updateCapture\(dt\)\{[\s\S]*?\}\nfunction mergePair/,
      `${capture}\nfunction mergePair`,
      'feedback de captura'
    );

    const particles = `function updateParticles(dt){
 if(game.shake>0)game.shake=Math.max(0,game.shake-dt);
 if(game.flash>0)game.flash=Math.max(0,game.flash-dt);
 for(const p of game.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}
 game.particles=game.particles.filter(p=>p.life>0);
}`;
    corrected = replaceOne(
      corrected,
      /function updateParticles\(dt\)\{[\s\S]*?\}\nfunction cleanup/,
      `${particles}\nfunction cleanup`,
      'sacudida de cámara'
    );

    const explosion = `function explodeAt(x,y,color,intensity=1){
 const count=Math.round(10+intensity*12);
 for(let i=0;i<count;i++){
  const a=Math.random()*Math.PI*2,s=(28+Math.random()*78)*intensity;
  game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.28+Math.random()*.38,maxLife:.66,color:i%3===0?'#ffd47b':color,size:2.2+Math.random()*2.8*intensity});
 }
 game.shake=Math.max(game.shake||0,.10*intensity);
 if(intensity>1.8)game.flash=Math.max(game.flash||0,.14);
 window.dispatchEvent(new CustomEvent('rbtwar:explosion',{detail:{intensity}}));
}
function spawnMuzzle`;
    corrected = replaceOne(corrected, /function spawnMuzzle/, explosion, 'explosiones');

    const bases = `function drawBases(){
 const s=scale(),captureTime=game.config.captureTime||2.6;
 for(const n of game.nodes){
  const c=TEAM_COLOR[n.team];n.kind==='hq'?drawCastle(n,c,s):drawFactory(n,c,s);
  if(n.captureTeam){
   const r=(n.kind==='hq'?57:49)*s,p=clamp(n.captureProgress/captureTime,0,1),pulse=1+Math.sin(game.elapsed*8)*.035;
   ctx.save();ctx.translate(n.x,n.y);ctx.strokeStyle=TEAM_COLOR[n.captureTeam];ctx.lineWidth=5*s;ctx.shadowColor=TEAM_COLOR[n.captureTeam];ctx.shadowBlur=8*s;
   ctx.beginPath();ctx.arc(0,0,r*pulse,-Math.PI/2,-Math.PI/2+Math.PI*2*p);ctx.stroke();ctx.shadowBlur=0;
   ctx.fillStyle='rgba(4,12,18,.86)';ctx.beginPath();ctx.roundRect(-34*s,-58*s,68*s,16*s,7*s);ctx.fill();
   ctx.fillStyle='#f3fbff';ctx.font=\`900 \${7.6*s}px system-ui\`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(\`CAPTURANDO \${Math.round(p*100)}%\`,0,-50*s);ctx.restore();
  }
  drawBadge(n,s);
 }
}`;
    corrected = replaceOne(
      corrected,
      /function drawBases\(\)\{[\s\S]*?\}\nfunction drawRobot/,
      `${bases}\nfunction drawRobot`,
      'indicador de captura'
    );

    const draw = `function draw(){
 if(!game)return;
 ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.save();
 if(game.shake>0){const amp=8*clamp(game.shake/.18,0,1)*scale();ctx.translate((Math.random()-.5)*amp,(Math.random()-.5)*amp);}
 drawGround();drawRoads();drawObstacles();drawRange();drawCommand();drawBases();drawIndividuals();drawSquads();drawProjectiles();drawParticles();ctx.restore();
 if(game.flash>0){ctx.save();ctx.globalAlpha=clamp(game.flash/.14,0,1)*.12;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,view.w,view.h);ctx.restore();}
}`;
    corrected = replaceOne(
      corrected,
      /function draw\(\)\{[\s\S]*?\}\nfunction pointerPos/,
      `${draw}\nfunction pointerPos`,
      'cámara de combate'
    );

    corrected = corrected.replace(
      "function winLevel(){if(ended)return;ended=true;",
      "function winLevel(){if(ended)return;ended=true;window.dispatchEvent(new CustomEvent('rbtwar:victory'));"
    );
    corrected = corrected.replace(
      "function loseLevel(){if(ended)return;ended=true;",
      "function loseLevel(){if(ended)return;ended=true;window.dispatchEvent(new CustomEvent('rbtwar:defeat'));"
    );

    corrected = corrected.replace('const radius=74*scale();return game.squads', 'const radius=82*scale();return game.squads');
    corrected = corrected.replace('if(snap&&snap.dist<=58*scale())', 'if(snap&&snap.dist<=64*scale())');

    return corrected;
  };
})();