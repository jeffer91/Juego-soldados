(() => {
  'use strict';

  fetch('src/loader-v11.js?rev=12')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v12 (${response.status})`);
      return response.text();
    })
    .then(source => {
      const oldText = "corrected = window.RBTwarV11Patch(corrected, replaceOne);\\n\\n' + anchor);";
      const newText = "corrected = window.RBTwarV11Patch(corrected, replaceOne);\\n      corrected = window.RBTwarV12Patch(corrected, replaceOne);\\n\\n' + anchor);";
      if (!source.includes(oldText)) throw new Error('No se encontró el punto de extensión v11');
      const script = document.createElement('script');
      script.textContent = source.replace(oldText, newText);
      document.head.appendChild(script);
    })
    .catch(error => {
      console.error(error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Error al preparar RBTwar v12. Recarga la página.';
        toast.classList.add('show');
      }
    });
})();