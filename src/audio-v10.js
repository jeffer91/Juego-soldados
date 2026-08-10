(() => {
  'use strict';
  const A = window.AudioContext || window.webkitAudioContext;
  const button = document.getElementById('soundBtn');
  let enabled = localStorage.getItem('rbtwar-sound') !== 'off';
  let audio = null;
  let lastShot = 0;

  function ensureAudio() {
    if (!enabled || !A) return null;
    if (!audio) audio = new A();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  function tone(freq, duration = .06, volume = .025, type = 'square', slide = 0) {
    const ac = ensureAudio();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(35, freq + slide), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + duration + .02);
  }

  function setButton() {
    if (!button) return;
    button.textContent = enabled ? '🔊' : '🔇';
    button.classList.toggle('sound-off', !enabled);
    button.setAttribute('aria-label', enabled ? 'Silenciar sonido' : 'Activar sonido');
  }

  function vibrate(pattern) {
    if (enabled && navigator.vibrate) navigator.vibrate(pattern);
  }

  button?.addEventListener('click', () => {
    enabled = !enabled;
    localStorage.setItem('rbtwar-sound', enabled ? 'on' : 'off');
    setButton();
    if (enabled) { ensureAudio(); tone(520, .07, .025, 'sine', 140); }
  });

  window.addEventListener('pointerdown', ensureAudio, { passive: true });
  window.addEventListener('rbtwar:shot', e => {
    const now = performance.now();
    if (now - lastShot < 55) return;
    lastShot = now;
    const type = e.detail?.type;
    if (type === 'heavy') tone(105, .075, .032, 'square', -35);
    else if (type === 'sniper') tone(620, .055, .020, 'triangle', 220);
    else if (type === 'fast') tone(260, .035, .016, 'square', 80);
    else tone(190, .045, .018, 'square', 45);
  });
  window.addEventListener('rbtwar:capture', e => {
    tone(e.detail?.team === 'player' ? 460 : 170, .10, .03, 'triangle', e.detail?.team === 'player' ? 220 : -60);
    if (e.detail?.team === 'player') setTimeout(() => tone(690, .08, .022, 'sine', 100), 70);
    vibrate(18);
  });
  window.addEventListener('rbtwar:explosion', e => {
    const intensity = Math.max(1, e.detail?.intensity || 1);
    tone(90, Math.min(.18, .08 * intensity), .028, 'sawtooth', -45);
    if (intensity > 1.7) vibrate([18, 20, 28]);
  });
  window.addEventListener('rbtwar:victory', () => {
    tone(420, .12, .030, 'triangle', 170);
    setTimeout(() => tone(620, .14, .028, 'triangle', 180), 115);
    setTimeout(() => tone(840, .17, .026, 'sine', 120), 235);
    vibrate([20, 35, 35]);
  });
  window.addEventListener('rbtwar:defeat', () => {
    tone(210, .16, .030, 'sawtooth', -90);
    setTimeout(() => tone(120, .20, .025, 'triangle', -45), 110);
    vibrate([35, 35, 60]);
  });

  setButton();
})();