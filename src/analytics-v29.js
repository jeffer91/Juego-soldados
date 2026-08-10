(() => {
  'use strict';

  const VERSION = '29';
  const STORAGE_KEY = 'rbtwar-analytics-v29';
  const ENDPOINT_KEY = 'rbtwar-analytics-endpoint';
  const MAX_EVENTS = 1200;
  const MAX_SESSIONS = 120;
  const FLUSH_MS = 30000;
  const HEARTBEAT_MS = 10000;
  const $ = id => document.getElementById(id);

  const nowIso = () => new Date().toISOString();
  const uuid = () => {
    try { return crypto.randomUUID(); }
    catch (_) { return `rbt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
  };

  function blankStore() {
    return {
      version: VERSION,
      installId: uuid(),
      createdAt: nowIso(),
      events: [],
      sessions: [],
      totals: {
        sessions: 0,
        levelsStarted: 0,
        wins: 0,
        fails: 0,
        retries: 0,
        exits: 0,
        upgrades: 0,
        adOffers: 0,
        adStarts: 0,
        adCompletes: 0,
        rewardsGranted: 0
      },
      maxLevelSeen: 1
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankStore();
      const parsed = JSON.parse(raw);
      const base = blankStore();
      return {
        ...base,
        ...parsed,
        version: VERSION,
        installId: parsed.installId || base.installId,
        events: Array.isArray(parsed.events) ? parsed.events : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        totals: { ...base.totals, ...(parsed.totals || {}) }
      };
    } catch (_) {
      return blankStore();
    }
  }

  let store = loadStore();
  const sessionId = uuid();
  const sessionStartedAt = Date.now();
  let sessionActiveMs = 0;
  let sessionActiveSince = document.hidden ? 0 : Date.now();
  let sessionEnded = false;
  let activeRun = null;
  let runClockSince = 0;
  let flushBusy = false;
  let endpoint = window.RBTWAR_ANALYTICS_ENDPOINT || localStorage.getItem(ENDPOINT_KEY) || '';

  const session = {
    id: sessionId,
    started_at: nowIso(),
    last_seen_at: nowIso(),
    duration_seconds: 0,
    active_seconds: 0,
    max_level: 1,
    levels_started: 0,
    wins: 0,
    fails: 0,
    upgrades: 0,
    ads_completed: 0
  };
  store.sessions.push(session);
  if (store.sessions.length > MAX_SESSIONS) store.sessions.splice(0, store.sessions.length - MAX_SESSIONS);
  store.totals.sessions += 1;

  function gameState() {
    try { return window.RBTwarAPI?.getState?.() || null; }
    catch (_) { return null; }
  }

  function context() {
    const s = gameState();
    return {
      level: Math.max(1, Number(s?.currentLevel || 1)),
      unlocked_level: Math.max(1, Number(s?.unlockedLevel || 1)),
      biome: s?.levelMeta?.biome || null,
      coins: Number(s?.coins || 0),
      stars_total: Number(s?.stars || 0)
    };
  }

  function persistStore() {
    try {
      session.last_seen_at = nowIso();
      session.duration_seconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
      session.active_seconds = Math.max(0, Math.round(currentSessionActiveMs() / 1000));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      console.warn('RBTwar analytics: no se pudo guardar localmente.', err);
    }
  }

  function currentSessionActiveMs() {
    return sessionActiveMs + (sessionActiveSince ? Math.max(0, Date.now() - sessionActiveSince) : 0);
  }

  function syncSessionVisibility() {
    if (document.hidden) {
      if (sessionActiveSince) {
        sessionActiveMs += Math.max(0, Date.now() - sessionActiveSince);
        sessionActiveSince = 0;
      }
    } else if (!sessionActiveSince) {
      sessionActiveSince = Date.now();
    }
    syncRunClock();
    persistStore();
  }

  function normalizeData(data) {
    const out = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (value == null) continue;
      if (typeof value === 'string') out[key] = value.slice(0, 180);
      else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
      else if (typeof value === 'boolean') out[key] = value;
      else if (Array.isArray(value)) out[key] = value.slice(0, 12).map(v => typeof v === 'string' ? v.slice(0, 80) : v);
    }
    return out;
  }

  function applyTotals(name, data) {
    if (name === 'level_start') {
      store.totals.levelsStarted += 1;
      session.levels_started += 1;
    } else if (name === 'level_win') {
      store.totals.wins += 1;
      session.wins += 1;
    } else if (name === 'level_fail') {
      store.totals.fails += 1;
      session.fails += 1;
    } else if (name === 'level_retry') store.totals.retries += 1;
    else if (name === 'level_exit') store.totals.exits += 1;
    else if (name === 'unit_upgrade') {
      store.totals.upgrades += 1;
      session.upgrades += 1;
    } else if (name === 'ad_offer') store.totals.adOffers += 1;
    else if (name === 'ad_started') store.totals.adStarts += 1;
    else if (name === 'ad_completed') {
      store.totals.adCompletes += 1;
      session.ads_completed += 1;
    } else if (name === 'reward_received') store.totals.rewardsGranted += 1;

    const level = Number(data?.level || context().level || 1);
    store.maxLevelSeen = Math.max(Number(store.maxLevelSeen || 1), level);
    session.max_level = Math.max(Number(session.max_level || 1), level);
  }

  function track(name, data = {}) {
    const ctx = context();
    const clean = normalizeData(data);
    const event = {
      event_id: uuid(),
      event: String(name).slice(0, 60),
      ts: nowIso(),
      app_version: VERSION,
      install_id: store.installId,
      session_id: sessionId,
      ...ctx,
      ...clean,
      sent: false
    };
    store.events.push(event);
    if (store.events.length > MAX_EVENTS) store.events.splice(0, store.events.length - MAX_EVENTS);
    applyTotals(name, event);
    persistStore();
    window.dispatchEvent(new CustomEvent('rbtwar:analytics', { detail: { ...event } }));
    return event;
  }

  function gameplayClockEligible() {
    if (document.hidden) return false;
    const start = $('startScreen');
    const result = $('resultModal');
    const pause = $('pauseModal');
    const experience = $('experienceOverlay');
    if (start && !start.classList.contains('hidden')) return false;
    if (result && !result.classList.contains('hidden')) return false;
    if (pause && !pause.classList.contains('hidden')) return false;
    if (experience && !experience.classList.contains('hidden')) return false;
    return true;
  }

  function syncRunClock() {
    if (!activeRun) {
      runClockSince = 0;
      return;
    }
    const eligible = gameplayClockEligible();
    if (eligible && !runClockSince) runClockSince = Date.now();
    if (!eligible && runClockSince) {
      activeRun.active_ms += Math.max(0, Date.now() - runClockSince);
      runClockSince = 0;
    }
  }

  function runActiveMs() {
    if (!activeRun) return 0;
    return activeRun.active_ms + (runClockSince ? Math.max(0, Date.now() - runClockSince) : 0);
  }

  function finishRun(outcome, extra = {}) {
    if (!activeRun) return;
    syncRunClock();
    const run = activeRun;
    const activeSeconds = Math.max(0, Math.round(runActiveMs() / 1000));
    const wallSeconds = Math.max(0, Math.round((Date.now() - run.started_at_ms) / 1000));
    activeRun = null;
    runClockSince = 0;

    if (outcome === 'win') track('level_win', {
      level: run.level,
      run_id: run.id,
      source: run.source,
      active_seconds: activeSeconds,
      wall_seconds: wallSeconds,
      ...extra
    });
    else if (outcome === 'fail') track('level_fail', {
      level: run.level,
      run_id: run.id,
      source: run.source,
      active_seconds: activeSeconds,
      wall_seconds: wallSeconds,
      ...extra
    });
    else track('level_exit', {
      level: run.level,
      run_id: run.id,
      source: run.source,
      reason: outcome || 'exit',
      active_seconds: activeSeconds,
      wall_seconds: wallSeconds,
      ...extra
    });
  }

  function beginRun(source = 'play') {
    const s = gameState();
    const level = Math.max(1, Number(s?.currentLevel || 1));
    if (activeRun && activeRun.level === level && Date.now() - activeRun.started_at_ms < 700) return;
    if (activeRun) finishRun(source === 'restart' || source === 'retry' ? source : 'new_order');
    activeRun = {
      id: uuid(),
      level,
      source,
      started_at_ms: Date.now(),
      active_ms: 0
    };
    runClockSince = 0;
    if (source === 'restart' || source === 'retry') track('level_retry', { level, source });
    track('level_start', { level, run_id: activeRun.id, source });
    syncRunClock();
  }

  function bindLevelButtons() {
    const starters = {
      startBtn: 'play',
      restartBtn: 'restart',
      replayBtn: 'retry',
      nextBtn: 'next',
      prevLevelBtn: 'previous',
      nextUnlockedBtn: 'next'
    };
    for (const [id, source] of Object.entries(starters)) {
      const btn = $(id);
      if (!btn || btn.dataset.analyticsBound) continue;
      btn.dataset.analyticsBound = '1';
      btn.addEventListener('click', () => setTimeout(() => beginRun(source), 0));
    }
    const home = $('homeBtn');
    if (home && !home.dataset.analyticsBound) {
      home.dataset.analyticsBound = '1';
      home.addEventListener('click', () => finishRun('home'));
    }
    const path = $('levelPath');
    if (path && !path.dataset.analyticsBound) {
      path.dataset.analyticsBound = '1';
      path.addEventListener('click', e => {
        const button = e.target.closest?.('.level-node');
        if (!button || button.disabled) return;
        const level = Number(button.textContent.trim());
        if (Number.isFinite(level)) track('level_select', { level });
      });
    }
  }

  function observeResult() {
    const modal = $('resultModal');
    if (!modal || modal.dataset.analyticsObserved) return;
    modal.dataset.analyticsObserved = '1';
    let visible = !modal.classList.contains('hidden');
    const sync = () => {
      const nextVisible = !modal.classList.contains('hidden');
      if (nextVisible && !visible && activeRun) {
        const victory = ($('resultEyebrow')?.textContent || '').toUpperCase().includes('VICTORIA');
        const stars = ($('resultStars')?.textContent || '').split('⭐').length - 1;
        const rewardText = $('rewardCoins')?.textContent || '';
        const reward = Number((rewardText.match(/\d+/) || ['0'])[0]);
        finishRun(victory ? 'win' : 'fail', { stars: Math.max(0, stars), reward_coins: reward });
      }
      visible = nextVisible;
      syncRunClock();
    };
    new MutationObserver(sync).observe(modal, { attributes:true, attributeFilter:['class'] });
  }

  function observeGameplayState() {
    for (const id of ['startScreen','pauseModal','experienceOverlay']) {
      const el = $(id);
      if (!el || el.dataset.analyticsClockObserved) continue;
      el.dataset.analyticsClockObserved = '1';
      new MutationObserver(syncRunClock).observe(el, { attributes:true, attributeFilter:['class','data-mode'] });
    }
  }

  function wrapUpgradeApi() {
    const api = window.RBTwarAPI;
    if (!api || api.__analyticsUpgradeWrapped || typeof api.upgradeUnit !== 'function') return;
    const original = api.upgradeUnit.bind(api);
    api.upgradeUnit = type => {
      const before = api.getCatalog?.().find?.(u => u.type === type) || null;
      const coinsBefore = Number(api.getState?.()?.coins || 0);
      const result = original(type);
      if (result?.ok) {
        const after = api.getCatalog?.().find?.(u => u.type === type) || null;
        track('unit_upgrade', {
          unit_type: type,
          from_level: Number(before?.level || Math.max(1, Number(result.level || 1) - 1)),
          to_level: Number(after?.level || result.level || 1),
          cost: Number(result.cost || before?.cost || 0),
          coins_before: coinsBefore,
          coins_after: Number(api.getState?.()?.coins || 0)
        });
      }
      return result;
    };
    Object.defineProperty(api, '__analyticsUpgradeWrapped', { value:true, configurable:false });
  }

  function pendingEvents() {
    return store.events.filter(e => !e.sent).slice(0, 60);
  }

  async function flushRemote() {
    if (flushBusy || !endpoint) return false;
    const batch = pendingEvents();
    if (!batch.length) return true;
    flushBusy = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify({ app:'rbtwar', version:VERSION, events:batch.map(({sent, ...e}) => e) }),
        keepalive: true,
        credentials: 'omit'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const ids = new Set(batch.map(e => e.event_id));
      store.events.forEach(e => { if (ids.has(e.event_id)) e.sent = true; });
      persistStore();
      return true;
    } catch (err) {
      console.warn('RBTwar analytics: envío pendiente.', err);
      return false;
    } finally {
      flushBusy = false;
    }
  }

  function beaconPending() {
    if (!endpoint || !navigator.sendBeacon) return;
    const batch = pendingEvents().slice(0, 30);
    if (!batch.length) return;
    try {
      const blob = new Blob([JSON.stringify({ app:'rbtwar', version:VERSION, events:batch.map(({sent, ...e}) => e) })], { type:'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } catch (_) {}
  }

  function summary() {
    persistStore();
    const sessions = store.sessions || [];
    const totalActive = sessions.reduce((n, s) => n + Number(s.active_seconds || 0), 0);
    return {
      version: VERSION,
      installId: store.installId,
      totals: { ...store.totals },
      maxLevelSeen: Number(store.maxLevelSeen || 1),
      sessions: sessions.length,
      avgSessionActiveSeconds: sessions.length ? Math.round(totalActive / sessions.length) : 0,
      pendingEvents: pendingEvents().length,
      endpointConfigured: Boolean(endpoint)
    };
  }

  function configureEndpoint(url = '') {
    endpoint = String(url || '').trim();
    if (endpoint) localStorage.setItem(ENDPOINT_KEY, endpoint);
    else localStorage.removeItem(ENDPOINT_KEY);
    track('analytics_endpoint_changed', { enabled:Boolean(endpoint) });
    if (endpoint) flushRemote();
    return Boolean(endpoint);
  }

  function exportData() {
    persistStore();
    return JSON.parse(JSON.stringify(store));
  }

  function trackAd(stage, placement = 'unknown', reward = '') {
    const map = {
      offer:'ad_offer',
      click:'ad_clicked',
      started:'ad_started',
      completed:'ad_completed',
      reward:'reward_received',
      failed:'ad_failed',
      skipped:'ad_skipped'
    };
    return track(map[stage] || `ad_${stage}`, { placement, reward });
  }

  function endSession(reason = 'pagehide') {
    if (sessionEnded) return;
    if (activeRun) finishRun('session_end');
    syncSessionVisibility();
    track('session_end', {
      reason,
      duration_seconds: Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000)),
      active_seconds: Math.max(0, Math.round(currentSessionActiveMs() / 1000))
    });
    sessionEnded = true;
    persistStore();
    beaconPending();
  }

  function init() {
    bindLevelButtons();
    observeResult();
    observeGameplayState();
    wrapUpgradeApi();
    const ctx = context();
    track('session_start', {
      level: ctx.level,
      viewport_w: Math.round(window.innerWidth || 0),
      viewport_h: Math.round(window.innerHeight || 0),
      standalone: Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
    });
    console.info('RBTwar analítica v29 lista');
  }

  window.RBTwarAnalytics = {
    version: VERSION,
    track,
    trackAd,
    getSummary: summary,
    exportData,
    flush: flushRemote,
    configureEndpoint,
    getEndpoint: () => endpoint,
    getInstallId: () => store.installId
  };

  window.addEventListener('rbtwar:ready', () => {
    wrapUpgradeApi();
    bindLevelButtons();
    observeResult();
    setTimeout(observeGameplayState, 0);
  });
  window.addEventListener('rbtwar:state', () => {
    wrapUpgradeApi();
    const level = Number(context().level || 1);
    store.maxLevelSeen = Math.max(Number(store.maxLevelSeen || 1), level);
    session.max_level = Math.max(Number(session.max_level || 1), level);
    if (!activeRun && gameplayClockEligible()) beginRun('state');
    persistStore();
  });
  document.addEventListener('visibilitychange', syncSessionVisibility);
  window.addEventListener('pagehide', () => endSession('pagehide'));
  window.addEventListener('beforeunload', () => endSession('beforeunload'));

  setInterval(() => {
    syncRunClock();
    persistStore();
  }, HEARTBEAT_MS);
  setInterval(flushRemote, FLUSH_MS);

  if (window.RBTwarAPI) init();
  else window.addEventListener('rbtwar:ready', init, { once:true });
})();