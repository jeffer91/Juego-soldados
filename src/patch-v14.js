(() => {
  'use strict';

  window.RBTwarV14Patch = (corrected) => {
    corrected = corrected.replace("ui.startBtn.textContent='JUGAR NIVEL '+current;", "ui.startBtn.textContent='JUGAR';");
    corrected = corrected.replace("ui.startBtn.textContent=`JUGAR NIVEL ${save.currentLevel}`;", "ui.startBtn.textContent='JUGAR';");

    corrected = corrected.replace(
      ' getCatalog:rbtwarCatalog,',
      " getCatalog:rbtwarCatalog,\n startLevel:(level)=>{const next=Math.max(1,Math.min(save.unlockedLevel,Number(level||save.currentLevel)||1));startLevel(next);return true;},\n showHome:()=>{showStart();return true;},\n restartLevel:()=>{if(game){startLevel(game.level);return true;}return false;},"
    );

    return corrected;
  };
})();
