(() => {
  'use strict';

  const info = {
    basic: { title: 'CAPTURADOR', text: 'Captura +35% · +15% contra estructuras', strong: 'Ideal para conquistar fábricas y CORE.' },
    fast: { title: 'CAZADOR', text: 'Ventaja contra Francotirador · débil contra Pesado', strong: 'Úsalo para cerrar distancias rápidamente.' },
    heavy: { title: 'BLINDADO', text: 'Ventaja contra Rápido · 15% blindaje · daño en área', strong: 'Excelente para romper grupos enemigos.' },
    sniper: { title: 'LARGO ALCANCE', text: 'Ventaja contra Pesado · débil contra Rápido', strong: 'Manténlo detrás de otros pelotones.' }
  };

  const $ = id => document.getElementById(id);
  const grid = $('upgradeGrid');
  const campaignZone = $('campaignZone');
  const campaignProgressFill = $('campaignProgressFill');
  const startProgress = $('startProgress');

  function state() { return window.RBTwarAPI?.getState?.() || null; }

  function decorateCards() {
    if (!grid) return;
    for (const [type, copy] of Object.entries(info)) {
      const card = grid.querySelector(`.unit-${type}`);
      if (!card || card.querySelector('.strategy-role')) continue;
      const role = document.createElement('div');
      role.className = 'strategy-role';
      role.innerHTML = `<small>${copy.title}</small><strong>${copy.text}</strong><span>${copy.strong}</span>`;
      const action = card.querySelector('.upgrade-buy');
      if (action) card.insertBefore(role, action);
      else card.appendChild(role);
    }
  }

  function refreshEndless() {
    const s = state();
    if (!s) return;
    const endless = s.currentLevel > 30;
    const unlocked = s.unlockedLevel > 30;
    if (campaignZone && endless) campaignZone.textContent = `∞ Frente ${s.currentLevel - 30}`;
    if (campaignProgressFill && unlocked) campaignProgressFill.style.width = '100%';
    document.body.classList.toggle('endless-unlocked', unlocked);
    if (startProgress && unlocked && !endless && !startProgress.textContent.includes('Frente')) {
      startProgress.textContent = `Campaña completa · Frente ${s.unlockedLevel - 30}`;
    }
  }

  function refresh() {
    requestAnimationFrame(() => {
      decorateCards();
      refreshEndless();
    });
  }

  window.addEventListener('rbtwar:ready', refresh);
  window.addEventListener('rbtwar:state', refresh);

  if (grid) new MutationObserver(refresh).observe(grid, { childList: true, subtree: true });

  refresh();
})();