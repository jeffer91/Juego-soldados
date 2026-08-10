(() => {
  'use strict';

  const BOOT_VERSION = '17';
  const showLoadError = (error) => {
    console.error(error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'No se pudo iniciar el juego. Recarga la página.';
      toast.classList.add('show');
    }
  };

  console.info(`RBTwar bootstrap v${BOOT_VERSION}`);

  fetch(`src/loader-v9.js?rev=${BOOT_VERSION}`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar el motor base (${response.status})`);
      return response.text();
    })
    .then(source => {
      let code = source;

      // 1) Forzar siempre una copia fresca del motor base.
      code = code.replace(
        /fetch\('src\/game-v7\.js\?rev=9'\)/,
        `fetch('src/game-v7.js?rev=${BOOT_VERSION}', { cache: 'no-store' })`
      );

      // 2) El loader v9 antiguo detenía TODO el juego si una mejora de texto no coincidía.
      //    Sustituimos el bloque completo por una versión tolerante. Así una mejora opcional
      //    puede omitirse sin impedir que aparezca el mapa ni que funcione JUGAR.
      const brittleHelpers = /const fail = \(message\) => \{[\s\S]*?\};\s*const replaceOne = \(source, pattern, replacement, label\) => \{[\s\S]*?return next;\s*\};/;
      const safeHelpers = `const fail = (message) => { console.warn(\`RBTwar v9: \${message}\`); };
  const replaceOne = (source, pattern, replacement, label) => {
    let next = source;
    try { next = source.replace(pattern, replacement); }
    catch (error) { console.warn(\`RBTwar v9: se omitió \${label}\`, error); return source; }
    if (next === source) console.warn(\`RBTwar v9: se omitió \${label}\`);
    return next;
  };`;
      if (!brittleHelpers.test(code)) throw new Error('No se encontró el bloque de compatibilidad del loader v9');
      code = code.replace(brittleHelpers, safeHelpers);

      // 3) Normalizar saltos de línea antes de ejecutar las expresiones regulares heredadas.
      //    Evita que \r\n / \n hagan fallar reemplazos como "plantillas de mapas".
      const sourceStart = ".then(source => {\n      let corrected = source";
      if (code.includes(sourceStart)) {
        code = code.replace(
          sourceStart,
          ".then(source => {\n      source = source.replace(/\\r\\n?/g, '\\n');\n      let corrected = source"
        );
      } else {
        console.warn('RBTwar: no se encontró el punto de normalización de líneas');
      }

      // 4) Correcciones de sintaxis heredadas del generador v9.
      code = code
        .replace('playerProduction:world===4?.94:1,', 'playerProduction:world===4 ? .94 : 1,')
        .replace('enemyHp:early?.58+(level-1)*.085:1+Math.min(.50,(level-6)*.024)+(boss?.08:0),', 'enemyHp:early ? .58+(level-1)*.085 : 1+Math.min(.50,(level-6)*.024)+(boss ? .08 : 0),')
        .replace('enemyDamage:early?.54+(level-1)*.08:1+Math.min(.44,(level-6)*.020)+(boss?.06:0),', 'enemyDamage:early ? .54+(level-1)*.08 : 1+Math.min(.44,(level-6)*.020)+(boss ? .06 : 0),')
        .replace('movement:worldMove,captureTime:early?2.35:2.55+(boss?.25:0),rewardMultiplier:boss?1.30:1,difficulty:p};', 'movement:worldMove,captureTime:early ? 2.35 : 2.55+(boss ? .25 : 0),rewardMultiplier:boss ? 1.30 : 1,difficulty:p};');

      // 5) Aplicar mejoras posteriores sin dejar que una versión opcional tumbe el motor.
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
      script.dataset.rbtwarEngine = `v14-fixed-${BOOT_VERSION}`;
      script.textContent = code;
      document.head.appendChild(script);
    })
    .catch(showLoadError);
})();
