(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const startButtons = ['startBtn','restartBtn','replayBtn','nextBtn','prevLevelBtn','nextUnlockedBtn'];
  let bound = false;

  function state() {
    try { return window.RBTwarAPI?.getState?.() || null; }
    catch (_) { return null; }
  }

  function sync() {
    const overlay = $('experienceOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (String($('experienceKicker')?.textContent || '').toUpperCase() !== 'NUEVA UNIDAD') return;
    const s = state();
    const level = Math.max(1, Number(s?.currentLevel || 1));
    const unit = (s?.catalog || []).find(u => Number(u.unlock) === level);
    if (!unit) return;
    const title = `Robot ${unit.name}`;
    const feature = `⚡ ${unit.name.toUpperCase()} DISPONIBLE`;
    if ($('experienceTitle')?.textContent !== title) $('experienceTitle').textContent = title;
    if ($('experienceFeature')?.textContent !== feature) $('experienceFeature').textContent = feature;
  }

  function bind() {
    if (bound) return;
    bound = true;
    for (const id of startButtons) {
      $(id)?.addEventListener('click', () => setTimeout(sync, 40));
    }
  }

  window.addEventListener('rbtwar:ready', () => {
    bind();
    setTimeout(sync, 0);
  });
  bind();
})();
