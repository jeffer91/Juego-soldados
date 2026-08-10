(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const startBtn = $('startBtn');
  const campaignTab = $('campaignTab');
  const upgradesTab = $('upgradesTab');
  const campaignPanel = $('campaignPanel');
  const upgradesPanel = $('upgradesPanel');
  const biomeNames = {desert:'Desierto',canyon:'Cañón',forest:'Bosque',snow:'Nieve',city:'Ciudad',elite:'Élite'};
  let ready = false;

  function state(){ return window.RBTwarAPI?.getState?.() || null; }

  function setTab(name){
    const campaign = name === 'campaign';
    campaignTab?.classList.toggle('active', campaign);
    upgradesTab?.classList.toggle('active', !campaign);
    campaignPanel?.classList.toggle('hidden', !campaign);
    upgradesPanel?.classList.toggle('hidden', campaign);
  }

  function applyCompactState(){
    const s = state();
    if (!s) return;
    const level = Math.max(1, Number(s.currentLevel || 1));
    const max = Math.max(1, Number(s.unlockedLevel || 1));
    const meta = s.levelMeta || {};
    const title = meta.title || '';
    const biome = meta.biome || 'desert';

    document.body.dataset.biome = biome;
    const progress = $('startProgress'); if (progress) progress.textContent = 'Nv. ' + max;
    const coins = $('startCoins'); if (coins) coins.textContent = String(s.coins || 0);
    const info = $('selectedLevelInfo'); if (info) info.textContent = 'Nivel ' + level + (title ? ' · ' + title : '');
    const zone = $('campaignZone'); if (zone) zone.textContent = biomeNames[biome] || 'Zona';
    const fill = $('campaignProgressFill'); if (fill) fill.style.width = ((((level - 1) % 10) + 1) * 10) + '%';
    if (startBtn) {
      startBtn.textContent = 'JUGAR';
      startBtn.disabled = !ready;
    }
  }

  function cleanResult(){
    const modal = $('resultModal');
    if (!modal || modal.classList.contains('hidden')) return;
    const eyebrow = $('resultEyebrow');
    const title = $('resultTitle');
    const message = $('resultMessage');
    if (eyebrow?.textContent === 'DERROTA') {
      eyebrow.style.color = '#FF4757';
      if (title) title.textContent = 'CORE destruido';
      if (message) message.textContent = '';
    } else {
      if (eyebrow) eyebrow.style.color = '#2ED573';
      if (message && !/desbloquea/i.test(message.textContent)) message.textContent = '';
    }
  }

  function audit(){
    const ids = ['campaignTab','upgradesTab','startBtn','soundBtn','pauseBtn','resumeBtn','restartBtn','homeBtn','replayBtn','nextBtn','prevLevelBtn','nextUnlockedBtn','tutorialClose','cancelSelection'];
    const missing = ids.filter(id => !$(id));
    if (missing.length) console.warn('RBTwar: controles faltantes', missing);
    document.querySelectorAll('button').forEach(b => {
      b.type = 'button';
      if (b.dataset.v14Press) return;
      b.dataset.v14Press = '1';
      b.addEventListener('pointerdown', () => b.classList.add('pressed'));
      const clear = () => b.classList.remove('pressed');
      b.addEventListener('pointerup', clear);
      b.addEventListener('pointercancel', clear);
      b.addEventListener('pointerleave', clear);
    });
  }

  campaignTab?.addEventListener('click', () => setTab('campaign'));
  upgradesTab?.addEventListener('click', () => setTab('upgrades'));

  // Importante: JUGAR queda en manos del motor principal.
  // Antes esta capa capturaba el click y podía bloquear el listener real del juego.
  if (startBtn) {
    startBtn.textContent = 'JUGAR';
    startBtn.disabled = true;
  }

  const startScreen = $('startScreen');
  if (startScreen) new MutationObserver(() => {
    document.body.classList.toggle('menu-open', !startScreen.classList.contains('hidden'));
    if (!startScreen.classList.contains('hidden')) applyCompactState();
  }).observe(startScreen,{attributes:true,attributeFilter:['class']});

  const selectedInfo = $('selectedLevelInfo');
  if (selectedInfo) new MutationObserver(() => requestAnimationFrame(applyCompactState)).observe(selectedInfo,{childList:true,subtree:true,characterData:true});

  const resultModal = $('resultModal');
  if (resultModal) new MutationObserver(cleanResult).observe(resultModal,{attributes:true,attributeFilter:['class']});

  window.addEventListener('rbtwar:ready', () => {
    ready = true;
    document.body.classList.add('menu-open');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = 'JUGAR';
    }
    applyCompactState();
    audit();
    console.info('RBTwar UI lista');
  });
  window.addEventListener('rbtwar:state', () => requestAnimationFrame(applyCompactState));

  if (window.RBTwarAPI?.getState) {
    ready = true;
    if (startBtn) startBtn.disabled = false;
    applyCompactState();
  }

  setTab('campaign');
  audit();
})();
