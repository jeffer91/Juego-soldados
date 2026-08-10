(() => {
  'use strict';

  fetch('src/loader-v11.js?rev=12')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v12 (${response.status})`);
      return response.text();
    })
    .then(source => {
      const marker = 'corrected = window.RBTwarV11Patch(corrected, replaceOne);';
      if (!source.includes(marker)) throw new Error('No se encontró el punto de extensión v11');
      const insertion = '\\\\n      corrected = window.RBTwarV12Patch(corrected, replaceOne);';
      const script = document.createElement('script');
      script.textContent = source.replace(marker, marker + insertion);
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