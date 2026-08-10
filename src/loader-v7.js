(() => {
  'use strict';
  fetch('src/game-v7.js?rev=7')
    .then(response => {
      if (!response.ok) throw new Error(`No se pudo cargar RBTwar v7 (${response.status})`);
      return response.text();
    })
    .then(source => {
      const corrected = source
        .replace('enemyHp:early?.60+', 'enemyHp:early ? .60 +')
        .replace('enemyDamage:early?.56+', 'enemyDamage:early ? .56 +');
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
