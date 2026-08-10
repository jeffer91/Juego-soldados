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

  // Cargamos v9 directamente y reconstruimos la cadena de parches.
  // Esto evita la cadena loader-v14 -> v10 -> v9 y, sobre todo,
  // fuerza una copia fresca de game-v7 para no reutilizar el rev=9 cacheado.
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
        '      corrected = window.RBTwarV10Patch(corrected, replaceOne);',
        '      corrected = window.RBTwarV11Patch(corrected, replaceOne);',
        '      corrected = window.RBTwarV12Patch(corrected, replaceOne);',
        '      corrected = window.RBTwarV13Patch(corrected, replaceOne);',
        '      corrected = window.RBTwarV14Patch(corrected, replaceOne);',
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
