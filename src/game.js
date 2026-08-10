(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const ui = {
    coinCount: document.getElementById('coinCount'),
    starCount: document.getElementById('starCount'),
    worldLabel: document.getElementById('worldLabel'),
    levelProgressText: document.getElementById('levelProgressText'),
    pauseBtn: document.getElementById('pauseBtn'),
    pauseModal: document.getElementById('pauseModal'),
    resumeBtn: document.getElementById('resumeBtn'),
    restartBtn: document.getElementById('restartBtn'),
    homeBtn: document.getElementById('homeBtn'),
    tutorial: document.getElementById('tutorial'),
    tutorialClose: document.getElementById('tutorialClose'),
    selectionPanel: document.getElementById('selectionPanel'),
    selectedSquadLabel: document.getElementById('selectedSquadLabel'),
    selectedSquadType: document.getElementById('selectedSquadType'),
    cancelSelection: document.getElementById('cancelSelection'),
    toast: document.getElementById('toast'),
    startScreen: document.getElementById('startScreen'),
    startBtn: document.getElementById('startBtn'),
    startProgress: document.getElementById('startProgress'),
    startCoins: document.getElementById('startCoins'),
    resultModal: document.getElementById('resultModal'),
    resultEyebrow: document.getElementById('resultEyebrow'),
    resultTitle: document.getElementById('resultTitle'),
    resultStars: document.getElementById('resultStars'),
    resultMessage: document.getElementById('resultMessage'),
    rewardCoins: document.getElementById('rewardCoins'),
    replayBtn: document.getElementById('replayBtn'),
    nextBtn: document.getElementById('nextBtn'),
    prevLevelBtn: document.getElementById('prevLevelBtn'),
    nextUnlockedBtn: document.getElementById('nextUnlockedBtn')
  };

  const STORAGE_KEY = 'rbtwar-save-v3';
  const TEAM = Object.freeze({ PLAYER: 'player', ENEMY: 'enemy', NEUTRAL: 'neutral' });
  const TEAM_COLOR = Object.freeze({ player: '#39aaf7', enemy: '#f25656', neutral: '#c9c0aa' });

  const UNIT_TYPES = Object.freeze({
    basic: { name: 'Básico', speed: 78, hp: 100, damage: 18, fireRate: 0.72, range: 58, production: 4.3 }
  });

  const BIOMES = Object.freeze({
    desert: { name: 'Desierto', ground: '#b99b63', ground2: '#9c7f4d', road: '#735c3e', obstacle: '#5f513f' },
    forest: { name: 'Bosque', ground: '#698856', ground2: '#537044', road: '#6e5b43', obstacle: '#315537' },
    snow: { name: 'Nieve', ground: '#cbdcdf', ground2: '#a9c1c6', road: '#75898e', obstacle: '#60767c' },
    city: { name: 'Ciudad', ground: '#747b84', ground2: '#5d646d', road: '#343b43', obstacle: '#444b53' }
  });

  // Cada número final es la cola inicial de robots. Salen de la base UNO POR UNO.
  const LEVELS = Object.freeze({
    1: {
      biome: 'desert',
      title: 'Tres caminos',
      nodes: [
        ['P-HQ', 0.08, 0.50, TEAM.PLAYER, 'hq', 5],
        ['N-A', 0.29, 0.20, TEAM.NEUTRAL, 'factory', 0],
        ['N-B', 0.39, 0.50, TEAM.NEUTRAL, 'factory', 0],
        ['N-C', 0.29, 0.80, TEAM.NEUTRAL, 'factory', 0],
        ['E-A', 0.68, 0.50, TEAM.ENEMY, 'factory', 2],
        ['E-HQ', 0.92, 0.50, TEAM.ENEMY, 'hq', 5]
      ],
      edges: [[0,1],[0,2],[0,3],[1,4],[2,4],[3,4],[4,5]],
      obstacles: [
        [.17,.38,18,.4],[.18,.66,22,-.2],[.48,.18,17,.25],[.50,.78,20,-.35],[.80,.22,19,.4],[.81,.78,23,-.25]
      ]
    },
    2: {
      biome: 'desert',
      title: 'Cruce de fábricas',
      nodes: [
        ['P-HQ', 0.07, 0.52, TEAM.PLAYER, 'hq', 5],
        ['N-A', 0.25, 0.25, TEAM.NEUTRAL, 'factory', 0],
        ['N-B', 0.30, 0.76, TEAM.NEUTRAL, 'factory', 0],
        ['N-C', 0.48, 0.44, TEAM.NEUTRAL, 'factory', 0],
        ['E-A', 0.64, 0.74, TEAM.ENEMY, 'factory', 3],
        ['E-B', 0.73, 0.25, TEAM.ENEMY, 'factory', 3],
        ['E-HQ', 0.93, 0.52, TEAM.ENEMY, 'hq', 5]
      ],
      edges: [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,6],[5,6]],
      obstacles: [
        [.15,.74,16,.2],[.36,.18,20,-.3],[.43,.78,18,.15],[.57,.22,23,.35],[.79,.72,21,-.2],[.84,.18,17,.15]
      ]
    }
  });

  const defaultSave = () => ({
    coins: 0,
    unlockedLevel: 1,
    currentLevel: 1,
    unitLevels: { basic: 1 },
    firstTimes: {},
    bestTimes: {},
    stars: {},
    tutorialSeen: false
  });

  let save = loadSave();
  let game = null;
  let inMenu = true;
  let paused = false;
  let ended = false;
  let selectedSquadId = null;
  let lastTs = performance.now();
  let toastTimer = null;
  let pointer = { x: -999, y: -999 };
  let view = { w: 844, h: 390, dpr: 1 };

  function loadSave() {
    for (const key of [STORAGE_KEY, 'rbtwar-save-v2', 'rbtwar-save-v1']) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return normalizeSave(JSON.parse(raw));
      } catch (_) {}
    }
    return defaultSave();
  }

  function normalizeSave(data) {
    return {
      ...defaultSave(),
      ...(data || {}),
      unitLevels: { basic: 1, ...((data && data.unitLevels) || {}) },
      firstTimes: { ...((data && data.firstTimes) || {}) },
      bestTimes: { ...((data && data.bestTimes) || {}) },
      stars: { ...((data && data.stars) || {}) }
    };
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    refreshHud();
    refreshStartScreen();
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function mulberry32(seed) {
    return function rand() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function totalStars() {
    return Object.values(save.stars).reduce((sum, n) => sum + Number(n || 0), 0);
  }

  function getBiomeKey(level) {
    if (LEVELS[level]) return LEVELS[level].biome;
    const keys = ['desert', 'forest', 'snow', 'city'];
    return keys[Math.floor((level - 1) / 10) % keys.length];
  }

  function unitStats(team, level) {
    const base = UNIT_TYPES.basic;
    const ownLevel = team === TEAM.PLAYER
      ? Math.max(1, save.unitLevels.basic || 1)
      : Math.max(1, 1 + Math.floor((level - 1) / 3));
    const factor = 1 + (ownLevel - 1) * 0.12;
    const mapDifficulty = team === TEAM.ENEMY ? 1 + Math.min(.32, (level - 1) * .035) : 1;
    return {
      level: ownLevel,
      hp: base.hp * factor * mapDifficulty,
      damage: base.damage * factor * mapDifficulty,
      speed: base.speed * (1 + Math.min(.12, (ownLevel - 1) * .015)),
      fireRate: base.fireRate,
      range: base.range
    };
  }

  function nodeFromData(data, index) {
    const [id, nx, ny, team, kind, initialQueue] = data;
    const hpBase = kind === 'hq' ? 720 : 420;
    return {
      id, index, nx, ny, x: 0, y: 0, team, kind,
      unitType: 'basic',
      spawnQueue: initialQueue,
      spawnCooldown: 0.25 + index * 0.06,
      productionTimer: 0,
      rallySerial: 0,
      captureTeam: null,
      captureProgress: 0,
      maxHp: hpBase,
      hp: hpBase
    };
  }

  function explicitLevel(level) {
    const def = LEVELS[level];
    return {
      title: def.title,
      biome: BIOMES[def.biome],
      nodes: def.nodes.map(nodeFromData),
      edges: def.edges.map(e => [...e]),
      obstacles: def.obstacles.map(([x,y,r,rot]) => ({ x, y, r, rot }))
    };
  }

  function proceduralLevel(level) {
    const rand = mulberry32(2026 + level * 7919);
    const shift = () => (rand() - .5) * .055;
    const q = Math.min(5, 2 + Math.floor(level / 5));
    const nodes = [
      ['P-HQ', .07, .52, TEAM.PLAYER, 'hq', 5],
      ['N-A', .25 + shift(), .24 + shift(), TEAM.NEUTRAL, 'factory', 0],
      ['N-B', .31 + shift(), .76 + shift(), TEAM.NEUTRAL, 'factory', 0],
      ['N-C', .49 + shift(), .48 + shift(), TEAM.NEUTRAL, 'factory', 0],
      ['E-A', .68 + shift(), .70 + shift(), TEAM.ENEMY, 'factory', q],
      ['E-B', .75 + shift(), .25 + shift(), TEAM.ENEMY, 'factory', q],
      ['E-HQ', .93, .50, TEAM.ENEMY, 'hq', 5]
    ];
    const obstacles = Array.from({ length: 7 }, () => ({
      x: .14 + rand() * .72,
      y: .15 + rand() * .70,
      r: 14 + rand() * 11,
      rot: rand() * Math.PI
    }));
    return {
      title: `Operación ${level}`,
      biome: BIOMES[getBiomeKey(level)],
      nodes: nodes.map(nodeFromData),
      edges: [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,6],[5,6]],
      obstacles
    };
  }

  function createLevel(level) {
    const layout = LEVELS[level] ? explicitLevel(level) : proceduralLevel(level);
    layout.nodes.forEach(node => {
      if (node.kind === 'hq') {
        const bonus = Math.max(0, level - 1) * 24;
        node.maxHp += bonus;
        node.hp = node.maxHp;
      }
    });
    return {
      level,
      title: layout.title,
      biome: layout.biome,
      nodes: layout.nodes,
      edges: layout.edges,
      obstacles: layout.obstacles,
      individuals: [],
      squads: [],
      projectiles: [],
      particles: [],
      elapsed: 0,
      aiThink: .8,
      idCounter: 1,
      individualIdCounter: 1
    };
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    view = { w, h, dpr };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    positionNodes();
    repositionWaitingIndividuals();
  }

  function scale() {
    return clamp(Math.min(view.w / 844, view.h / 390), .78, 1.18);
  }

  function positionNodes() {
    if (!game) return;
    const padX = Math.max(24, 28 * scale());
    const padY = Math.max(20, 24 * scale());
    const usableW = Math.max(1, view.w - padX * 2);
    const usableH = Math.max(1, view.h - padY * 2);
    for (const node of game.nodes) {
      node.x = padX + node.nx * usableW;
      node.y = padY + node.ny * usableH;
    }
  }

  function rallyPoint(node, slot = 0) {
    const s = scale();
    const direction = node.x < view.w * .5 ? 1 : -1;
    const row = slot % 5;
    const col = Math.floor((slot % 10) / 5);
    return {
      x: node.x + direction * (39 + col * 15) * s,
      y: node.y + (row - 2) * 10 * s
    };
  }

  function repositionWaitingIndividuals() {
    if (!game) return;
    const grouped = new Map();
    for (const unit of game.individuals) {
      const key = `${unit.homeNode}:${unit.team}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(unit);
    }
    for (const units of grouped.values()) {
      units.forEach((unit, i) => {
        const node = game.nodes[unit.homeNode];
        const target = rallyPoint(node, i);
        unit.targetX = target.x;
        unit.targetY = target.y;
        if (unit.state === 'waiting') {
          unit.x = target.x;
          unit.y = target.y;
        }
      });
    }
  }

  function startLevel(level) {
    inMenu = false;
    save.currentLevel = clamp(level, 1, save.unlockedLevel);
    selectedSquadId = null;
    ended = false;
    paused = false;
    game = createLevel(save.currentLevel);
    resizeCanvas();
    ui.startScreen.classList.add('hidden');
    ui.pauseModal.classList.add('hidden');
    ui.resultModal.classList.add('hidden');
    ui.selectionPanel.classList.add('hidden');
    if (!save.tutorialSeen) ui.tutorial.classList.remove('hidden');
    updateLabels();
    persist();
    lastTs = performance.now();
    showToast(`Mapa ${game.level}: tus robots saldrán de las bases uno por uno.`);
  }

  function showStartScreen() {
    inMenu = true;
    paused = false;
    selectedSquadId = null;
    ui.pauseModal.classList.add('hidden');
    ui.resultModal.classList.add('hidden');
    ui.selectionPanel.classList.add('hidden');
    ui.tutorial.classList.add('hidden');
    ui.startScreen.classList.remove('hidden');
    refreshStartScreen();
  }

  function updateLabels() {
    if (!game) return;
    ui.worldLabel.textContent = `${game.biome.name} · Mapa ${game.level}`;
    ui.levelProgressText.textContent = `Mapa ${game.level} · ${game.title}`;
    ui.prevLevelBtn.disabled = game.level <= 1;
    ui.nextUnlockedBtn.disabled = game.level >= save.unlockedLevel;
  }

  function refreshHud() {
    ui.coinCount.textContent = String(save.coins);
    ui.starCount.textContent = String(totalStars());
    if (game) updateLabels();
  }

  function refreshStartScreen() {
    ui.startProgress.textContent = save.unlockedLevel === 1
      ? 'Mapa 1 desbloqueado'
      : `${save.unlockedLevel} mapas desbloqueados`;
    ui.startCoins.textContent = `${save.coins} monedas`;
    ui.startBtn.textContent = save.currentLevel > 1 ? `CONTINUAR · MAPA ${save.currentLevel}` : 'JUGAR';
  }

  function neighbors(index) {
    const out = [];
    for (const [a, b] of game.edges) {
      if (a === index) out.push(b);
      else if (b === index) out.push(a);
    }
    return out;
  }

  function shortestPath(from, to) {
    if (from === to) return [from];
    const n = game.nodes.length;
    const cost = Array(n).fill(Infinity);
    const prev = Array(n).fill(-1);
    const used = Array(n).fill(false);
    cost[from] = 0;
    for (let step = 0; step < n; step++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!used[i] && cost[i] < best) { best = cost[i]; u = i; }
      }
      if (u === -1 || u === to) break;
      used[u] = true;
      for (const v of neighbors(u)) {
        const alt = cost[u] + distance(game.nodes[u], game.nodes[v]);
        if (alt < cost[v]) { cost[v] = alt; prev[v] = u; }
      }
    }
    const path = [];
    let cursor = to;
    while (cursor !== -1) {
      path.unshift(cursor);
      if (cursor === from) break;
      cursor = prev[cursor];
    }
    return path[0] === from ? path : [from];
  }

  function nearestNodeIndex(x, y) {
    let best = 0;
    let bestD = Infinity;
    game.nodes.forEach((node, i) => {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function waitingIndividuals(nodeIndex, team) {
    return game.individuals.filter(u => u.homeNode === nodeIndex && u.team === team && u.state === 'waiting');
  }

  function spawnIndividual(node) {
    if (node.team === TEAM.NEUTRAL || node.hp <= 0) return;
    const stats = unitStats(node.team, game.level);
    const unitsAtNode = game.individuals.filter(u => u.homeNode === node.index && u.team === node.team).length;
    const target = rallyPoint(node, unitsAtNode);
    game.individuals.push({
      id: game.individualIdCounter++,
      team: node.team,
      type: node.unitType,
      level: stats.level,
      homeNode: node.index,
      x: node.x,
      y: node.y,
      targetX: target.x,
      targetY: target.y,
      speed: 52,
      state: 'exiting'
    });
    spawnBurst(node.x, node.y, TEAM_COLOR[node.team], 4);
  }

  function formSquadFromIndividuals(node, team, maxCount = 5) {
    const available = waitingIndividuals(node.index, team).slice(0, maxCount);
    if (!available.length) return null;
    const stats = unitStats(team, game.level);
    const count = available.length;
    const ids = new Set(available.map(u => u.id));
    const x = available.reduce((sum, u) => sum + u.x, 0) / count;
    const y = available.reduce((sum, u) => sum + u.y, 0) / count;
    game.individuals = game.individuals.filter(u => !ids.has(u.id));
    const squad = {
      id: game.idCounter++, team, type: node.unitType, level: stats.level, count,
      unitHp: stats.hp, hp: stats.hp * count, maxHp: stats.hp * count,
      damage: stats.damage, speed: stats.speed, fireRate: stats.fireRate, range: stats.range,
      x, y, currentNode: node.index, path: [], targetNode: null,
      fireTimer: 0, combatTargetId: null, selected: false
    };
    game.squads.push(squad);
    repositionWaitingIndividuals();
    return squad;
  }

  function autoFormFullSquads() {
    for (const node of game.nodes) {
      for (const team of [TEAM.PLAYER, TEAM.ENEMY]) {
        while (waitingIndividuals(node.index, team).length >= 5) {
          formSquadFromIndividuals(node, team, 5);
        }
      }
    }
  }

  function promoteThreatenedIndividuals() {
    for (const node of game.nodes) {
      if (node.team === TEAM.NEUTRAL) continue;
      const enemyClose = game.squads.some(s => s.hp > 0 && s.team !== node.team && distance(s, node) <= 90 * scale());
      if (!enemyClose) continue;
      const available = waitingIndividuals(node.index, node.team);
      if (available.length) formSquadFromIndividuals(node, node.team, Math.min(5, available.length));
    }
  }

  function getSquad(id) { return game.squads.find(s => s.id === id); }

  function selectSquad(squad) {
    game.squads.forEach(s => { s.selected = false; });
    squad.selected = true;
    selectedSquadId = squad.id;
    ui.selectedSquadLabel.textContent = `${squad.count} robot${squad.count === 1 ? '' : 's'}`;
    ui.selectedSquadType.textContent = `${UNIT_TYPES[squad.type].name} Nv. ${squad.level}`;
    ui.selectionPanel.classList.remove('hidden');
  }

  function deselectSquad() {
    if (game) game.squads.forEach(s => { s.selected = false; });
    selectedSquadId = null;
    ui.selectionPanel.classList.add('hidden');
  }

  function sendSquad(squad, targetNodeIndex) {
    if (!squad || squad.team !== TEAM.PLAYER || squad.hp <= 0) return;
    const from = nearestNodeIndex(squad.x, squad.y);
    const path = shortestPath(from, targetNodeIndex);
    if (from !== targetNodeIndex && path.length <= 1) {
      showToast('No existe una ruta hacia esa base.');
      return;
    }
    squad.currentNode = from;
    squad.path = path.slice(1);
    squad.targetNode = targetNodeIndex;
    squad.combatTargetId = null;
    deselectSquad();
  }

  function update(dt) {
    if (!game || inMenu || paused || ended) return;
    game.elapsed += dt;
    updateProduction(dt);
    updateIndividuals(dt);
    autoFormFullSquads();
    promoteThreatenedIndividuals();
    updateAI(dt);
    updateMovement(dt);
    updateCombat(dt);
    updateCapture(dt);
    updateEffects(dt);
    mergeSquads();
    cleanupDead();
    checkDefeat();
  }

  function updateProduction(dt) {
    for (const node of game.nodes) {
      if (node.team === TEAM.NEUTRAL || node.hp <= 0) continue;

      if (node.spawnQueue > 0) {
        node.spawnCooldown -= dt;
        if (node.spawnCooldown <= 0) {
          spawnIndividual(node);
          node.spawnQueue -= 1;
          node.spawnCooldown = .48;
        }
        continue;
      }

      node.productionTimer += dt;
      const baseInterval = UNIT_TYPES[node.unitType].production;
      const enemyBoost = node.team === TEAM.ENEMY ? Math.max(.76, 1 - (game.level - 1) * .018) : 1;
      const interval = baseInterval * enemyBoost;
      if (node.productionTimer >= interval) {
        node.productionTimer -= interval;
        spawnIndividual(node);
      }
    }
  }

  function updateIndividuals(dt) {
    for (const unit of game.individuals) {
      if (unit.state !== 'exiting') continue;
      const dx = unit.targetX - unit.x;
      const dy = unit.targetY - unit.y;
      const d = Math.hypot(dx, dy);
      const step = unit.speed * dt;
      if (d <= step + 1) {
        unit.x = unit.targetX;
        unit.y = unit.targetY;
        unit.state = 'waiting';
      } else {
        unit.x += dx / d * step;
        unit.y += dy / d * step;
      }
    }
  }

  function updateAI(dt) {
    game.aiThink -= dt;
    if (game.aiThink > 0) return;
    game.aiThink = Math.max(1.15, 2.55 - game.level * .035);
    const idle = game.squads.filter(s => s.team === TEAM.ENEMY && s.hp > 0 && !s.path.length && !s.combatTargetId);
    for (const squad of idle) {
      const from = nearestNodeIndex(squad.x, squad.y);
      const candidates = game.nodes
        .map((node, i) => ({ node, i, path: shortestPath(from, i) }))
        .filter(x => x.node.team !== TEAM.ENEMY && x.path.length > 1)
        .sort((a, b) => {
          const ap = a.node.kind === 'hq' && a.node.team === TEAM.PLAYER ? -1.5 : 0;
          const bp = b.node.kind === 'hq' && b.node.team === TEAM.PLAYER ? -1.5 : 0;
          return (a.path.length + ap) - (b.path.length + bp);
        });
      if (!candidates.length) continue;
      const target = candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(2, candidates.length)))];
      squad.path = target.path.slice(1);
      squad.targetNode = target.i;
    }
  }

  function updateMovement(dt) {
    for (const squad of game.squads) {
      if (squad.hp <= 0 || squad.combatTargetId || !squad.path.length) continue;
      const nextIndex = squad.path[0];
      const target = game.nodes[nextIndex];
      const dx = target.x - squad.x;
      const dy = target.y - squad.y;
      const d = Math.hypot(dx, dy);
      const step = squad.speed * dt;
      if (d <= step + 2) {
        squad.x = target.x;
        squad.y = target.y;
        squad.currentNode = nextIndex;
        squad.path.shift();
      } else {
        squad.x += dx / d * step;
        squad.y += dy / d * step;
      }
    }
  }

  function nearestEnemySquad(squad) {
    let target = null;
    let best = Infinity;
    for (const other of game.squads) {
      if (other.team === squad.team || other.hp <= 0) continue;
      const d = distance(squad, other);
      if (d < best) { best = d; target = other; }
    }
    return target;
  }

  function nodeUnderSquad(squad) {
    const radius = 38 * scale();
    return game.nodes.find(node => distance(squad, node) <= radius) || null;
  }

  function updateCombat(dt) {
    for (const squad of game.squads) {
      if (squad.hp <= 0) continue;
      squad.fireTimer -= dt;
      let target = squad.combatTargetId ? getSquad(squad.combatTargetId) : null;
      if (target && (target.hp <= 0 || distance(squad, target) > squad.range * 1.45)) {
        squad.combatTargetId = null;
        target = null;
      }
      if (!target) {
        const candidate = nearestEnemySquad(squad);
        if (candidate && distance(squad, candidate) <= squad.range) {
          target = candidate;
          squad.combatTargetId = candidate.id;
          squad.path = [];
        }
      }
      if (target && squad.fireTimer <= 0) {
        squad.fireTimer = squad.fireRate;
        target.hp -= squad.damage * squad.count * .52;
        syncCount(target);
        spawnShot(squad, target, squad.team);
        continue;
      }
      const node = nodeUnderSquad(squad);
      if (node && node.kind === 'hq' && node.team !== squad.team && node.team !== TEAM.NEUTRAL) {
        squad.path = [];
        if (squad.fireTimer <= 0) {
          squad.fireTimer = squad.fireRate;
          node.hp -= squad.damage * squad.count * .40;
          spawnShot(squad, node, squad.team);
          if (node.hp <= 0) {
            node.hp = 0;
            if (squad.team === TEAM.PLAYER) winLevel();
            else loseLevel();
          }
        }
      }
    }
  }

  function syncCount(squad) {
    const next = clamp(Math.ceil(Math.max(0, squad.hp) / squad.unitHp), 0, 5);
    squad.count = next;
    squad.maxHp = squad.unitHp * Math.max(1, next);
    if (next > 0) squad.hp = Math.min(squad.hp, squad.maxHp);
  }

  function updateCapture(dt) {
    const captureRadius = 42 * scale();
    for (const node of game.nodes) {
      if (node.kind === 'hq' || node.hp <= 0) continue;
      const nearby = game.squads.filter(s => s.hp > 0 && distance(s, node) <= captureRadius);
      const teams = [...new Set(nearby.map(s => s.team))];
      if (teams.length !== 1) {
        node.captureProgress = Math.max(0, node.captureProgress - dt * .6);
        if (node.captureProgress === 0) node.captureTeam = null;
        continue;
      }
      const team = teams[0];
      if (team === node.team) {
        node.captureProgress = 0;
        node.captureTeam = null;
        continue;
      }
      node.captureTeam = team;
      node.captureProgress += dt;
      if (node.captureProgress >= 2.6) {
        node.team = team;
        node.spawnQueue = 0;
        node.spawnCooldown = .35;
        node.productionTimer = 0;
        node.captureProgress = 0;
        node.captureTeam = null;
        spawnBurst(node.x, node.y, TEAM_COLOR[team], 10);
        if (team === TEAM.PLAYER) showToast('Base conquistada. Sus próximos robots saldrán uno por uno para ti.');
      }
    }
  }

  function mergeSquads() {
    for (let i = 0; i < game.squads.length; i++) {
      const a = game.squads[i];
      if (a.hp <= 0 || a.count >= 5 || a.path.length || a.combatTargetId) continue;
      for (let j = i + 1; j < game.squads.length; j++) {
        const b = game.squads[j];
        if (b.hp <= 0 || b.team !== a.team || b.type !== a.type || b.path.length || b.combatTargetId) continue;
        if (distance(a, b) > 30 * scale()) continue;
        const take = Math.min(5 - a.count, b.count);
        if (take <= 0) continue;
        a.count += take;
        a.hp += b.unitHp * take;
        a.maxHp = a.unitHp * a.count;
        b.count -= take;
        b.hp = b.unitHp * b.count;
        b.maxHp = b.unitHp * Math.max(1, b.count);
      }
    }
  }

  function updateEffects(dt) {
    for (const p of game.projectiles) p.life -= dt;
    game.projectiles = game.projectiles.filter(p => p.life > 0);
    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    game.particles = game.particles.filter(p => p.life > 0);
  }

  function cleanupDead() {
    const selectedGone = selectedSquadId && !game.squads.some(s => s.id === selectedSquadId && s.hp > 0 && s.count > 0);
    game.squads = game.squads.filter(s => s.hp > 0 && s.count > 0);
    if (selectedGone) deselectSquad();
  }

  function checkDefeat() {
    if (ended) return;
    const hq = game.nodes.find(n => n.id === 'P-HQ');
    if (!hq || hq.hp <= 0) loseLevel();
  }

  function computeStars(level, elapsed) {
    const first = save.firstTimes[String(level)];
    if (!first) return 1;
    if (elapsed <= first * .80) return 3;
    if (elapsed <= first * .90) return 2;
    return 1;
  }

  function winLevel() {
    if (ended) return;
    ended = true;
    const key = String(game.level);
    const elapsed = game.elapsed;
    const firstWin = !save.firstTimes[key];
    if (firstWin) save.firstTimes[key] = elapsed;
    save.bestTimes[key] = Math.min(save.bestTimes[key] || Infinity, elapsed);
    const stars = computeStars(game.level, elapsed);
    save.stars[key] = Math.max(save.stars[key] || 0, stars);
    const baseReward = 80 + game.level * 15;
    const reward = Math.round((firstWin ? baseReward : baseReward * .35) * (1 + (stars - 1) * .30));
    save.coins += reward;
    save.unlockedLevel = Math.max(save.unlockedLevel, game.level + 1);
    persist();
    ui.resultEyebrow.textContent = 'VICTORIA';
    ui.resultTitle.textContent = `Mapa ${game.level} completado`;
    ui.resultStars.textContent = '⭐'.repeat(stars);
    ui.resultMessage.textContent = firstWin
      ? 'Tu primer tiempo quedó guardado internamente como referencia.'
      : stars === 3
        ? 'Mejoraste al menos 20% tu tiempo inicial.'
        : stars === 2
          ? 'Mejoraste al menos 10% tu tiempo inicial.'
          : 'Puedes repetir el mapa para mejorar tu marca.';
    ui.rewardCoins.textContent = `+${reward} 🪙`;
    ui.nextBtn.classList.remove('hidden');
    ui.resultModal.classList.remove('hidden');
  }

  function loseLevel() {
    if (ended) return;
    ended = true;
    ui.resultEyebrow.textContent = 'DERROTA';
    ui.resultTitle.textContent = 'CORE azul destruido';
    ui.resultStars.textContent = '';
    ui.resultMessage.textContent = 'Repite este mapa o vuelve a uno anterior para reunir monedas.';
    ui.rewardCoins.textContent = '+0 🪙';
    ui.nextBtn.classList.add('hidden');
    ui.resultModal.classList.remove('hidden');
  }

  function spawnShot(from, to, team) {
    game.projectiles.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, life: .10, maxLife: .10, color: TEAM_COLOR[team] });
  }

  function spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 44;
      game.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .35 + Math.random() * .25, maxLife: .60, color });
    }
  }

  function draw() {
    if (!game) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawGround();
    drawRoads();
    drawObstacles();
    drawBases();
    drawIndividuals();
    drawSquads();
    drawEffects();
  }

  function drawGround() {
    ctx.fillStyle = game.biome.ground;
    ctx.fillRect(0, 0, view.w, view.h);
    const s = scale();
    const step = 64 * s;
    ctx.globalAlpha = .15;
    ctx.fillStyle = game.biome.ground2;
    for (let y = 0; y < view.h + step; y += step) {
      for (let x = 0; x < view.w + step; x += step) {
        ctx.beginPath();
        ctx.ellipse(x + ((y / step) % 2) * step * .3, y, step * .32, step * .16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRoads() {
    const s = scale();
    ctx.lineCap = 'round';
    for (const [a, b] of game.edges) {
      const p1 = game.nodes[a];
      const p2 = game.nodes[b];
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      ctx.lineWidth = 24 * s;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.strokeStyle = game.biome.road;
      ctx.lineWidth = 18 * s;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([6 * s, 10 * s]);
      ctx.strokeStyle = 'rgba(255,255,255,.11)';
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawObstacles() {
    const s = scale();
    for (const o of game.obstacles) {
      const x = o.x * view.w;
      const y = o.y * view.h;
      const r = o.r * s;
      if (game.nodes.some(n => Math.hypot(n.x - x, n.y - y) < r + 42 * s)) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.rot);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.beginPath(); ctx.ellipse(3*s, 6*s, r, r*.55, 0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = game.biome.obstacle;
      ctx.beginPath(); ctx.roundRect(-r, -r*.40, r*2, r*.80, r*.28); ctx.fill();
      ctx.restore();
    }
  }

  function readyCount(node) {
    return game.individuals.filter(u => u.homeNode === node.index && u.team === node.team).length;
  }

  function drawBases() {
    const s = scale();
    for (const node of game.nodes) {
      const r = (node.kind === 'hq' ? 31 : 25) * s;
      const color = TEAM_COLOR[node.team];
      const hover = Math.hypot(pointer.x - node.x, pointer.y - node.y) <= r * 1.5;
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.fillStyle = 'rgba(0,0,0,.23)';
      ctx.beginPath(); ctx.ellipse(3*s, 8*s, r*1.08, r*.58, 0,0,Math.PI*2); ctx.fill();
      if (hover || selectedSquadId) {
        ctx.strokeStyle = hover ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.13)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.34, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#17232d';
      ctx.strokeStyle = color;
      ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.roundRect(-r*.84, -r*.70, r*1.68, r*1.40, 8*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.globalAlpha = .22;
      ctx.beginPath(); ctx.roundRect(-r*.62, -r*.50, r*1.24, r*.42, 4*s); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8f5ff';
      ctx.font = `800 ${Math.max(9, 10.5*s)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.kind === 'hq' ? 'CORE' : 'RBT', 0, -r*.25);
      ctx.strokeStyle = '#e7f4fe';
      ctx.lineWidth = 1.7 * s;
      ctx.beginPath(); ctx.moveTo(r*.70, -r*.88); ctx.lineTo(r*.70, -r*1.48); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(r*.70, -r*1.46); ctx.lineTo(r*1.23, -r*1.27); ctx.lineTo(r*.70, -r*1.08); ctx.closePath(); ctx.fill();
      if (node.kind === 'hq') {
        const w = r * 1.48;
        ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(-w/2, r*.82, w, 4*s);
        ctx.fillStyle = color; ctx.fillRect(-w/2, r*.82, w * clamp(node.hp/node.maxHp,0,1), 4*s);
      } else if (node.team !== TEAM.NEUTRAL) {
        const count = readyCount(node);
        ctx.fillStyle = 'rgba(0,0,0,.47)';
        ctx.beginPath(); ctx.roundRect(-19*s, r*.76, 38*s, 16*s, 7*s); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `800 ${9*s}px system-ui`;
        ctx.fillText(`${Math.min(count,5)}/5`, 0, r*1.02);
      }
      if (node.captureTeam) {
        const p = clamp(node.captureProgress / 2.6, 0, 1);
        ctx.strokeStyle = TEAM_COLOR[node.captureTeam];
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.arc(0, 0, r*1.48, -Math.PI/2, -Math.PI/2 + Math.PI*2*p);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawRobot(x, y, color, size) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(x + 1.5*size, y + 4.5*size, 6.2*size, 3.2*size, 0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#263746';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8 * size;
    ctx.beginPath(); ctx.roundRect(x-5.5*size, y-6*size, 11*size, 12*size, 2.4*size); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x-2.2*size, y-1*size, 1.2*size, 0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+2.2*size, y-1*size, 1.2*size, 0,Math.PI*2); ctx.fill();
  }

  function drawIndividuals() {
    const s = scale();
    for (const unit of game.individuals) {
      drawRobot(unit.x, unit.y, TEAM_COLOR[unit.team], .82 * s);
    }
  }

  function formationOffsets(count, gap) {
    const presets = {
      1: [[0,0]],
      2: [[-gap*.5,0],[gap*.5,0]],
      3: [[-gap*.55,gap*.30],[gap*.55,gap*.30],[0,-gap*.45]],
      4: [[-gap*.5,-gap*.5],[gap*.5,-gap*.5],[-gap*.5,gap*.5],[gap*.5,gap*.5]],
      5: [[-gap*.55,-gap*.55],[gap*.55,-gap*.55],[-gap*.55,gap*.55],[gap*.55,gap*.55],[0,0]]
    };
    return presets[clamp(count,1,5)] || presets[1];
  }

  function drawSquads() {
    const s = scale();
    for (const squad of game.squads) {
      const color = TEAM_COLOR[squad.team];
      const offsets = formationOffsets(squad.count, 15 * s);
      if (squad.selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * s;
        ctx.setLineDash([4*s, 4*s]);
        ctx.beginPath(); ctx.arc(squad.x, squad.y, 26*s, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const [ox, oy] of offsets) drawRobot(squad.x + ox, squad.y + oy, color, s);
      const hpRatio = clamp(squad.hp / Math.max(1, squad.maxHp), 0, 1);
      if (hpRatio < .99) {
        const w = 32 * s;
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(squad.x-w/2, squad.y-27*s, w, 3*s);
        ctx.fillStyle = color; ctx.fillRect(squad.x-w/2, squad.y-27*s, w*hpRatio, 3*s);
      }
    }
  }

  function drawEffects() {
    const s = scale();
    for (const p of game.projectiles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath(); ctx.moveTo(p.x1,p.y1); ctx.lineTo(p.x2,p.y2); ctx.stroke();
    }
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.2*s,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function getPointerPosition(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleCanvasTap(e) {
    if (!game || inMenu || paused || ended) return;
    e.preventDefault();
    const p = getPointerPosition(e);
    pointer = p;
    const s = scale();

    const squad = game.squads
      .filter(q => q.team === TEAM.PLAYER && q.hp > 0)
      .map(q => ({ q, d: distance(p, q) }))
      .sort((a,b) => a.d - b.d)[0];
    if (squad && squad.d <= 38 * s) {
      selectSquad(squad.q);
      return;
    }

    const nodeHit = game.nodes
      .map(node => ({ node, d: distance(p, node) }))
      .sort((a,b) => a.d - b.d)[0];

    if (nodeHit && nodeHit.d <= 50 * s) {
      if (selectedSquadId) {
        sendSquad(getSquad(selectedSquadId), nodeHit.node.index);
        return;
      }

      if (nodeHit.node.team === TEAM.PLAYER) {
        const available = waitingIndividuals(nodeHit.node.index, TEAM.PLAYER);
        if (available.length) {
          const newSquad = formSquadFromIndividuals(nodeHit.node, TEAM.PLAYER, Math.min(5, available.length));
          if (newSquad) {
            selectSquad(newSquad);
            showToast(`Pelotón de ${newSquad.count}. Toca una base objetivo.`);
          }
          return;
        }
        showToast('Todavía están saliendo robots de esta base.');
        return;
      }
    }

    deselectSquad();
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1900);
  }

  function loop(ts) {
    const dt = Math.min(.033, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    resizeCanvas();
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointerdown', e => canvas.setPointerCapture?.(e.pointerId));
  canvas.addEventListener('pointermove', e => { pointer = getPointerPosition(e); });
  canvas.addEventListener('pointerup', handleCanvasTap);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  ui.startBtn.addEventListener('click', () => startLevel(save.currentLevel));
  ui.cancelSelection.addEventListener('click', deselectSquad);
  ui.tutorialClose.addEventListener('click', () => {
    ui.tutorial.classList.add('hidden');
    save.tutorialSeen = true;
    persist();
  });
  ui.pauseBtn.addEventListener('click', () => {
    if (inMenu || ended) return;
    paused = true;
    ui.pauseModal.classList.remove('hidden');
  });
  ui.resumeBtn.addEventListener('click', () => {
    paused = false;
    ui.pauseModal.classList.add('hidden');
    lastTs = performance.now();
  });
  ui.restartBtn.addEventListener('click', () => startLevel(game.level));
  ui.homeBtn.addEventListener('click', showStartScreen);
  ui.replayBtn.addEventListener('click', () => startLevel(game.level));
  ui.nextBtn.addEventListener('click', () => startLevel(Math.min(save.unlockedLevel, game.level + 1)));
  ui.prevLevelBtn.addEventListener('click', () => startLevel(game.level - 1));
  ui.nextUnlockedBtn.addEventListener('click', () => startLevel(game.level + 1));
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120), { passive: true });

  game = createLevel(save.currentLevel);
  resizeCanvas();
  refreshHud();
  refreshStartScreen();
  showStartScreen();
  requestAnimationFrame(loop);
})();
