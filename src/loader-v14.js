(() => {
  'use strict';

  fetch('src/loader-v10.js?rev=14')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar (${response.status})`);
      return response.text();
    })
    .then(source => {
      const oldLine = "code = code.replace(anchor, '      corrected = window.RBTwarV10Patch(corrected, replaceOne);\\n\\n' + anchor);";
      const newLine = `code = code.replace(anchor, '      corrected = window.RBTwarV10Patch(corrected, replaceOne);\\n      try{corrected=window.RBTwarV11Patch(corrected,replaceOne);}catch(e){console.warn("RBTwar v11 omitido",e);}\\n      try{corrected=window.RBTwarV12Patch(corrected,replaceOne);}catch(e){console.warn("RBTwar v12 omitido",e);}\\n      try{corrected=window.RBTwarV13Patch(corrected,replaceOne);}catch(e){console.warn("RBTwar v13 omitido",e);}\\n      try{corrected=window.RBTwarV14Patch(corrected,replaceOne);}catch(e){console.warn("RBTwar v14 omitido",e);}\\n\\n' + anchor);`;
      if (!source.includes(oldLine)) throw new Error('No se encontró el punto de extensión del motor');
      const script = document.createElement('script');
      script.textContent = source.replace(oldLine, newLine);
      document.head.appendChild(script);
    })
    .catch(error => {
      console.error(error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'No se pudo iniciar el juego. Recarga la página.';
        toast.classList.add('show');
      }
    });
})();
