(() => {
  'use strict';

  fetch('src/loader-v10.js?rev=13')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v13 (${response.status})`);
      return response.text();
    })
    .then(source => {
      const oldLine = "code = code.replace(anchor, '      corrected = window.RBTwarV10Patch(corrected, replaceOne);\\n\\n' + anchor);";
      const newLine = "code = code.replace(anchor, '      corrected = window.RBTwarV10Patch(corrected, replaceOne);\\n      corrected = window.RBTwarV11Patch(corrected, replaceOne);\\n      corrected = window.RBTwarV12Patch(corrected, replaceOne);\\n      corrected = window.RBTwarV13Patch(corrected, replaceOne);\\n\\n' + anchor);";
      if (!source.includes(oldLine)) throw new Error('No se encontró el punto de extensión v10');
      const script = document.createElement('script');
      script.textContent = source.replace(oldLine, newLine);
      document.head.appendChild(script);
    })
    .catch(error => {
      console.error(error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Error al cargar RBTwar. Recarga la página.';
        toast.classList.add('show');
      }
    });
})();
