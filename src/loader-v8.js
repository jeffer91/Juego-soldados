(() => {
  'use strict';

  fetch('src/game-v7.js?rev=8')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v8 (${response.status})`);
      return response.text();
    })
    .then(source => {
      let corrected = source
        .replace('enemyHp:early?.60+', 'enemyHp:early ? .60 +')
        .replace('enemyDamage:early?.56+', 'enemyDamage:early ? .56 +')
        .replace("const STORAGE_KEY='rbtwar-save-v7',MAX_LEVEL=30;", "const STORAGE_KEY='rbtwar-save-v8',MAX_LEVEL=30;")
        .replace("for(const key of [STORAGE_KEY,'rbtwar-save-v6'", "for(const key of [STORAGE_KEY,'rbtwar-save-v7','rbtwar-save-v6'")
        .replace(
          "function productionInterval(n){return UNITS[n.unitType].production*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);}",
          "function productionInterval(n){const lv=Math.max(1,save.unitLevels[n.unitType]||1),boost=n.team===TEAM.PLAYER?Math.max(.72,1-(lv-1)*.07):1;return UNITS[n.unitType].production*boost*(n.team===TEAM.ENEMY?game.config.enemyProduction:game.config.playerProduction);}"
        );

      const apiSource = `
function rbtwarUpgradeCost(type){const base={basic:45,fast:65,heavy:85,sniper:100}[type]||60,lv=Math.max(1,save.unitLevels[type]||1);return Math.round((base*Math.pow(lv,1.2))/5)*5;}
function rbtwarCatalog(){return UNIT_ORDER.map(type=>{const info=UNITS[type],level=Math.max(1,save.unitLevels[type]||1);return{type,name:info.name,short:info.short,unlock:info.unlock,level,maxLevel:5,cost:level>=5?null:rbtwarUpgradeCost(type),unlocked:save.unlockedLevel>=info.unlock,speed:info.speed,hp:info.hp,damage:info.damage,range:info.range,production:info.production};});}
window.RBTwarAPI={
 getState:()=>({coins:save.coins,stars:totalStars(),unlockedLevel:save.unlockedLevel,currentLevel:save.currentLevel,unitLevels:{...save.unitLevels},catalog:rbtwarCatalog()}),
 getCatalog:rbtwarCatalog,
 upgradeUnit:(type)=>{if(!UNIT_ORDER.includes(type))return{ok:false,reason:'invalid'};const info=UNITS[type];if(save.unlockedLevel<info.unlock)return{ok:false,reason:'locked',unlock:info.unlock};const level=Math.max(1,save.unitLevels[type]||1);if(level>=5)return{ok:false,reason:'max'};const cost=rbtwarUpgradeCost(type);if(save.coins<cost)return{ok:false,reason:'coins',cost,coins:save.coins};save.coins-=cost;save.unitLevels[type]=level+1;persist();window.dispatchEvent(new CustomEvent('rbtwar:state',{detail:window.RBTwarAPI.getState()}));return{ok:true,type,level:level+1,cost,coins:save.coins};}
};
`;

      corrected = corrected.replace(
        'game=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();requestAnimationFrame(loop);',
        `${apiSource}\ngame=makeLevel(save.currentLevel);resizeCanvas();refreshHud();refreshStartScreen();showStart();window.dispatchEvent(new CustomEvent('rbtwar:ready',{detail:window.RBTwarAPI.getState()}));requestAnimationFrame(loop);`
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
