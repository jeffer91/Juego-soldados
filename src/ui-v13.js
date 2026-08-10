(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const essentialButtons = ['campaignTab','upgradesTab','startBtn','pauseBtn','soundBtn','resumeBtn','restartBtn','homeBtn','replayBtn','nextBtn','prevLevelBtn','nextUnlockedBtn','tutorialClose','cancelSelection'];

  function compactStartButton() {
    const b = $('startBtn');
    if (!b) return;
    const m = b.textContent.match(/(\d+)/);
    if (m) b.textContent = `JUGAR ${m[1]}`;
  }

  function compactResult() {
    const modal = $('resultModal');
    if (!modal || modal.classList.contains('hidden')) return;
    const eyebrow = $('resultEyebrow');
    const title = $('resultTitle');
    const message = $('resultMessage');
    if (eyebrow?.textContent === 'DERROTA') {
      if (title) title.textContent = 'CORE destruido';
      if (message) message.textContent = '';
    } else if (eyebrow?.textContent === 'VICTORIA') {
      if (message && !/desbloquea/i.test(message.textContent)) message.textContent = '';
    }
  }

  function polishStaticText() {
    if ($('campaignTab')) $('campaignTab').textContent = 'NIVELES';
    if ($('upgradesTab')) $('upgradesTab').textContent = 'MEJORAS';
    const close = $('tutorialClose'); if (close) close.textContent = 'OK';
    const cancel = $('cancelSelection'); if (cancel) cancel.setAttribute('aria-label','Cerrar selección');
    compactStartButton();
  }

  function installPressFeedback() {
    document.querySelectorAll('button').forEach(button => {
      if (button.dataset.pressReady) return;
      button.dataset.pressReady = '1';
      button.addEventListener('pointerdown', () => button.classList.add('pressed'));
      const clear = () => button.classList.remove('pressed');
      button.addEventListener('pointerup', clear);
      button.addEventListener('pointercancel', clear);
      button.addEventListener('pointerleave', clear);
    });
  }

  function auditButtons() {
    const missing = essentialButtons.filter(id => !$(id));
    if (missing.length) console.warn('RBTwar UI: faltan controles', missing);
    for (const id of essentialButtons) {
      const b = $(id);
      if (!b) continue;
      b.type = 'button';
      b.dataset.control = id;
    }
  }

  polishStaticText();
  auditButtons();
  installPressFeedback();

  const startBtn = $('startBtn');
  if (startBtn) new MutationObserver(compactStartButton).observe(startBtn,{childList:true,characterData:true,subtree:true});
  const levelInfo = $('selectedLevelInfo');
  if (levelInfo) new MutationObserver(compactStartButton).observe(levelInfo,{childList:true,characterData:true,subtree:true});
  const resultModal = $('resultModal');
  if (resultModal) new MutationObserver(compactResult).observe(resultModal,{attributes:true,attributeFilter:['class']});

  window.addEventListener('rbtwar:ready', () => {
    polishStaticText();
    auditButtons();
    installPressFeedback();
  });
})();
