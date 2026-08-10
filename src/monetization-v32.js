(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const DEV_ADS = location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(location.hostname) || localStorage.getItem('rbtwar-dev-ads') === 'on';
  const rewards = {
    reinforcements:{icon:'🤖',title:'+2 ROBOTS',desc:'Refuerzos inmediatos para tus pelotones.',placement:'battle_reinforcements'},
    core_repair:{icon:'🛡️',title:'CORE +30%',desc:'Repara tu base cuando la batalla se complica.',placement:'battle_core_repair'},
    army_power:{icon:'⚡',title:'DAÑO +20%',desc:'Potencia el ejército que ya está en batalla.',placement:'battle_army_power'}
  };
  let used = new Set();
  let rewardsThisRun = 0;
  let panelPausedGame = false;
  let busy = false;
  let availabilityAnnounced = false;

  function analytics(stage, reward){
    try { window.RBTwarAnalytics?.trackAd?.(stage, rewards[reward]?.placement || 'battle_help', reward); } catch (_) {}
  }

  function toast(message){
    const t=$('toast'); if(!t)return; t.textContent=message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2200);
  }

  function assistState(){ return window.RBTwarAPI?.getAssistState?.() || null; }

  function gameplayVisible(){
    const start=$('startScreen'),result=$('resultModal'),pause=$('pauseModal'),exp=$('experienceOverlay');
    return Boolean(assistState()?.active) && start?.classList.contains('hidden') && result?.classList.contains('hidden') && pause?.classList.contains('hidden') && (!exp || exp.classList.contains('hidden'));
  }

  function eligibleForHelp(st){
    if(!st || !st.active || rewardsThisRun>=2)return false;
    const elapsed=Number(st.elapsed||0),core=Number(st.corePct||100),robots=Number(st.robots||0),tier=st.tier||'medium';
    if(core<=45)return true;
    if(tier==='bastion')return elapsed>=18 || core<=70 || (elapsed>=28&&robots<=4);
    if(tier==='hard')return elapsed>=24 || core<=65 || (elapsed>=32&&robots<=3);
    if(tier==='medium')return elapsed>=38 || core<=58 || (elapsed>=42&&robots<=3);
    return core<=52 || (elapsed>=45&&robots<=2);
  }

  function createUi(){
    if($('assistButton'))return;
    const button=document.createElement('button');
    button.id='assistButton';button.type='button';button.className='assist-button hidden';
    button.innerHTML='<span>🎬</span><b>AYUDA</b><small>2 disp.</small>';
    document.querySelector('.game-shell')?.appendChild(button);

    const panel=document.createElement('section');
    panel.id='assistPanel';panel.className='assist-panel hidden';panel.innerHTML=`
      <div class="assist-card">
        <div class="assist-head"><div><small>REFUERZO OPCIONAL</small><h2>¿Necesitas ayuda?</h2><p>Elige una recompensa y mira un anuncio.</p></div><button id="assistClose" type="button">×</button></div>
        <div id="assistOptions" class="assist-options"></div>
        <div class="assist-limit"><span id="assistUses">0/2 usadas</span><small>La publicidad es opcional y el nivel se puede ganar sin verla.</small></div>
      </div>`;
    document.body.appendChild(panel);

    const ad=document.createElement('section');
    ad.id='testAdOverlay';ad.className='test-ad hidden';ad.innerHTML=`
      <div class="test-ad-card">
        <span class="test-ad-label">ANUNCIO DE PRUEBA</span>
        <div class="test-ad-visual"><span>R</span><b>RBTwar</b></div>
        <h2 id="testAdTitle">Preparando recompensa…</h2>
        <p>Simulación local. En Android este espacio será reemplazado por el anuncio recompensado real.</p>
        <div class="test-ad-progress"><i id="testAdProgress"></i></div>
        <strong id="testAdCountdown">3</strong>
      </div>`;
    document.body.appendChild(ad);

    button.addEventListener('click',openPanel);
    $('assistClose')?.addEventListener('click',closePanel);
    panel.addEventListener('click',e=>{if(e.target===panel)closePanel();});
    renderOptions();
  }

  function pauseForPanel(){
    if(panelPausedGame)return;
    const pause=$('pauseModal');
    $('pauseBtn')?.click();
    if(pause && !pause.classList.contains('hidden')){pause.classList.add('hidden');panelPausedGame=true;}
  }

  function resumeAfterPanel(){
    if(!panelPausedGame)return;
    panelPausedGame=false;
    $('resumeBtn')?.click();
  }

  function openPanel(){
    const st=assistState();
    if(!gameplayVisible() || !eligibleForHelp(st) || busy)return;
    pauseForPanel();
    renderOptions();
    const panel=$('assistPanel');panel?.classList.remove('hidden');requestAnimationFrame(()=>panel?.classList.add('show'));
    for(const kind of Object.keys(rewards))if(!used.has(kind)&&rewardsThisRun<2)analytics('offer',kind);
  }

  function closePanel(resume=true){
    const panel=$('assistPanel');if(panel){panel.classList.remove('show');setTimeout(()=>panel.classList.add('hidden'),160);}
    if(resume&&!busy)resumeAfterPanel();
  }

  function renderOptions(){
    const root=$('assistOptions');if(!root)return;
    root.innerHTML='';
    for(const [kind,item] of Object.entries(rewards)){
      const unavailable=used.has(kind)||rewardsThisRun>=2;
      const btn=document.createElement('button');btn.type='button';btn.className='assist-option';btn.disabled=unavailable;
      btn.innerHTML=`<span class="assist-icon">${item.icon}</span><span><b>${item.title}</b><small>${unavailable?(used.has(kind)?'Ya usado en esta partida':'Límite alcanzado'):item.desc}</small></span><em>${unavailable?'✓':'🎬 VER'}</em>`;
      if(!unavailable)btn.addEventListener('click',()=>requestReward(kind));
      root.appendChild(btn);
    }
    if($('assistUses'))$('assistUses').textContent=`${rewardsThisRun}/2 usadas`;
  }

  async function runTestAd(kind){
    const overlay=$('testAdOverlay'),progress=$('testAdProgress'),count=$('testAdCountdown');
    $('testAdTitle').textContent=rewards[kind].title;
    overlay.classList.remove('hidden');requestAnimationFrame(()=>overlay.classList.add('show'));
    const duration=3000,start=performance.now();
    return new Promise(resolve=>{
      const tick=now=>{
        const p=Math.min(1,(now-start)/duration);
        if(progress)progress.style.width=`${p*100}%`;
        if(count)count.textContent=String(Math.max(1,Math.ceil((duration-(now-start))/1000)));
        if(p<1)requestAnimationFrame(tick);else{
          if(count)count.textContent='✓';
          setTimeout(()=>{overlay.classList.remove('show');setTimeout(()=>overlay.classList.add('hidden'),140);resolve(true);},350);
        }
      };requestAnimationFrame(tick);
    });
  }

  async function showProvider(kind){
    const provider=window.RBTwarAdProvider;
    if(provider&&typeof provider.showRewarded==='function'){
      const result=await provider.showRewarded({placement:rewards[kind].placement,reward:kind});
      return Boolean(result===true||result?.rewarded===true||result?.completed===true);
    }
    if(DEV_ADS)return runTestAd(kind);
    toast('Los anuncios recompensados estarán disponibles en la app Android.');
    return false;
  }

  async function requestReward(kind){
    if(busy||used.has(kind)||rewardsThisRun>=2)return;
    busy=true;analytics('click',kind);closePanel(false);analytics('started',kind);
    try{
      const rewarded=await showProvider(kind);
      if(!rewarded){analytics('skipped',kind);return;}
      analytics('completed',kind);
      const result=window.RBTwarAPI?.applyReward?.(kind);
      if(result?.ok){
        used.add(kind);rewardsThisRun++;analytics('reward',kind);
        const msg=kind==='reinforcements'?'+2 robots recibidos':kind==='core_repair'?`CORE reparado · ${result.corePct||''}%`:'Ejército potenciado +20%';
        toast(msg);window.dispatchEvent(new CustomEvent('rbtwar:reward',{detail:{kind,result}}));
      }else{
        analytics('failed',kind);toast('No se pudo aplicar esa ayuda en este momento.');
      }
    }catch(err){console.warn('RBTwar rewarded ad:',err);analytics('failed',kind);toast('No se pudo cargar el anuncio.');}
    finally{busy=false;renderOptions();resumeAfterPanel();syncButton();}
  }

  function resetRun(){used=new Set();rewardsThisRun=0;busy=false;availabilityAnnounced=false;renderOptions();syncButton();}

  function syncButton(){
    const btn=$('assistButton');if(!btn)return;
    const st=assistState();
    const eligible=gameplayVisible()&&eligibleForHelp(st)&&!busy&&rewardsThisRun<2;
    btn.classList.toggle('hidden',!eligible);
    btn.classList.toggle('urgent',eligible&&Number(st?.corePct||100)<=45);
    const small=btn.querySelector('small');if(small)small.textContent=`${2-rewardsThisRun} disp.`;
    if(eligible&&!availabilityAnnounced){availabilityAnnounced=true;try{window.RBTwarAnalytics?.track?.('assist_available',{level:Number(st?.level||1),tier:String(st?.tier||'medium'),core_pct:Number(st?.corePct||100),robots:Number(st?.robots||0),elapsed:Number(st?.elapsed||0)});}catch(_) {}}
  }

  function bindResetButtons(){
    for(const id of ['startBtn','restartBtn','replayBtn','nextBtn','prevLevelBtn','nextUnlockedBtn']){
      const b=$(id);if(b&&!b.dataset.rewardReset){b.dataset.rewardReset='1';b.addEventListener('click',()=>setTimeout(resetRun,0));}
    }
  }

  function init(){
    createUi();bindResetButtons();syncButton();
    for(const id of ['startScreen','resultModal','pauseModal']){const el=$(id);if(el)new MutationObserver(syncButton).observe(el,{attributes:true,attributeFilter:['class']});}
    setInterval(syncButton,850);
    console.info(`RBTwar recompensas v32 listas · ${DEV_ADS?'anuncios de prueba':'proveedor nativo'}`);
  }

  if(window.RBTwarAPI)init();else window.addEventListener('rbtwar:ready',init,{once:true});
})();
