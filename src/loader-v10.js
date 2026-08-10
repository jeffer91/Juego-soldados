(() => {
  'use strict';
  fetch('src/loader-v9.js?rev=10')
    .then(r => {
      if (!r.ok) throw new Error('No se pudo cargar RBTwar v10');
      return r.text();
    })
    .then(source => {
      let code = source
        .replace('playerProduction:world===4?.94:1,', 'playerProduction:world===4 ? .94 : 1,')
        .replace('enemyHp:early?.58+(level-1)*.085:1+Math.min(.50,(level-6)*.024)+(boss?.08:0),', 'enemyHp:early ? .58+(level-1)*.085 : 1+Math.min(.50,(level-6)*.024)+(boss ? .08 : 0),')
        .replace('enemyDamage:early?.54+(level-1)*.08:1+Math.min(.44,(level-6)*.020)+(boss?.06:0),', 'enemyDamage:early ? .54+(level-1)*.08 : 1+Math.min(.44,(level-6)*.020)+(boss ? .06 : 0),')
        .replace('movement:worldMove,captureTime:early?2.35:2.55+(boss?.25:0),rewardMultiplier:boss?1.30:1,difficulty:p};', 'movement:worldMove,captureTime:early ? 2.35 : 2.55+(boss ? .25 : 0),rewardMultiplier:boss ? 1.30 : 1,difficulty:p};');
      const anchor = '      const apiSource = `';
      if (!code.includes(anchor)) throw new Error('Extensión v10 no encontrada');
      code = code.replace(anchor, '      corrected = window.RBTwarV10Patch(corrected, replaceOne);\n\n' + anchor);
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(err => {
      console.error(err);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Error al preparar RBTwar v10. Recarga la página.';
        toast.classList.add('show');
      }
    });
})();