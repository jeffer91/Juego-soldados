(() => {
  'use strict';

  const biomeNames = { desert:'Desierto', canyon:'Cañón', forest:'Bosque', snow:'Nieve', city:'Ciudad', elite:'Zona Élite' };
  const $ = id => document.getElementById(id);
  const campaignZone = $('campaignZone');
  const campaignProgressFill = $('campaignProgressFill');
  const startProgress = $('startProgress');
  const levelPath = $('levelPath');
  const progressLabel = document.querySelector('.campaign-progress small');

  function state() {
    try { return window.RBTwarAPI?.getState?.() || null; }
    catch (_) { return null; }
  }

  function refreshProgress() {
    const s = state();
    if (!s) return;
    const level = Math.max(1, Number(s.currentLevel || 1));
    const max = Math.max(1, Number(s.unlockedLevel || 1));
    const meta = s.levelMeta || {};
    const zoneText = `${biomeNames[meta.biome] || 'Zona'} · Nivel ${level}`;
    if (campaignZone && campaignZone.textContent !== zoneText) campaignZone.textContent = zoneText;
    if (campaignProgressFill) campaignProgressFill.style.width = `${(((level - 1) % 10) + 1) * 10}%`;
    if (progressLabel) progressLabel.textContent = 'CICLO DE 10 NIVELES';
    if (startProgress) startProgress.textContent = `Nivel máximo ${max}`;
    document.body.classList.toggle('boss-level', level % 10 === 0);
  }

  window.addEventListener('rbtwar:ready', refreshProgress);
  window.addEventListener('rbtwar:state', refreshProgress);
  levelPath?.addEventListener('click', () => setTimeout(refreshProgress, 0));
  refreshProgress();
})();
