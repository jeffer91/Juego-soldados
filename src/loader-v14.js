(() => {
  'use strict';

  const showLoadError = (error) => {
    console.error(error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'No se pudo iniciar el juego. Recarga la página.';
      toast.classList.add('show');
    }
  };

  // Bootstrap directo: evita loaders encadenados y obliga a leer una copia fresca
  // del motor base. El error visto en consola venía del game-v7 antiguo cacheado.
  fetch('src/loader-v9.js?rev=15', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar el motor base (${response.status})`);
      return response.text();
    })
    .then(source => {
      let code = source
        .replace("fetch('src/game-v7.js?rev=9')", "fetch('src/game-v7.js?rev=15', { cache: 'no-store' })")
        .replace('playerProduction:world===4?.94:1,', 'playerProduction:world===4 ? .94 : 1,')
        .replace('enemyHp:early?.58+(level-1)*.085:1+Math.min(.50,(level-6)*.024)+(boss?.08:0),', 'enemyHp:early ? .58+(level-1)*.085 : 1+Math.min(.50,(level-6)*.024)+(boss ? .08 : 0),')
        .replace('enemyDamage:early?.54+(level-1)*.08:1+Math.min(.44,(level-6)*.020)+(boss?.06:0),', 'enemyDamage:early ? .54+(level-1)*.08 : 1+Math.min(.44,(level-6)*.020)+(boss ? .06 : 0),')
        .replace('movement:worldMove,captureTime:early?2.35:2.55+(boss?.25:0),rewardMultiplier:boss?1.30:1,difficulty:p};', 'movement:worldMove,captureTime:early ? 2.35 : 2.55+(boss ? .25 : 0),rewardMultiplier:boss ? 1.30 : 1,difficulty:p};');

      const anchor = '      const apiSource = `';
      if (!code.includes(anchor)) throw new Error('No se encontró el punto de extensión del motor');

      const patches = [
        "      try{corrected=window.RBTwarV10Patch(corrected,replaceOne);}catch(e){console.warn('RBTwar v10 omitido',e);}",
        "      try{corrected=window.RBTwarV11Patch(corrected,replaceOne);}catch(e){console.warn('RBTwar v11 omitido',e);}",
        "      try{corrected=window.RBTwarV12Patch(corrected,replaceOne);}catch(e){console.warn('RBTwar v12 omitido',e);}",
        "      try{corrected=window.RBTwarV13Patch(corrected,replaceOne);}catch(e){console.warn('RBTwar v13 omitido',e);}",
        "      try{corrected=window.RBTwarV14Patch(corrected,replaceOne);}catch(e){console.warn('RBTwar v14 omitido',e);}",
        ''
      ].join('\n');

      code = code.replace(anchor, patches + anchor);
      const script = document.createElement('script');
      script.dataset.rbtwarEngine = 'v14-fixed';
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(showLoadError);
})();
