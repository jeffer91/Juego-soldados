(() => {
  'use strict';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const button = document.getElementById('soundBtn');
  let enabled = localStorage.getItem('rbtwar-sound') !== 'off';
  let ac = null;
  let master = null;
  let lastShot = 0;
  let lastEngage = 0;

  function ensureAudio() {
    if (!enabled || !AudioCtx) return null;
    if (!ac) {
      ac = new AudioCtx();
      master = ac.createGain();
      master.gain.value = .42;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function tone(freq, duration=.07, volume=.12, type='square', slide=0, delay=0) {
    const ctx = ensureAudio();
    if (!ctx || !master) return;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(35,freq), at);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide), at+duration);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),at+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain); gain.connect(master);
    osc.start(at); osc.stop(at+duration+.03);
  }

  function noise(duration=.22, volume=.16, lowpass=550) {
    const ctx=ensureAudio(); if(!ctx||!master)return;
    const len=Math.max(32,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=lowpass;
    gain.gain.setValueAtTime(volume,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    src.buffer=buffer;src.connect(filter);filter.connect(gain);gain.connect(master);src.start();src.stop(ctx.currentTime+duration+.02);
  }

  function setButton(){
    if(!button)return;
    button.textContent=enabled?'🔊':'🔇';
    button.classList.toggle('sound-off',!enabled);
    button.setAttribute('aria-label',enabled?'Silenciar efectos':'Activar efectos');
    button.title=enabled?'Efectos activados':'Efectos desactivados';
  }

  function vibrate(pattern){if(enabled&&navigator.vibrate)navigator.vibrate(pattern);}

  button?.addEventListener('click',()=>{
    enabled=!enabled;localStorage.setItem('rbtwar-sound',enabled?'on':'off');setButton();
    if(enabled){ensureAudio();tone(520,.08,.11,'sine',150);}
  });

  document.addEventListener('pointerdown',ensureAudio,{passive:true,capture:true});

  window.addEventListener('rbtwar:engage',e=>{
    const now=performance.now();if(now-lastEngage<420)return;lastEngage=now;
    const friendly=e.detail?.team==='player';
    tone(friendly?230:185,.07,.10,'triangle',friendly?90:-35);
    tone(friendly?310:145,.09,.075,'square',friendly?70:-25,.075);
    vibrate(16);
  });

  window.addEventListener('rbtwar:shot',e=>{
    const now=performance.now();if(now-lastShot<45)return;lastShot=now;
    const type=e.detail?.type;
    if(type==='heavy'){tone(105,.085,.15,'square',-35);noise(.055,.055,700);}
    else if(type==='sniper')tone(690,.055,.105,'triangle',260);
    else if(type==='fast')tone(300,.035,.085,'square',90);
    else tone(205,.045,.095,'square',55);
  });

  window.addEventListener('rbtwar:capture',e=>{
    const player=e.detail?.team==='player';
    if(player){tone(420,.10,.12,'triangle',170);tone(660,.12,.10,'sine',110,.09);}
    else{tone(260,.11,.11,'sawtooth',-70);tone(175,.13,.09,'triangle',-45,.08);}
    vibrate(player?[18,25,22]:28);
  });

  window.addEventListener('rbtwar:base_destroyed',e=>{
    noise(.34,.20,480);tone(92,.28,.16,'sawtooth',-42);tone(64,.36,.12,'triangle',-22,.06);
    vibrate([28,30,48]);
  });

  window.addEventListener('rbtwar:victory',()=>{
    tone(440,.12,.12,'triangle',170);tone(650,.14,.11,'triangle',170,.11);tone(860,.18,.10,'sine',110,.23);
    vibrate([18,28,34]);
  });

  window.addEventListener('rbtwar:defeat',()=>{
    tone(220,.16,.12,'sawtooth',-85);tone(135,.22,.10,'triangle',-50,.12);vibrate([32,35,55]);
  });

  window.RBTwarSfx={wake:ensureAudio,isEnabled:()=>enabled};
  setButton();
  console.info('RBTwar efectos v36 listos');
})();
