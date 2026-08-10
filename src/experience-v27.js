(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const startButtons = ['startBtn','restartBtn','replayBtn','nextBtn','prevLevelBtn','nextUnlockedBtn'];
  let initialized = false;
  let resultVisible = false;
  let tutorialWasOpen = false;

  function createOverlay() {
    if ($('experienceOverlay')) return $('experienceOverlay');
    const section = document.createElement('section');
    section.id = 'experienceOverlay';
    section.className = 'experience-overlay hidden';
    section.setAttribute('aria-modal', 'true');
    section.setAttribute('role', 'dialog');
    section.innerHTML = `
      <div class="experience-card">
        <div class="commander-wrap" aria-hidden="true">
          <div id="commanderAvatar" class="commander-avatar focus">
            <span class="commander-antenna"></span>
            <span class="commander-ear left"></span>
            <span class="commander-ear right"></span>
            <span class="commander-face">
              <i class="eye left"></i><i class="eye right"></i><i class="mouth"></i>
            </span>
          </div>
          <span class="commander-name">R-0</span>
        </div>
        <div class="experience-copy">
          <span id="experienceKicker" class="experience-kicker">MISIÓN</span>
          <h2 id="experienceTitle">Nivel 1</h2>
          <p id="experienceMessage">¡Vamos!</p>
          <div id="experienceFeature" class="experience-feature hidden"></div>
        </div>
        <button id="experienceContinue" class="experience-continue" type="button">¡VAMOS!</button>
        <div id="experienceConfetti" class="experience-confetti" aria-hidden="true"></div>
      </div>`;
    document.body.appendChild(section);
    return section;
  }

  function state() {
    try { return window.RBTwarAPI?.getState?.() || null; }
    catch (_) { return null; }
  }

  function unitLabel(type) {
    const labels = {basic:'BÁSICO',fast:'RÁPIDO',heavy:'PESADO',sniper:'FRANCOTIRADOR'};
    return labels[type] || String(type || '').toUpperCase();
  }

  function setAvatar(mode) {
    const avatar = $('commanderAvatar');
    if (!avatar) return;
    avatar.className = `commander-avatar ${mode || 'focus'}`;
  }

  function showOverlay({mode='intro', kicker='MISIÓN', title='', message='', feature='', button='¡VAMOS!', avatar='focus'} = {}) {
    const overlay = createOverlay();
    overlay.dataset.mode = mode;
    $('experienceKicker').textContent = kicker;
    $('experienceTitle').textContent = title;
    $('experienceMessage').textContent = message;
    $('experienceContinue').textContent = button;
    const f = $('experienceFeature');
    if (feature) {
      f.textContent = feature;
      f.classList.remove('hidden');
    } else {
      f.textContent = '';
      f.classList.add('hidden');
    }
    setAvatar(avatar);
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    if (mode === 'victory') makeConfetti(); else clearConfetti();
  }

  function hideOverlay() {
    const overlay = $('experienceOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => overlay.classList.add('hidden'), 180);
  }

  function pauseForIntro() {
    const pauseBtn = $('pauseBtn');
    const pauseModal = $('pauseModal');
    const tutorial = $('tutorial');
    tutorialWasOpen = Boolean(tutorial && !tutorial.classList.contains('hidden'));
    if (tutorialWasOpen) tutorial.classList.add('hidden');
    pauseBtn?.click();
    pauseModal?.classList.add('hidden');
  }

  function resumeFromIntro() {
    hideOverlay();
    $('resumeBtn')?.click();
    if (tutorialWasOpen) {
      setTimeout(() => $('tutorial')?.classList.remove('hidden'), 200);
      tutorialWasOpen = false;
    }
  }

  function introData() {
    const s = state();
    const level = Math.max(1, Number(s?.currentLevel || 1));
    const title = s?.levelMeta?.title || `Nivel ${level}`;
    const biome = s?.levelMeta?.biome || 'Zona';
    const unlockedNow = (s?.catalog || []).find(u => u.unlock === level && u.type !== 'basic');
    const newZone = level > 1 && (level - 1) % 5 === 0;
    const boss = level % 5 === 0;

    if (level === 30) return {
      kicker:'MISIÓN FINAL', title:`Nivel ${level} · ${title}`,
      message:'Último CORE. Termina la campaña.', feature:'👑 CORE SUPREMO', avatar:'boss'
    };
    if (unlockedNow) return {
      kicker:'NUEVA UNIDAD', title:`Robot ${unitLabel(unlockedNow.type)}`,
      message:`Nivel ${level} · ${title}`, feature:`⚡ ${unitLabel(unlockedNow.type)} DISPONIBLE`, avatar:'unlock'
    };
    if (newZone) return {
      kicker:'NUEVA ZONA', title:biome,
      message:`Nivel ${level} · ${title}`, feature:'🗺️ NUEVO FRENTE', avatar:'unlock'
    };
    if (boss) return {
      kicker:'FORTALEZA', title:`Nivel ${level} · ${title}`,
      message:'Rompe el CORE y cierra la zona.', feature:'🏰 OBJETIVO PRINCIPAL', avatar:'boss'
    };
    const messages = [
      'Conquista. Refuerza. Avanza.',
      'Abre camino hasta el CORE.',
      'Toma fábricas y gana terreno.',
      'Agrupa tus robots y presiona.',
      'Elige bien la ruta.'
    ];
    return {
      kicker:'MISIÓN', title:`Nivel ${level} · ${title}`,
      message:messages[(level - 1) % messages.length], feature:'', avatar:'focus'
    };
  }

  function showIntro() {
    if (!$('startScreen')?.classList.contains('hidden')) return;
    if (!$('resultModal')?.classList.contains('hidden')) return;
    pauseForIntro();
    const d = introData();
    showOverlay({...d, mode:'intro', button:'¡VAMOS!'});
  }

  function cheapestUpgrade(s) {
    return (s?.catalog || [])
      .filter(u => u.unlocked && u.level < u.maxLevel && u.cost > 0 && u.cost <= Number(s.coins || 0))
      .sort((a,b) => a.cost - b.cost)[0] || null;
  }

  function makeConfetti() {
    const root = $('experienceConfetti');
    if (!root) return;
    root.innerHTML = '';
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', `${8 + Math.random() * 84}%`);
      p.style.setProperty('--delay', `${Math.random() * .35}s`);
      p.style.setProperty('--spin', `${120 + Math.random() * 360}deg`);
      p.style.setProperty('--drift', `${-35 + Math.random() * 70}px`);
      p.className = `c${i % 5}`;
      root.appendChild(p);
    }
  }

  function clearConfetti() {
    const root = $('experienceConfetti');
    if (root) root.innerHTML = '';
  }

  function showOutro() {
    if ($('resultModal')?.classList.contains('hidden')) return;
    const s = state();
    const level = Math.max(1, Number(s?.currentLevel || 1));
    const victory = ($('resultEyebrow')?.textContent || '').toUpperCase().includes('VICTORIA');
    const stars = $('resultStars')?.textContent?.trim() || '';
    const reward = $('rewardCoins')?.textContent?.trim() || '';
    const phaseComplete = victory && level % 5 === 0;
    const campaignComplete = victory && level === 30;
    const upgrade = victory ? cheapestUpgrade(s) : null;

    if (!victory) {
      showOverlay({
        mode:'defeat', kicker:'REAGRUPAR', title:'No terminó aquí',
        message:'Ajusta la ruta y vuelve a intentarlo.', feature:'↻ INTENTA OTRA VEZ',
        button:'CONTINUAR', avatar:'defeat'
      });
      return;
    }

    let kicker = '¡VICTORIA!';
    let title = `Nivel ${level} superado`;
    let message = stars ? `${stars}  ${reward}` : reward;
    let feature = upgrade ? `⬆ ${unitLabel(upgrade.type)} · ${upgrade.cost} 🪙` : '✓ SIGUIENTE NIVEL';
    let avatar = 'victory';

    if (phaseComplete) {
      kicker = campaignComplete ? 'CAMPAÑA COMPLETADA' : '¡ZONA SUPERADA!';
      title = campaignComplete ? 'CORE Supremo destruido' : `Fase ${Math.ceil(level / 5)} completada`;
      feature = campaignComplete ? '👑 MISIÓN CUMPLIDA' : '🗺️ NUEVA ZONA DESBLOQUEADA';
      avatar = 'celebrate';
    }

    showOverlay({mode:'victory', kicker, title, message, feature, button:'VER RECOMPENSA', avatar});
  }

  function watchResults() {
    const modal = $('resultModal');
    if (!modal) return;
    const sync = () => {
      const visible = !modal.classList.contains('hidden');
      if (visible && !resultVisible) {
        resultVisible = true;
        setTimeout(showOutro, 120);
      }
      if (!visible) resultVisible = false;
    };
    new MutationObserver(sync).observe(modal, {attributes:true, attributeFilter:['class']});
    sync();
  }

  function bindLevelIntros() {
    for (const id of startButtons) {
      const btn = $(id);
      if (!btn || btn.dataset.experienceBound) continue;
      btn.dataset.experienceBound = '1';
      btn.addEventListener('click', () => setTimeout(showIntro, 0));
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    createOverlay();
    bindLevelIntros();
    watchResults();
    $('experienceContinue')?.addEventListener('click', () => {
      const mode = $('experienceOverlay')?.dataset.mode;
      if (mode === 'intro') resumeFromIntro(); else hideOverlay();
    });
    console.info('RBTwar experiencia v27 lista');
  }

  if (window.RBTwarAPI) init();
  else window.addEventListener('rbtwar:ready', init, {once:true});
})();
