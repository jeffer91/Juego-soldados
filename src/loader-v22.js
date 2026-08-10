(() => {
  'use strict';

  const VERSION = '22';
  const SOURCE_URL = `src/loader-v21.js?v=${VERSION}`;

  function fail(error) {
    console.error('RBTwar v22 no pudo preparar el motor:', error);
    const toast = document.getElementById('toast');
    const btn = document.getElementById('startBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ERROR'; }
    if (toast) {
      toast.textContent = 'Error al iniciar RBTwar. Revisa la consola.';
      toast.classList.add('show');
    }
  }

  console.info('RBTwar bootstrap v22');

  fetch(SOURCE_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Bootstrap base HTTP ${r.status}`);
      return r.text();
    })
    .then(source => {
      let outer = source.replace(/\r\n?/g, '\n');

      outer = outer
        .replace("const VERSION = '21';", "const VERSION = '22';")
        .replaceAll('RBTwar v21', 'RBTwar v22')
        .replaceAll('bootstrap v21', 'bootstrap v22')
        .replaceAll('motor v21 listo', 'motor v22 listo')
        .replaceAll('v21-controls', 'v22-controls')
        .replace("rbtwar-save-v21',MAX_LEVEL", "rbtwar-save-v22',MAX_LEVEL")
        .replace("'rbtwar-save-v20','rbtwar-save-v19'", "'rbtwar-save-v21','rbtwar-save-v20','rbtwar-save-v19'");

      const injectionPoint = "      try { new Function(loader); }";
      if (!outer.includes(injectionPoint)) throw new Error('No se encontró el punto de validación v21');

      const persistentOrderBuilder = String.raw`
      // v22: el combate es una interrupción temporal, no cancela la orden manual.
      const missionMarker = '      const apiBlock = \`';
      if (!loader.includes(missionMarker)) throw new Error('No se encontró el punto para órdenes persistentes v22');

      const missionRuntime = \`
// Orden principal persistente: una pelea en el camino no borra el destino dado por el jugador.
const __rbtwarCommandNodeBase=commandNode;
const __rbtwarCommandRoadBase=commandRoad;
const __rbtwarCommandAllyBase=commandAlly;

function __rbtwarRememberNodeMission(s,n){
 if(s&&s.team===TEAM.PLAYER&&n)s._primaryMission={kind:'node',nodeId:n.id};
}
function __rbtwarRememberRoadMission(s,snap){
 if(!s||s.team!==TEAM.PLAYER||!snap)return;
 s._primaryMission={kind:'road',roadIndex:snap.roadIndex,a:snap.a,b:snap.b,progress:snap.progress,along:snap.along,x:snap.x,y:snap.y};
}
commandNode=function(s,n){
 const out=__rbtwarCommandNodeBase.apply(this,arguments);
 __rbtwarRememberNodeMission(s,n);
 return out;
};
commandRoad=function(s,snap){
 const out=__rbtwarCommandRoadBase.apply(this,arguments);
 __rbtwarRememberRoadMission(s,snap);
 return out;
};
commandAlly=function(s){
 if(s&&s.team===TEAM.PLAYER)s._primaryMission=null;
 return __rbtwarCommandAllyBase.apply(this,arguments);
};

function __rbtwarMissionArrived(s,m){
 if(!s||!m)return true;
 if(m.kind==='node'){
  const n=getNode(m.nodeId);
  return !n||dist(s,n)<=34*scale();
 }
 if(m.kind==='road')return Math.hypot(s.x-m.x,s.y-m.y)<=24*scale();
 return true;
}
function __rbtwarResumePrimaryOrders(){
 if(!game)return;
 for(const s of game.squads){
  if(!s||s.team!==TEAM.PLAYER||s.hp<=0||!s._primaryMission)continue;
  const m=s._primaryMission;
  if(__rbtwarMissionArrived(s,m)){s._primaryMission=null;continue;}
  if(s.combatTargetId)continue;
  const moving=Array.isArray(s.route)&&s.route.length>0;
  const hasMovementOrder=Boolean(s.order&&(s.order.kind==='node'||s.order.kind==='road'||s.order.kind==='move'));
  if(moving||hasMovementOrder)continue;
  if(m.kind==='node'){
   const n=getNode(m.nodeId);
   if(n)__rbtwarCommandNodeBase(s,n);
   else s._primaryMission=null;
  }else if(m.kind==='road'){
   __rbtwarCommandRoadBase(s,{roadIndex:m.roadIndex,a:m.a,b:m.b,progress:m.progress,along:m.along,x:m.x,y:m.y,dist:0},'road');
  }
 }
}
const __rbtwarUpdateCombatBase=updateCombat;
updateCombat=function(dt){
 const out=__rbtwarUpdateCombatBase.apply(this,arguments);
 __rbtwarResumePrimaryOrders();
 return out;
};
\`;

      const missionBuilder =
        "      const missionRuntime = " + JSON.stringify(missionRuntime) + ";\n" +
        "      code = replaceRequired(code,\\\"canvas.addEventListener('pointerdown',onDown);\\\",missionRuntime+\\\"\\\\ncanvas.addEventListener('pointerdown',onDown);\\\",'órdenes persistentes tras combate');";

      loader = loader.replace(missionMarker, missionBuilder + '\n\n' + missionMarker);
`;

      outer = outer.replace(injectionPoint, persistentOrderBuilder + '\n' + injectionPoint);

      try { new Function(outer); }
      catch (e) { throw new Error(`Sintaxis bootstrap v22: ${e.message}`); }

      const script = document.createElement('script');
      script.dataset.rbtwarBootstrap = 'v22';
      script.textContent = outer;
      document.head.appendChild(script);
    })
    .catch(fail);
})();