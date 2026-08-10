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

  const STORAGE_KEY = 'rbtwar-save-v4';
  const TEAM = Object.freeze({ PLAYER: 'player', ENEMY: 'enemy', NEUTRAL: 'neutral' });
  const TEAM_COLOR = Object.freeze({
    player: '#36b8ff',
    enemy: '#ff5d68',
    neutral: '#c9c0aa'
  });

  const UNIT_TYPES = Object.freeze({
    basic: {
      name: 'Básico',
      speed: 76,
      hp: 100,
      damage: 17,
      fireRate: 0.86,
      range: 88,
      production: 5.4,
      projectileSpeed: 330
    }
  });

  const BIOMES = Object.freeze({
    desert: { name: 'Desierto', ground: '#b99b63', ground2: '#9c7f4d', road: '#735c3e', obstacle: '#5f513f' },
    forest: { name: 'Bosque', ground: '#698856', ground2: '#537044', road: '#6e5b43', obstacle: '#315537' },
    snow: { name: 'Nieve', ground: '#cbdcdf', ground2: '#a9c1c6', road: '#75898e', obstacle: '#60767c' },
    city: { name: 'Ciudad', ground: '#747b84', ground2: '#5d646d', road: '#343b43', obstacle: '#444b53' }
  });

  const LEVELS = Object.freeze({
    1: {
      biome: 'desert',
      title: 'Tres caminos',
      aiDelay: 11,
      playerProduction: 0.90,
      enemyProduction: 1.35,
      enemyHp: 0.84,
      enemyDamage: 0.78,
      initialSpawnInterval: 1.85,
      playerCoreHp: 900,
      enemyCoreHp: 570,
      nodes: [
        ['P-HQ', 0.08, 0.50, TEAM.PLAYER, 'hq', 5],
        ['N-A', 0.29, 0.20, TEAM.NEUTRAL, 'factory', 0],
        ['N-B', 0.39, 0.50, TEAM.NEUTRAL, 'factory', 0],
        ['N-C', 0.29, 0.80, TEAM.NEUTRAL, 'factory', 0],
        ['E-A', 0.68, 0.50, TEAM.ENEMY, 'factory', 0],
        ['E-HQ', 0.92, 0.50, TEAM.ENEMY, 'hq', 2]
      ],
      edges: [[0,1],[0,2],[0,3],[1,4],[2,4],[3,4],[4,5]],
      obstacles: [
        [.17,.38,18,.4],[.18,.66,22,-.2],[.48,.18,17,.25],[.50,.78,20,-.35],[.80,.22,19,.4],[.81,.78,23,-.25]
      ]
    },
    2: {
      biome: 'desert',
      title: 'Cruce de fábricas',
      aiDelay: 6,
      playerProduction: 1,
      enemyProduction: 1.02,
      enemyHp: 1,
      enemyDamage: 1,
      initialSpawnInterval: 1.65,
      playerCoreHp: 820,
      enemyCoreHp: 760,
      nodes: [
        ['P-HQ', 0.07, 0.52, TEAM.PLAYER, 'hq', 5],
        ['N-A', 0.25, 0.25, TEAM.NEUTRAL, 'factory', 0],
        ['N-B', 0.30, 0.76, TEAM.NEUTRAL, 'factory', 0],
        ['N-C', 0.48, 0.44, TEAM.NEUTRAL, 'factory', 0],
        ['E-A', 0.64, 0.74, TEAM.ENEMY, 'factory', 2],
        ['E-B', 0.73, 0.25, TEAM.ENEMY, 'factory', 2],
        ['E-HQ', 0.93, 0.52, TEAM.ENEMY, 'hq', 4]
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
    for (const key of [STORAGE_KEY, 'rbtwar-save-v3', 'rbtwar-save-v2', 'rbtwar-save-v1']) {
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

  function getLevelConfig(level) {
    if (LEVELS[level]) return LEVELS[level];
    return {
      biome: getBiomeKey(level),
      title: `Operación ${level}`,
      aiDelay: Math.max(2.5, 5.5 - level * .05),
      playerProduction: 1,
      enemyProduction: Math.max(.76, 1 - (level - 2) * .012),
      enemyHp: 1 + Math.min(.36, (level - 2) * .025),
      enemyDamage: 1 + Math.min(.32, (level - 2) * .022),
      initialSpawnInterval: 1.55,
      playerCoreHp: 820 + level * 18,
      enemyCoreHp: 760 + level * 26
    };
  }

  function getBiomeKey(level) {
    if (LEVELS[level]) return LEVELS[level].biome;
    const keys = ['desert', 'forest', 'snow', 'city'];
    return keys[Math.floor((level - 1) / 10) % keys.length];
  }

  function unitStats(team, level) {
    const base = UNIT_TYPES.basic;
    const cfg = getLevelConfig(level);
    const ownLevel = team === TEAM.PLAYER
      ? Math.max(1, save.unitLevels.basic || 1)
      : Math.max(1, 1 + Math.floor((level - 1) / 3));
    const upgrade = 1 + (ownLevel - 1) * 0.12;
    const teamHp = team === TEAM.ENEMY ? cfg.enemyHp : 1;
    const teamDamage = team === TEAM.ENEMY ? cfg.enemyDamage : 1;
    return {
      level: ownLevel,
      hp: base.hp * upgrade * teamHp,
      damage: base.damage * upgrade * teamDamage,
      speed: base.speed * (1 + Math.min(.12, (ownLevel - 1) * .015)),
      fireRate: base.fireRate,
      range: base.range,
      projectileSpeed: base.projectileSpeed
    };
  }

  function nodeFromData(data, index, level) {
    const [id, nx, ny, team, kind, initialQueue] = data;
    const cfg = getLevelConfig(level);
    let maxHp = kind === 'hq' ? 760 : 420;
    if (kind === 'hq' && team === TEAM.PLAYER) maxHp = cfg.playerCoreHp;
    if (kind === 'hq' && team === TEAM.ENEMY) maxHp = cfg.enemyCoreHp;
    return {
      id, index, nx, ny, x: 0, y: 0, team, kind,
      unitType: 'basic',
      spawnQueue: initialQueue,
      spawnCooldown: 0.9 + index * .08,
      productionTimer: 0,
      captureTeam: null,
      captureProgress: 0,
      maxHp,
      hp: maxHp
    };
  }

  function explicitLevel(level) {
    const def = LEVELS[level];
    return {
      title: def.title,
      biome: BIOMES[def.biome],
      nodes: def.nodes.map((data, i) => nodeFromData(data, i, level)),
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
      nodes: nodes.map((data, i) => nodeFromData(data, i, level)),
      edges: [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,6],[5,6]],
      obstacles
    };
  }

  function createLevel(level) {
    const layout = LEVELS[level] ? explicitLevel(level) : proceduralLevel(level);
    return {
      level,
      config: getLevelConfig(level),
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
      individualIdCounter: 1,
      projectileIdCounter: 1
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
      x: node.x + direction * (45 + col * 16) * s,
      y: node.y + (row - 2) * 11 * s
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
    showToast(game.level === 1 ? 'Nivel fácil: reúne tu primer pelotón y conquista una base.' : `Mapa ${game.level}: destruye el CORE rojo.`);
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
    if (!ui.startProgress) return;
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

  function allIndividualsAtNode(nodeIndex, team) {
    return game.individuals.filter(u => u.homeNode === nodeIndex && u.team === team);
  }

  function spawnIndividual(node) {
    if (node.team === TEAM.NEUTRAL || node.hp <= 0) return;
    const stats = unitStats(node.team, game.level);
    const unitsAtNode = allIndividualsAtNode(node.index, node.team).length;
    const target = rallyPoint(node, unitsAtNode);
    game.individuals.push({
      id: game.individualIdCounter++,
      team: node.team,
      type: node.unitType,
      level: stats.level,
      homeNode: node.index,
      x: node.x,
      y: node.y + 4 * scale(),
      targetX: target.x,
      targetY: target.y,
      speed: 48,
      state: 'exiting',
      walkPhase: Math.random() * Math.PI * 2
    });
    spawnBurst(node.x, node.y + 5 * scale(), TEAM_COLOR[node.team], 3);
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
      damage: stats.damage, speed: stats.speed, fireRate: stats.fireRate,
      range: stats.range, projectileSpeed: stats.projectileSpeed,
      x, y, currentNode: node.index, path: [], targetNode: null,
      fireTimer: .15, combatTargetId: null, selected: false,
      bob: Math.random() * Math.PI * 2
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
      const enemyClose = game.squads.some(s => s.hp > 0 && s.team !== node.team && distance(s, node) <= 105 * scale());
      if (!enemyClose) continue;
      const available = waitingIndividuals(node.index, node.team);
      if (available.length) formSquadFromIndividuals(node, node.team, Math.min(5, available.length));
    }
  }

  function getSquad(id) { return game.squads.find(s => s.id === id); }
  function getNodeById(id) { return game.nodes.find(n => n.id === id); }

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

  function productionInterval(node) {
    const base = UNIT_TYPES[node.unitType].production;
    const mult = node.team === TEAM.ENEMY ? game.config.enemyProduction : game.config.playerProduction;
    return base * mult;
  }

  function nextSpawnSeconds(node) {
    if (node.team === TEAM.NEUTRAL || node.hp <= 0) return null;
    if (node.spawnQueue > 0) return Math.max(0, node.spawnCooldown);
    return Math.max(0, productionInterval(node) - node.productionTimer);
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
    updateProjectiles(dt);
    updateCapture(dt);
    updateParticles(dt);
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
          node.spawnCooldown = game.config.initialSpawnInterval;
        }
        continue;
      }

      node.productionTimer += dt;
      const interval = productionInterval(node);
      if (node.productionTimer >= interval) {
        node.productionTimer -= interval;
        spawnIndividual(node);
      }
    }
  }

  function updateIndividuals(dt) {
    for (const unit of game.individuals) {
      unit.walkPhase += dt * 8;
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
    if (game.elapsed < game.config.aiDelay) return;
    game.aiThink -= dt;
    if (game.aiThink > 0) return;
    game.aiThink = Math.max(1.25, 2.65 - game.level * .035);
    const idle = game.squads.filter(s => s.team === TEAM.ENEMY && s.hp > 0 && !s.path.length && !s.combatTargetId);
    for (const squad of idle) {
      const from = nearestNodeIndex(squad.x, squad.y);
      const candidates = game.nodes
        .map((node, i) => ({ node, i, path: shortestPath(from, i) }))
        .filter(x => x.node.team !== TEAM.ENEMY && x.path.length > 1)
        .sort((a, b) => {
          const aScore = a.path.length + (a.node.team === TEAM.NEUTRAL ? -0.5 : 0) + (a.node.kind === 'hq' ? 1.4 : 0);
          const bScore = b.path.length + (b.node.team === TEAM.NEUTRAL ? -0.5 : 0) + (b.node.kind === 'hq' ? 1.4 : 0);
          return aScore - bScore;
        });
      if (!candidates.length) continue;
      const target = candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(2, candidates.length)))];
      squad.path = target.path.slice(1);
      squad.targetNode = target.i;
    }
  }

  function updateMovement(dt) {
    for (const squad of game.squads) {
      squad.bob += dt * 4;
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

  function squadBodyRadius(squad) {
    return (squad.count >= 4 ? 22 : squad.count >= 2 ? 17 : 12) * scale();
  }

  function effectiveSquadDistance(a, b) {
    return Math.max(0, distance(a, b) - squadBodyRadius(a) - squadBodyRadius(b));
  }

  function nearestEnemyInRange(squad) {
    let target = null;
    let best = Infinity;
    for (const other of game.squads) {
      if (other.team === squad.team || other.hp <= 0) continue;
      const d = effectiveSquadDistance(squad, other);
      if (d <= squad.range && d < best) {
        best = d;
        target = other;
      }
    }
    return target;
  }

  function nodeUnderSquad(squad) {
    const radius = 40 * scale();
    return game.nodes.find(node => distance(squad, node) <= radius) || null;
  }

  function updateCombat(dt) {
    for (const squad of game.squads) {
      if (squad.hp <= 0) continue;
      squad.fireTimer -= dt;

      let target = squad.combatTargetId ? getSquad(squad.combatTargetId) : null;
      if (target && (target.hp <= 0 || effectiveSquadDistance(squad, target) > squad.range * 1.22)) {
        squad.combatTargetId = null;
        target = null;
      }

      if (!target) {
        target = nearestEnemyInRange(squad);
        if (target) {
          squad.combatTargetId = target.id;
          squad.path = [];
        }
      }

      if (target && squad.fireTimer <= 0) {
        squad.fireTimer = squad.fireRate;
        fireVolley(squad, target, 'squad');
        continue;
      }

      const node = nodeUnderSquad(squad);
      if (node && node.kind === 'hq' && node.team !== squad.team && node.team !== TEAM.NEUTRAL) {
        squad.path = [];
        if (squad.fireTimer <= 0) {
          squad.fireTimer = squad.fireRate;
          fireVolley(squad, node, 'node');
        }
      }
    }
  }

  function fireVolley(shooter, target, targetType) {
    const shots = Math.min(3, shooter.count);
    const totalDamage = shooter.damage * shooter.count * (targetType === 'node' ? .34 : .46);
    const damagePerShot = totalDamage / shots;
    const spread = formationOffsets(shots, 9 * scale());

    for (let i = 0; i < shots; i++) {
      const [ox, oy] = spread[i];
      game.projectiles.push({
        id: game.projectileIdCounter++,
        team: shooter.team,
        x: shooter.x + ox,
        y: shooter.y + oy - 3 * scale(),
        prevX: shooter.x + ox,
        prevY: shooter.y + oy - 3 * scale(),
        targetType,
        targetId: target.id,
        speed: shooter.projectileSpeed,
        damage: damagePerShot,
        life: 1.6,
        maxLife: 1.6
      });
    }

    spawnMuzzleFlash(shooter.x, shooter.y, TEAM_COLOR[shooter.team]);
  }

  function updateProjectiles(dt) {
    for (const p of game.projectiles) {
      p.life -= dt;
      p.prevX = p.x;
      p.prevY = p.y;
      const target = p.targetType === 'squad' ? getSquad(p.targetId) : getNodeById(p.targetId);
      if (!target || target.hp <= 0) {
        p.life = 0;
        continue;
      }
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 3) {
        p.x = target.x;
        p.y = target.y;
        applyProjectileHit(p, target);
        p.life = 0;
      } else {
        p.x += dx / d * step;
        p.y += dy / d * step;
      }
    }
    game.projectiles = game.projectiles.filter(p => p.life > 0);
  }

  function applyProjectileHit(projectile, target) {
    target.hp -= projectile.damage;
    if (projectile.targetType === 'squad') {
      syncCount(target);
      if (target.hp <= 0) spawnBurst(target.x, target.y, TEAM_COLOR[target.team], 11);
    } else if (target.hp <= 0) {
      target.hp = 0;
      if (projectile.team === TEAM.PLAYER) winLevel();
      else loseLevel();
    }
    spawnImpact(target.x, target.y, projectile.team);
  }

  function syncCount(squad) {
    const next = clamp(Math.ceil(Math.max(0, squad.hp) / squad.unitHp), 0, 5);
    squad.count = next;
    squad.maxHp = squad.unitHp * Math.max(1, next);
    if (next > 0) squad.hp = Math.min(squad.hp, squad.maxHp);
  }

  function updateCapture(dt) {
    const captureRadius = 43 * scale();
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
        node.spawnCooldown = game.config.initialSpawnInterval;
        node.productionTimer = 0;
        node.captureProgress = 0;
        node.captureTeam = null;
        spawnBurst(node.x, node.y, TEAM_COLOR[team], 10);
        if (team === TEAM.PLAYER) showToast('Base conquistada. Ya empieza a producir para ti.');
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
        if (distance(a, b) > 34 * scale()) continue;
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

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= .96;
      p.vy *= .96;
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

  function spawnMuzzleFlash(x, y, color) {
    for (let i = 0; i < 4; i++) {
      game.particles.push({
        x, y,
        vx: (Math.random() - .5) * 34,
        vy: (Math.random() - .5) * 34,
        life: .12 + Math.random() * .08,
        maxLife: .20,
        color,
        size: 2.8
      });
    }
  }

  function spawnImpact(x, y, team) {
    const color = TEAM_COLOR[team];
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 48;
      game.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: .18 + Math.random() * .18,
        maxLife: .36,
        color,
        size: 2 + Math.random() * 1.5
      });
    }
  }

  function spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 44;
      game.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: .35 + Math.random() * .25,
        maxLife: .60,
        color,
        size: 2 + Math.random() * 1.2
      });
    }
  }

  function draw() {
    if (!game) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawGround();
    drawRoads();
    drawObstacles();
    drawRanges();
    drawBases();
    drawIndividuals();
    drawSquads();
    drawProjectiles();
    drawParticles();
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
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.beginPath(); ctx.ellipse(-r*.25, -r*.12, r*.38, r*.11, 0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawRanges() {
    const squad = selectedSquadId ? getSquad(selectedSquadId) : null;
    if (!squad || squad.hp <= 0) return;
    const body = squadBodyRadius(squad);
    ctx.save();
    ctx.strokeStyle = 'rgba(130, 220, 255, .42)';
    ctx.fillStyle = 'rgba(65, 184, 255, .055)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(squad.x, squad.y, squad.range + body, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function waitingCount(node) {
    return waitingIndividuals(node.index, node.team).length;
  }

  function drawBases() {
    const s = scale();
    for (const node of game.nodes) {
      const color = TEAM_COLOR[node.team];
      const isCore = node.kind === 'hq';
      const r = (isCore ? 34 : 28) * s;
      const hover = Math.hypot(pointer.x - node.x, pointer.y - node.y) <= r * 1.6;

      ctx.save();
      ctx.translate(node.x, node.y);

      // Plataforma y sombra
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath(); ctx.ellipse(4*s, 12*s, r*1.28, r*.64, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#25323d';
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1.5*s;
      ctx.beginPath(); ctx.roundRect(-r, -r*.70, r*2, r*1.40, 9*s); ctx.fill(); ctx.stroke();

      // Laterales metálicos
      ctx.fillStyle = '#18232c';
      ctx.beginPath(); ctx.roundRect(-r*.86, -r*.52, r*1.72, r*1.03, 7*s); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5*s;
      ctx.stroke();

      // Techo
      ctx.fillStyle = '#334450';
      ctx.beginPath();
      ctx.moveTo(-r*.63, -r*.52);
      ctx.lineTo(-r*.40, -r*.78);
      ctx.lineTo(r*.45, -r*.78);
      ctx.lineTo(r*.67, -r*.52);
      ctx.closePath();
      ctx.fill();

      // Puerta / reactor
      if (isCore) {
        const pulse = 1 + Math.sin(game.elapsed * 3) * .05;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath(); ctx.arc(0, 0, r*.42, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = color;
        ctx.globalAlpha = .28;
        ctx.beginPath(); ctx.arc(0, 0, r*.33*pulse, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5*s;
        ctx.beginPath(); ctx.arc(0, 0, r*.33*pulse, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#e8f5ff';
        ctx.font = `900 ${10*s}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CORE', 0, 0);
      } else {
        ctx.fillStyle = '#0b1218';
        ctx.beginPath(); ctx.roundRect(-r*.42, -r*.20, r*.84, r*.62, 4*s); ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2*s;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        for (let gy = -r*.12; gy < r*.32; gy += 6*s) {
          ctx.fillRect(-r*.34, gy, r*.68, 2*s);
        }
        ctx.fillStyle = '#dff4ff';
        ctx.font = `900 ${9*s}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('RBT', 0, -r*.44);
      }

      // Antena y bandera
      ctx.strokeStyle = '#dcebf4';
      ctx.lineWidth = 1.5*s;
      ctx.beginPath(); ctx.moveTo(r*.72, -r*.62); ctx.lineTo(r*.72, -r*1.40); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(r*.72, -r*1.38);
      ctx.lineTo(r*1.24, -r*1.18);
      ctx.lineTo(r*.72, -r*.99);
      ctx.closePath();
      ctx.fill();

      // Luces
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(-r*.60, -r*.37, 2.4*s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(r*.60, -r*.37, 2.4*s, 0, Math.PI*2); ctx.fill();

      // Halo táctil discreto
      if (hover || (selectedSquadId && node.team !== TEAM.PLAYER)) {
        ctx.strokeStyle = hover ? 'rgba(255,255,255,.70)' : 'rgba(255,255,255,.10)';
        ctx.lineWidth = 1.5*s;
        ctx.beginPath(); ctx.arc(0, 0, r*1.42, 0, Math.PI*2); ctx.stroke();
      }

      // Vida del CORE
      if (isCore) {
        const w = r * 1.55;
        ctx.fillStyle = 'rgba(0,0,0,.42)';
        ctx.beginPath(); ctx.roundRect(-w/2, r*.83, w, 5*s, 2*s); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(-w/2, r*.83, w * clamp(node.hp/node.maxHp,0,1), 5*s, 2*s); ctx.fill();
      }

      // Contador de formación + cuenta regresiva de salida
      if (node.team !== TEAM.NEUTRAL && node.hp > 0) {
        const waiting = Math.min(5, waitingCount(node));
        const seconds = nextSpawnSeconds(node);
        const interval = node.spawnQueue > 0 ? game.config.initialSpawnInterval : productionInterval(node);
        const progress = seconds == null ? 0 : clamp(1 - seconds / Math.max(.01, interval), 0, 1);
        const cy = r * 1.35;

        ctx.fillStyle = 'rgba(5,12,18,.82)';
        ctx.beginPath(); ctx.roundRect(-31*s, cy, 62*s, 19*s, 8*s); ctx.fill();
        ctx.fillStyle = '#dcebf5';
        ctx.font = `800 ${8.5*s}px system-ui`;
        ctx.textAlign = 'left';
        ctx.fillText(`${waiting}/5`, -24*s, cy + 9.5*s);
        ctx.textAlign = 'right';
        ctx.fillText(seconds == null ? '' : `${seconds.toFixed(1)}s`, 24*s, cy + 9.5*s);

        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.lineWidth = 2.8*s;
        ctx.beginPath(); ctx.arc(0, cy + 9.5*s, 7*s, -Math.PI/2, Math.PI*1.5); ctx.stroke();
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(0, cy + 9.5*s, 7*s, -Math.PI/2, -Math.PI/2 + Math.PI*2*progress); ctx.stroke();
      }

      if (node.captureTeam) {
        const p = clamp(node.captureProgress / 2.6, 0, 1);
        ctx.strokeStyle = TEAM_COLOR[node.captureTeam];
        ctx.lineWidth = 4*s;
        ctx.beginPath();
        ctx.arc(0, 0, r*1.52, -Math.PI/2, -Math.PI/2 + Math.PI*2*p);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  function drawRobot(x, y, color, size, phase = 0, moving = false) {
    const bob = moving ? Math.sin(phase) * .9 * size : 0;
    const leg = moving ? Math.sin(phase) * 2.4 * size : 0;
    const px = x;
    const py = y + bob;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.23)';
    ctx.beginPath(); ctx.ellipse(px+1.5*size, py+8*size, 7*size, 3.2*size, 0,0,Math.PI*2); ctx.fill();

    // piernas
    ctx.strokeStyle = '#18232c';
    ctx.lineWidth = 3*size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px-3*size, py+4*size); ctx.lineTo(px-4*size-leg, py+9*size);
    ctx.moveTo(px+3*size, py+4*size); ctx.lineTo(px+4*size+leg, py+9*size);
    ctx.stroke();

    // cuerpo
    ctx.fillStyle = '#263746';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2*size;
    ctx.beginPath(); ctx.roundRect(px-6*size, py-3*size, 12*size, 10*size, 3*size); ctx.fill(); ctx.stroke();

    // cabeza
    ctx.fillStyle = '#304756';
    ctx.beginPath(); ctx.roundRect(px-5.5*size, py-10*size, 11*size, 8*size, 3*size); ctx.fill(); ctx.stroke();

    // visor
    ctx.fillStyle = color;
    ctx.globalAlpha = .88;
    ctx.beginPath(); ctx.roundRect(px-3.8*size, py-7.7*size, 7.6*size, 2.4*size, 1.2*size); ctx.fill();
    ctx.globalAlpha = 1;

    // hombros
    ctx.fillStyle = '#1b2934';
    ctx.beginPath(); ctx.arc(px-7*size, py, 2.4*size, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+7*size, py, 2.4*size, 0, Math.PI*2); ctx.fill();

    // arma
    ctx.strokeStyle = '#d7e7ef';
    ctx.lineWidth = 2*size;
    ctx.beginPath(); ctx.moveTo(px+5*size, py+1*size); ctx.lineTo(px+10*size, py-1*size); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(px+10.5*size, py-1.2*size, 1.3*size, 0, Math.PI*2); ctx.fill();
  }

  function drawIndividuals() {
    const s = scale();
    for (const unit of game.individuals) {
      drawRobot(unit.x, unit.y, TEAM_COLOR[unit.team], .84*s, unit.walkPhase, unit.state === 'exiting');
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
      const offsets = formationOffsets(squad.count, 17 * s);

      // zona de selección visual más clara
      if (squad.selected) {
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2*s;
        ctx.beginPath(); ctx.arc(squad.x, squad.y, 31*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(squad.x, squad.y-38*s);
        ctx.lineTo(squad.x-5*s, squad.y-31*s);
        ctx.lineTo(squad.x+5*s, squad.y-31*s);
        ctx.closePath();
        ctx.fill();
      }

      const moving = squad.path.length > 0;
      offsets.forEach(([ox, oy], i) => {
        drawRobot(squad.x + ox, squad.y + oy, color, 1.05*s, squad.bob + i*.7, moving);
      });

      const hpRatio = clamp(squad.hp / Math.max(1, squad.maxHp), 0, 1);
      if (hpRatio < .99) {
        const w = 40*s;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath(); ctx.roundRect(squad.x-w/2, squad.y-35*s, w, 4*s, 2*s); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(squad.x-w/2, squad.y-35*s, w*hpRatio, 4*s, 2*s); ctx.fill();
      }
    }
  }

  function drawProjectiles() {
    const s = scale();
    ctx.lineCap = 'round';
    for (const p of game.projectiles) {
      const color = TEAM_COLOR[p.team];
      ctx.globalAlpha = .32;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5*s;
      ctx.beginPath(); ctx.moveTo(p.prevX, p.prevY); ctx.lineTo(p.x, p.y); ctx.stroke();

      ctx.globalAlpha = .92;
      ctx.strokeStyle = '#f7fbff';
      ctx.lineWidth = 1.5*s;
      ctx.beginPath(); ctx.moveTo(p.prevX, p.prevY); ctx.lineTo(p.x, p.y); ctx.stroke();

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8*s;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2*s, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    const s = scale();
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, (p.size || 2.2)*s, 0, Math.PI*2); ctx.fill();
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

    // Área táctil deliberadamente mayor que el dibujo del pelotón.
    const touchRadius = 64 * s;
    const squadHit = game.squads
      .filter(q => q.team === TEAM.PLAYER && q.hp > 0)
      .map(q => ({ q, d: distance(p, q) }))
      .filter(x => x.d <= touchRadius)
      .sort((a,b) => a.d - b.d)[0];

    if (squadHit) {
      selectSquad(squadHit.q);
      return;
    }

    const nodeHit = game.nodes
      .map(node => ({ node, d: distance(p, node) }))
      .filter(x => x.d <= 64 * s)
      .sort((a,b) => a.d - b.d)[0];

    if (nodeHit) {
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
        const seconds = nextSpawnSeconds(nodeHit.node);
        showToast(seconds == null ? 'Esta base no produce robots.' : `Próximo robot en ${seconds.toFixed(1)} s.`);
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
