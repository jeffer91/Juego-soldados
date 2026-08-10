(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const musicBtn = document.getElementById('musicBtn');
  let enabled = localStorage.getItem('rbtwar-music') !== 'off';
  let ac = null;
  let master = null;
  let timer = null;
  let mode = 'menu';
  let step = 0;
  let nextStepAt = 0;
  let unlocked = false;
  let lastResultKey = '';
  let watchedExperience = null;

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const zoneShift = {desert:0,canyon:-2,forest:2,snow:5,city:-5,elite:7};

  const MENU = {
    bpm: 92,
    bass: [48,null,48,null,45,null,43,null,48,null,52,null,45,null,43,null],
    lead: [60,64,67,null,64,67,69,null,60,64,67,72,69,67,64,null],
    chord: [[60,64,67],null,null,null,[57,60,64],null,null,null,[55,60,64],null,null,null,[53,57,60],null,null,null]
  };

  const BATTLE = {
    bpm: 124,
    bass: [43,43,null,43,46,null,43,null,48,48,null,46,43,null,41,null],
    lead: [67,null,70,67,72,null,70,null,67,65,67,null,70,null,72,70],
    pulse: [1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0]
  };

  function ensureAudio() {
    if (!AudioCtx || !enabled) return null;
    if (!ac) {
      ac = new AudioCtx();
      master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function setButton() {
    if (!musicBtn) return;
    musicBtn.textContent = '🎵';
    musicBtn.classList.toggle('music-off', !enabled);
    musicBtn.classList.toggle('music-on', enabled);
    musicBtn.setAttribute('aria-label', enabled ? 'Silenciar música' : 'Activar música');
    musicBtn.title = enabled ? 'Música activada' : 'Música desactivada';
  }

  function fadeTo(value, seconds = .28) {
    const ctx = ensureAudio();
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const target = enabled ? Math.max(.0001, value) : .0001;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(target, now + Math.max(.03, seconds));
  }

  function note(freq, when, duration, volume, type = 'triangle', detune = 0) {
    if (!ac || !master || !freq) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime(detune, when);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, when + Math.max(.05, duration));
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + duration + .05);
  }

  function chord(notes, when, duration, volume, shift = 0) {
    if (!notes) return;
    notes.forEach((n, i) => note(midi(n + shift), when + i * .006, duration, volume, 'sine', i === 1 ? -4 : i === 2 ? 4 : 0));
  }

  function noiseHit(when, volume = .007, duration = .035) {
    if (!ac || !master) return;
    const length = Math.max(8, Math.floor(ac.sampleRate * duration));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    filter.type = 'highpass';
    filter.frequency.value = 1300;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    src.buffer = buffer;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(when); src.stop(when + duration + .01);
  }

  function currentState() {
    try { return window.RBTwarAPI?.getState?.() || null; }
    catch (_) { return null; }
  }

  function transpose() {
    const biome = currentState()?.levelMeta?.biome;
    return zoneShift[biome] || 0;
  }

  function bossBoost() {
    const level = Number(currentState()?.currentLevel || 1);
    return level % 5 === 0 ? 1 : 0;
  }

  function scheduleMenu(when) {
    const i = step % MENU.lead.length;
    const shift = transpose();
    const beat = 60 / MENU.bpm / 2;
    const bass = MENU.bass[i];
    const lead = MENU.lead[i];
    if (bass != null) note(midi(bass + shift), when, beat * 1.65, .014, 'triangle');
    if (lead != null) note(midi(lead + shift), when + .012, beat * 1.35, .009, 'sine');
    if (MENU.chord[i]) chord(MENU.chord[i], when, beat * 3.4, .0045, shift);
    step++;
    nextStepAt += beat;
  }

  function scheduleBattle(when) {
    const i = step % BATTLE.lead.length;
    const shift = transpose();
    const boss = bossBoost();
    const beat = 60 / (BATTLE.bpm + boss * 8) / 2;
    const bass = BATTLE.bass[i];
    const lead = BATTLE.lead[i];
    if (bass != null) note(midi(bass + shift), when, beat * .95, .014 + boss * .002, 'square');
    if (lead != null) note(midi(lead + shift), when + .01, beat * .72, .0075, 'triangle');
    if (BATTLE.pulse[i]) note(midi(31 + (i % 4 === 0 ? 0 : 2)), when, beat * .28, .008, 'sine');
    if (i % 2 === 0) noiseHit(when, .0045 + boss * .0015, .026);
    if (i === 0 || i === 8) chord([55,62,67], when, beat * 2.4, .0038, shift);
    step++;
    nextStepAt += beat;
  }

  function scheduler() {
    if (!enabled || !unlocked || !ac || !master) return;
    const horizon = ac.currentTime + .38;
    while (nextStepAt < horizon) {
      if (mode === 'menu') scheduleMenu(nextStepAt);
      else if (mode === 'battle') scheduleBattle(nextStepAt);
      else nextStepAt += .12;
    }
  }

  function startScheduler() {
    const ctx = ensureAudio();
    if (!ctx || !enabled) return;
    unlocked = true;
    if (!nextStepAt || nextStepAt < ctx.currentTime) nextStepAt = ctx.currentTime + .06;
    if (!timer) timer = setInterval(scheduler, 90);
    syncMode(true);
  }

  function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
    fadeTo(.0001, .16);
  }

  function resolveMode() {
    if (document.hidden) return 'silent';
    const start = document.getElementById('startScreen');
    const result = document.getElementById('resultModal');
    const pause = document.getElementById('pauseModal');
    const exp = document.getElementById('experienceOverlay');
    if (start && !start.classList.contains('hidden')) return 'menu';
    if (result && !result.classList.contains('hidden')) return 'result';
    if (pause && !pause.classList.contains('hidden')) return 'paused';
    if (exp && !exp.classList.contains('hidden') && exp.dataset.mode !== 'intro') return 'result';
    return 'battle';
  }

  function resultStinger() {
    const result = document.getElementById('resultModal');
    if (!result || result.classList.contains('hidden') || !ac) return;
    const victory = (document.getElementById('resultEyebrow')?.textContent || '').toUpperCase().includes('VICTORIA');
    const level = Number(currentState()?.currentLevel || 0);
    const key = `${victory ? 'v' : 'd'}-${level}-${result.className}`;
    if (key === lastResultKey) return;
    lastResultKey = key;
    const now = ac.currentTime + .05;
    if (victory) {
      [60,64,67,72].forEach((n, i) => note(midi(n + transpose()), now + i * .11, .18, .011, 'triangle'));
    } else {
      [55,51,48].forEach((n, i) => note(midi(n + transpose()), now + i * .13, .20, .009, 'sine'));
    }
  }

  function syncMode(force = false) {
    if (!enabled || !unlocked) return;
    const next = resolveMode();
    if (!force && next === mode) return;
    mode = next;
    step = 0;
    if (ac) nextStepAt = ac.currentTime + .08;
    if (mode === 'menu') fadeTo(.10, .34);
    else if (mode === 'battle') fadeTo(.115, .26);
    else if (mode === 'paused') fadeTo(.025, .22);
    else if (mode === 'result') {
      fadeTo(.035, .18);
      resultStinger();
    } else fadeTo(.0001, .15);
  }

  function observe(el) {
    if (!el || el.dataset.musicObserved) return;
    el.dataset.musicObserved = '1';
    new MutationObserver(() => setTimeout(() => syncMode(), 0))
      .observe(el, {attributes:true, attributeFilter:['class','data-mode']});
  }

  function wireObservers() {
    ['startScreen','resultModal','pauseModal'].forEach(id => observe(document.getElementById(id)));
    const exp = document.getElementById('experienceOverlay');
    if (exp && exp !== watchedExperience) {
      watchedExperience = exp;
      observe(exp);
    }
  }

  musicBtn?.addEventListener('click', () => {
    enabled = !enabled;
    localStorage.setItem('rbtwar-music', enabled ? 'on' : 'off');
    setButton();
    if (enabled) startScheduler(); else stopScheduler();
  });

  window.addEventListener('pointerdown', () => {
    if (!enabled) return;
    startScheduler();
  }, {passive:true, once:true});

  window.addEventListener('rbtwar:ready', () => setTimeout(() => { wireObservers(); syncMode(true); }, 0));
  window.addEventListener('rbtwar:state', () => setTimeout(() => syncMode(), 0));
  document.addEventListener('visibilitychange', () => syncMode(true));

  new MutationObserver(() => wireObservers()).observe(document.body, {childList:true, subtree:false});
  wireObservers();
  setButton();
  console.info('RBTwar música v28 lista');
})();
