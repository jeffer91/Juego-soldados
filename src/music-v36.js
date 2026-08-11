(() => {
  'use strict';

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  const button=document.getElementById('musicBtn');
  let enabled=localStorage.getItem('rbtwar-music')!=='off';
  let ac=null,master=null,timer=null,nextAt=0,step=0,mode='menu',unlocked=false;

  const midi=n=>440*Math.pow(2,(n-69)/12);
  const zoneShift={desert:0,canyon:-2,forest:2,snow:5,city:-5,elite:7};
  const menuLead=[60,64,67,null,64,67,69,null,60,64,67,72,69,67,64,null];
  const menuBass=[48,null,48,null,45,null,43,null,48,null,52,null,45,null,43,null];
  const battleLead=[67,null,70,67,72,null,70,null,67,65,67,null,70,null,72,70];
  const battleBass=[43,43,null,43,46,null,43,null,48,48,null,46,43,null,41,null];

  function currentState(){try{return window.RBTwarAPI?.getState?.()||null;}catch(_){return null;}}
  function shift(){return zoneShift[currentState()?.levelMeta?.biome]||0;}

  function ensure(){
    if(!enabled||!AudioCtx)return null;
    if(!ac){ac=new AudioCtx();master=ac.createGain();master.gain.value=.0001;master.connect(ac.destination);}
    return ac;
  }

  async function unlock(){
    if(!enabled)return;
    const ctx=ensure();if(!ctx)return;
    try{if(ctx.state==='suspended')await ctx.resume();}catch(_){}
    if(ctx.state!=='running')return;
    unlocked=true;
    if(!nextAt||nextAt<ctx.currentTime)nextAt=ctx.currentTime+.05;
    if(!timer)timer=setInterval(schedule,80);
    syncMode(true);
  }

  function setButton(){
    if(!button)return;
    button.textContent='🎵';
    button.classList.toggle('music-on',enabled);
    button.classList.toggle('music-off',!enabled);
    button.setAttribute('aria-label',enabled?'Silenciar música':'Activar música');
    button.title=enabled?'Música activada':'Música desactivada';
  }

  function fade(value,seconds=.25){
    if(!ac||!master)return;
    const now=ac.currentTime,target=enabled?Math.max(.0001,value):.0001;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(.0001,master.gain.value),now);
    master.gain.exponentialRampToValueAtTime(target,now+Math.max(.03,seconds));
  }

  function note(n,when,duration=.16,volume=.07,type='triangle'){
    if(!ac||!master||n==null)return;
    const osc=ac.createOscillator(),gain=ac.createGain();
    osc.type=type;osc.frequency.setValueAtTime(midi(n+shift()),when);
    gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(volume,when+.012);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(gain);gain.connect(master);osc.start(when);osc.stop(when+duration+.03);
  }

  function resolveMode(){
    if(document.hidden)return'silent';
    const start=document.getElementById('startScreen'),result=document.getElementById('resultModal'),pause=document.getElementById('pauseModal'),exp=document.getElementById('experienceOverlay');
    if(start&&!start.classList.contains('hidden'))return'menu';
    if(result&&!result.classList.contains('hidden'))return'result';
    if(pause&&!pause.classList.contains('hidden'))return'paused';
    if(exp&&!exp.classList.contains('hidden')&&exp.dataset.mode!=='intro')return'result';
    return'battle';
  }

  function syncMode(force=false){
    const next=resolveMode();if(!force&&next===mode)return;mode=next;step=0;if(ac)nextAt=ac.currentTime+.06;
    if(mode==='menu')fade(.42,.30);else if(mode==='battle')fade(.50,.22);else if(mode==='paused')fade(.10,.18);else if(mode==='result')fade(.16,.18);else fade(.0001,.12);
  }

  function schedule(){
    if(!enabled||!unlocked||!ac||ac.state!=='running')return;
    const horizon=ac.currentTime+.34;
    while(nextAt<horizon){
      if(mode==='menu'){
        const i=step%menuLead.length,beat=60/94/2;
        note(menuBass[i],nextAt,beat*1.5,.055,'triangle');note(menuLead[i],nextAt+.01,beat*1.25,.048,'sine');nextAt+=beat;
      }else if(mode==='battle'){
        const i=step%battleLead.length,boss=Number(currentState()?.currentLevel||1)%5===0?8:0,beat=60/(122+boss)/2;
        note(battleBass[i],nextAt,beat*.92,.065,'square');note(battleLead[i],nextAt+.008,beat*.72,.045,'triangle');
        if(i%2===0)note(31+(i%4?2:0),nextAt,beat*.24,.035,'sine');nextAt+=beat;
      }else nextAt+=.12;
      step++;
    }
  }

  function observe(id){const el=document.getElementById(id);if(!el||el.dataset.music36)return;el.dataset.music36='1';new MutationObserver(()=>setTimeout(()=>syncMode(),0)).observe(el,{attributes:true,attributeFilter:['class','data-mode']});}
  function wire(){['startScreen','resultModal','pauseModal','experienceOverlay'].forEach(observe);}

  button?.addEventListener('click',()=>{
    enabled=!enabled;localStorage.setItem('rbtwar-music',enabled?'on':'off');setButton();
    if(enabled)unlock();else fade(.0001,.12);
  });

  const wake=()=>{if(enabled)unlock();};
  document.addEventListener('pointerdown',wake,{passive:true,capture:true});
  document.addEventListener('touchstart',wake,{passive:true,capture:true});
  document.addEventListener('keydown',wake,{capture:true});
  document.getElementById('startBtn')?.addEventListener('click',wake);
  window.addEventListener('rbtwar:ready',()=>{wire();setTimeout(()=>syncMode(true),0);});
  window.addEventListener('rbtwar:state',()=>setTimeout(()=>syncMode(),0));
  document.addEventListener('visibilitychange',()=>syncMode(true));
  new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});

  window.RBTwarMusic={wake,isEnabled:()=>enabled};
  wire();setButton();
  console.info('RBTwar música v36 lista');
})();
