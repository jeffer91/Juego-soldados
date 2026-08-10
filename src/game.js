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
    tutorial: document.getElementById('tutorial'),
    tutorialClose: document.getElementById('tutorialClose'),
    selectionPanel: document.getElementById('selectionPanel'),
    selectedSquadLabel: document.getElementById('selectedSquadLabel'),
    selectedSquadType: document.getElementById('selectedSquadType'),
    cancelSelection: document.getElementById('cancelSelection'),
    toast: document.getElementById('toast'),
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

  const STORAGE_KEY = 'rbtwar-save-v1';
  const TEAM = Object.freeze({ PLAYER: 'player', ENEMY: 'enemy', NEUTRAL: 'neutral' });
  const TEAM_COLOR = Object.freeze({ player: '#39aaf7', enemy: '#f25656', neutral: '#c4bba7' });

  const UNIT_TYPES = Object.freeze({
    basic: { name: 'Básico', speed: 82, hp: 100, damage: 18, fireRate: 0.72, range: 56, production: 4.1 }
  });

  const BIOMES = [
    { name: 'Desierto', ground: '#b99b63', ground2: '#9c7f4d', road: '#735c3e', obstacle: '#5f513f', accent: '#d7bc7b' },
    { name: 'Bosque', ground: '#6e8e5a', ground2: '#58764a', road: '#765f46', obstacle: '#2f5836', accent: '#9aba70' },
    { name: 'Nieve', ground: '#c9d9dd', ground2: '#a9c0c7', road: '#758b90', obstacle: '#62777e', accent: '#e9f5f8' },
    { name: 'Ciudad', ground: '#737983', ground2: '#5d636c', road: '#343a42', obstacle: '#41464e', accent: '#9fa6b1' }
  ];

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
  let lastTs = performance.now();
  let paused = false;
  let ended = false;
  let selectedSquadId = null;
  let pointer = { x: -999, y: -999 };
  let toastTimer = null;

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return { ...defaultSave(), ...parsed, unitLevels: { basic: 1, ...(parsed.unitLevels || {}) } };
    } catch {
      return defaultSave();
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    refreshHud();
  }

  function mulberry32(seed) {
    return function rand() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function totalStars() {
    return Object.values(save.stars).reduce((sum, n) => sum + Number(n || 0), 0);
  }

  function getBiome(level) {
    return BIOMES[Math.floor((level - 1) / 10) % BIOMES.length];
  }

  function scaledUnitStats(team, level) {
    const base = UNIT_TYPES.basic;
    const ownLevel = team === TEAM.PLAYER
      ? save.unitLevels.basic
      : Math.max(1, 1 + Math.floor((level - 1) / 3));
    const factor = 1 + (ownLevel - 1) * 0.12;
    return {
      level: ownLevel,
      hp: base.hp * factor,
      damage: base.damage * factor,
      speed: base.speed * (1 + Math.min(0.15, (ownLevel - 1) * 0.015)),
      fireRate: base.fireRate,
      range: base.range
    };
  }

  function createLevel(level) {
    const rand = mulberry32(1337 + level * 7919);
    const biome = getBiome(level);
    const tier = Math.floor((level - 1) / 5);
    const extraNodes = Math.min(3, tier);

    const nodes = [
      baseNode('P-HQ', 0.10, 0.70, TEAM.PLAYER, 'hq', 'basic'),
      baseNode('N-A', 0.30, 0.58, TEAM.NEUTRAL, 'factory', 'basic'),
      baseNode('N-B', 0.48, 0.30, TEAM.NEUTRAL, 'factory', 'basic'),
      baseNode('E-A', 0.69, 0.51, TEAM.ENEMY, 'factory', 'basic'),
      baseNode('E-HQ', 0.90, 0.26, TEAM.ENEMY, 'hq', 'basic')
    ];

    if (extraNodes >= 1) nodes.splice(3, 0, baseNode('N-C', 0.52, 0.72, TEAM.NEUTRAL, 'factory', 'basic'));
    if (extraNodes >= 2) nodes.splice(nodes.length - 1, 0, baseNode('E-B', 0.78, 0.76, TEAM.ENEMY, 'factory', 'basic'));
    if (extraNodes >= 3) nodes.splice(2, 0, baseNode('N-D', 0.20, 0.25, TEAM.NEUTRAL, 'factory', 'basic'));

    nodes.forEach((node, i) => {
      node.nx = clamp(node.nx + (rand() - 0.5) * 0.05, 0.08, 0.92);
      node.ny = clamp(node.ny + (rand() - 0.5) * 0.06, 0.14, 0.84);
      node.index = i;
      if (node.kind === 'hq') {
        node.maxHp = 900 + level * 35;
        node.hp = node.maxHp;
      }
    });

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) edges.push([i, i + 1]);
    if (nodes.length > 5) edges.push([0, 2], [2, 4]);
    if (nodes.length > 6) edges.push([3, 6]);
    if (nodes.length >= 5) edges.push([1, Math.min(3, nodes.length - 2)]);

    const obstacles = Array.from({ length: 6 + Math.min(8, level) }, (_, i) => ({
      x: 0.12 + rand() * 0.76,
      y: 0.16 + rand() * 0.68,
      r: 14 + rand() * 28,
      rot: rand() * Math.PI,
      type: i % 3
    }));

    return {
      level, biome, nodes, edges: uniqueEdges(edges), squads: [], projectiles: [], particles: [],
      startedAt: performance.now(), elapsed: 0, aiThink: 0, idCounter: 1, obstacles,
      enemyLevel: scaledUnitStats(TEAM.ENEMY, level).level
    };
  }

  function baseNode(id, nx, ny, team, kind, unitType) {
    return {
      id, nx, ny, x: 0, y: 0, team, kind, unitType,
      stock: kind === 'hq' ? 5 : (team === TEAM.NEUTRAL ? 0 : 3),
      productionTimer: 0, captureTeam: null, captureProgress: 0,
      maxHp: 500, hp: 500, index: -1
    };
  }

  function uniqueEdges(edges) {
    const seen = new Set();
    return edges.filter(([a, b]) => {
      if (a === b) return false;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(640, Math.round(rect.width * dpr));
    const h = Math.max(360, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (game) positionNodes();
    }
  }

  function positionNodes() {
    if (!game) return;
    game.nodes.forEach(node => {
      node.x = node.nx * canvas.width;
      node.y = node.ny * canvas.height;
    });
  }

  function startLevel(level) {
    save.currentLevel = clamp(level, 1, save.unlockedLevel);
    persist();
    selectedSquadId = null;
    ended = false;
    paused = false;
    ui.pauseModal.classList.add('hidden');
    ui.resultModal.classList.add('hidden');
    ui.selectionPanel.classList.add('hidden');
    game = createLevel(save.currentLevel);
    resizeCanvas();
    positionNodes();
    updateLabels();
    showToast(`Mapa ${save.currentLevel}: destruye el núcleo rojo.`);
  }

  function updateLabels() {
    const biome = getBiome(save.currentLevel);
    ui.worldLabel.textContent = `${biome.name} · Mapa ${save.currentLevel}`;
    ui.levelProgressText.textContent = `Mapa ${save.currentLevel} de ${save.unlockedLevel} desbloqueado${save.unlockedLevel > 1 ? 's' : ''}`;
    ui.prevLevelBtn.disabled = save.currentLevel <= 1;
    ui.nextUnlockedBtn.disabled = save.currentLevel >= save.unlockedLevel;
  }

  function refreshHud() {
    ui.coinCount.textContent = String(save.coins);
    ui.starCount.textContent = String(totalStars());
    updateLabels();
  }

  function nodeNeighbors(index) {
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
    const d = Array(n).fill(Infinity);
    const prev = Array(n).fill(-1);
    const visited = Array(n).fill(false);
    d[from] = 0;

    for (let step = 0; step < n; step++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!visited[i] && d[i] < best) { best = d[i]; u = i; }
      }
      if (u === -1 || u === to) break;
      visited[u] = true;
      for (const v of nodeNeighbors(u)) {
        const alt = d[u] + dist(game.nodes[u], game.nodes[v]);
        if (alt < d[v]) { d[v] = alt; prev[v] = u; }
      }
    }

    const path = [];
    let u = to;
    while (u !== -1) {
      path.unshift(u);
      if (u === from) break;
      u = prev[u];
    }
    return path[0] === from ? path : [from];
  }

  function formSquadFromBase(node, team = node.team) {
    if (node.team !== team || node.stock <= 0) return null;
    const count = Math.min(5, node.stock);
    node.stock -= count;
    const stats = scaledUnitStats(team, game.level);
    const squad = {
      id: game.idCounter++, team, type: node.unitType, level: stats.level, count,
      hp: stats.hp * count, maxHp: stats.hp * count, damage: stats.damage,
      speed: stats.speed, fireRate: stats.fireRate, range: stats.range,
      x: node.x, y: node.y, currentNode: node.index, path: [], pathPos: 0,
      targetNode: null, fireTimer: 0, combatTargetId: null, captureHold: 0, selected: false
    };
    game.squads.push(squad);
    return squad;
  }

  function sendSquad(squad, targetNodeIndex) {
    if (!squad || squad.team !== TEAM.PLAYER || squad.count <= 0) return;
    const startNode = nearestNodeIndex(squad.x, squad.y);
    const path = shortestPath(startNode, targetNodeIndex);
    if (path.length <= 1 && startNode !== targetNodeIndex) {
      showToast('No hay una ruta disponible hacia esa base.');
      return;
    }
    squad.currentNode = startNode;
    squad.path = path.slice(1);
    squad.pathPos = 0;
    squad.targetNode = targetNodeIndex;
    squad.combatTargetId = null;
    deselectSquad();
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
    game?.squads.forEach(s => { s.selected = false; });
    selectedSquadId = null;
    ui.selectionPanel.classList.add('hidden');
  }

  function mergeFriendlySquads() {
    for (let i = 0; i < game.squads.length; i++) {
      const a = game.squads[i];
      if (a.count >= 5 || a.path.length || a.hp <= 0) continue;
      for (let j = i + 1; j < game.squads.length; j++) {
        const b = game.squads[j];
        if (b.team !== a.team || b.type !== a.type || b.path.length || b.hp <= 0) continue;
        if (dist(a, b) > 34) continue;
        const canTake = Math.min(5 - a.count, b.count);
        if (canTake <= 0) continue;
        const unitHpA = a.maxHp / a.count;
        const unitHpB = b.maxHp / b.count;
        a.count += canTake;
        a.hp += unitHpB * canTake;
        a.maxHp = unitHpA * a.count;
        b.count -= canTake;
        b.hp = b.count > 0 ? unitHpB * b.count : 0;
        b.maxHp = unitHpB * b.count;
      }
    }
    game.squads = game.squads.filter(s => s.count > 0 && s.hp > 0);
  }

  function update(dt) {
    if (!game || paused || ended) return;
    game.elapsed += dt;
    updateProduction(dt);
    updateAI(dt);
    updateMovement(dt);
    updateCombat(dt);
    updateCapture(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    mergeFriendlySquads();
    cleanupDead();
    checkDefeat();
  }

  function updateProduction(dt) {
    for (const node of game.nodes) {
      if (node.team === TEAM.NEUTRAL || node.hp <= 0) continue;
      node.productionTimer += dt;
      const productionBase = UNIT_TYPES[node.unitType].production;
      const difficultyMod = node.team === TEAM.ENEMY ? Math.max(0.72, 1 - (game.level - 1) * 0.012) : 1;
      const interval = productionBase * difficultyMod;
      if (node.productionTimer >= interval && node.stock < 15) {
        node.productionTimer -= interval;
        node.stock += 1;
      }

      if (node.team === TEAM.ENEMY && node.stock >= 5) formSquadFromBase(node, TEAM.ENEMY);
      if (node.team === TEAM.PLAYER && node.stock >= 5) formSquadFromBase(node, TEAM.PLAYER);
    }
  }

  function updateAI(dt) {
    game.aiThink -= dt;
    if (game.aiThink > 0) return;
    game.aiThink = Math.max(1.2, 2.7 - game.level * 0.035);

    const enemySquads = game.squads.filter(s => s.team === TEAM.ENEMY && !s.path.length && !s.combatTargetId);
    for (const squad of enemySquads) {
      const from = nearestNodeIndex(squad.x, squad.y);
      const candidates = game.nodes
        .map((node, i) => ({ node, i, d: shortestPath(from, i).length }))
        .filter(x => x.node.team !== TEAM.ENEMY && x.d > 1)
        .sort((a, b) => {
          const aWeight = a.node.kind === 'hq' && a.node.team === TEAM.PLAYER ? -2.5 : 0;
          const bWeight = b.node.kind === 'hq' && b.node.team === TEAM.PLAYER ? -2.5 : 0;
          return (a.d + aWeight) - (b.d + bWeight);
        });
      if (!candidates.length) continue;
      const pick = candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(2, candidates.length)))];
      const path = shortestPath(from, pick.i);
      squad.currentNode = from;
      squad.path = path.slice(1);
      squad.targetNode = pick.i;
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
      const step = squad.speed * deviceScale() * dt;
      if (d <= step + 4) {
        squad.x = target.x;
        squad.y = target.y;
        squad.currentNode = nextIndex;
        squad.path.shift();
        if (!squad.path.length) squad.targetNode = nextIndex;
      } else {
        squad.x += (dx / d) * step;
        squad.y += (dy / d) * step;
      }
    }
  }

  function updateCombat(dt) {
    for (const squad of game.squads) {
      if (squad.hp <= 0) continue;
      squad.fireTimer -= dt;

      let target = null;
      if (squad.combatTargetId) {
        target = getSquad(squad.combatTargetId);
        if (!target || target.hp <= 0 || dist(squad, target) > squad.range * deviceScale() * 1.45) {
          squad.combatTargetId = null;
          target = null;
        }
      }

      if (!target) {
        target = nearestEnemySquad(squad);
        if (target && dist(squad, target) <= squad.range * deviceScale()) {
          squad.combatTargetId = target.id;
          squad.path = [];
        } else {
          target = null;
        }
      }

      if (target && squad.fireTimer <= 0) {
        squad.fireTimer = squad.fireRate;
        const aliveFactor = Math.max(1, squad.count);
        const damage = squad.damage * Math.min(5, aliveFactor) * 0.55;
        target.hp -= damage;
        syncCountFromHp(target);
        spawnShot(squad, target, squad.team);
        if (target.hp <= 0) spawnBurst(target.x, target.y, TEAM_COLOR[target.team]);
        continue;
      }

      const node = nodeUnderSquad(squad);
      if (node && node.kind === 'hq' && node.team !== squad.team && node.team !== TEAM.NEUTRAL) {
        squad.path = [];
        if (squad.fireTimer <= 0) {
          squad.fireTimer = squad.fireRate;
          node.hp -= squad.damage * squad.count * 0.42;
          spawnShot(squad, node, squad.team);
          if (node.hp <= 0) {
            node.hp = 0;
            if (squad.team === TEAM.PLAYER) winLevel();
          }
        }
      }
    }
  }

  function nearestEnemySquad(squad) {
    let target = null;
    let best = Infinity;
    for (const other of game.squads) {
      if (other.team === squad.team || other.hp <= 0) continue;
      const d = dist(squad, other);
      if (d < best) { best = d; target = other; }
    }
    return target;
  }

  function syncCountFromHp(squad) {
    const perUnit = squad.maxHp / Math.max(1, squad.count);
    const newCount = clamp(Math.ceil(Math.max(0, squad.hp) / perUnit), 0, 5);
    if (newCount !== squad.count && newCount > 0) {
      squad.count = newCount;
      squad.maxHp = perUnit * newCount;
      squad.hp = Math.min(squad.hp, squad.maxHp);
    }
  }

  function nodeUnderSquad(squad) {
    const radius = 40 * deviceScale();
    return game.nodes.find(node => dist(squad, node) <= radius) || null;
  }

  function updateCapture(dt) {
    for (const node of game.nodes) {
      if (node.kind === 'hq' || node.hp <= 0) continue;
      const nearby = game.squads.filter(s => s.hp > 0 && dist(s, node) <= 45 * deviceScale());
      const teams = [...new Set(nearby.map(s => s.team))];
      if (teams.length !== 1) {
        node.captureProgress = Math.max(0, node.captureProgress - dt * 0.5);
        if (node.captureProgress === 0) node.captureTeam = null;
        continue;
      }
      const attackingTeam = teams[0];
      if (attackingTeam === node.team) {
        node.captureProgress = 0;
        node.captureTeam = null;
        continue;
      }

      node.captureTeam = attackingTeam;
      node.captureProgress += dt;
      if (node.captureProgress >= 3) {
        node.team = attackingTeam;
        node.stock = 0;
        node.productionTimer = 0;
        node.captureProgress = 0;
        node.captureTeam = null;
        spawnBurst(node.x, node.y, TEAM_COLOR[attackingTeam]);
        if (attackingTeam === TEAM.PLAYER) showToast('Base conquistada. Ahora produce robots para ti.');
      }
    }
  }

  function updateProjectiles(dt) {
    for (const p of game.projectiles) p.life -= dt;
    game.projectiles = game.projectiles.filter(p => p.life > 0);
  }

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 24 * dt;
    }
    game.particles = game.particles.filter(p => p.life > 0);
  }

  function cleanupDead() {
    const deadSelected = selectedSquadId && !game.squads.some(s => s.id === selectedSquadId && s.hp > 0);
    game.squads = game.squads.filter(s => s.hp > 0 && s.count > 0);
    if (deadSelected) deselectSquad();
  }

  function checkDefeat() {
    const playerHQ = game.nodes.find(n => n.kind === 'hq' && n.id === 'P-HQ');
    if (playerHQ.hp <= 0 && !ended) loseLevel();
  }

  function computeStars(level, elapsed) {
    const key = String(level);
    const first = save.firstTimes[key];
    if (!first) return 1;
    if (elapsed <= first * 0.80) return 3;
    if (elapsed <= first * 0.90) return 2;
    return 1;
  }

  function winLevel() {
    if (ended) return;
    ended = true;
    const level = game.level;
    const elapsed = game.elapsed;
    const key = String(level);
    const isFirst = !save.firstTimes[key];

    if (isFirst) save.firstTimes[key] = elapsed;
    save.bestTimes[key] = Math.min(save.bestTimes[key] || Infinity, elapsed);

    const stars = computeStars(level, elapsed);
    save.stars[key] = Math.max(save.stars[key] || 0, stars);

    const baseReward = 70 + level * 12;
    const reward = Math.round((isFirst ? baseReward : baseReward * 0.35) * (1 + (stars - 1) * 0.3));
    save.coins += reward;
    save.unlockedLevel = Math.max(save.unlockedLevel, level + 1);
    persist();

    ui.resultEyebrow.textContent = 'VICTORIA';
    ui.resultTitle.textContent = `Mapa ${level} completado`;
    ui.resultStars.textContent = '⭐'.repeat(stars);
    ui.resultMessage.textContent = isFirst
      ? 'Este primer tiempo quedó guardado internamente como tu referencia para conseguir más estrellas.'
      : stars === 3
        ? 'Superaste tu tiempo de referencia en al menos un 20%. Excelente ataque.'
        : stars === 2
          ? 'Superaste tu tiempo de referencia en al menos un 10%.'
          : 'Victoria conseguida. Puedes repetir el mapa e intentar mejorar tu propio tiempo.';
    ui.rewardCoins.textContent = `+${reward} 🪙`;
    ui.nextBtn.classList.remove('hidden');
    ui.resultModal.classList.remove('hidden');
  }

  function loseLevel() {
    if (ended) return;
    ended = true;
    ui.resultEyebrow.textContent = 'DERROTA';
    ui.resultTitle.textContent = 'Núcleo destruido';
    ui.resultStars.textContent = '';
    ui.resultMessage.textContent = 'Puedes repetir este mapa o volver a uno anterior para conseguir monedas y mejorar tu ejército.';
    ui.rewardCoins.textContent = '+0 🪙';
    ui.nextBtn.classList.add('hidden');
    ui.resultModal.classList.remove('hidden');
  }

  function spawnShot(from, to, team) {
    game.projectiles.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, life: 0.12, maxLife: 0.12, color: TEAM_COLOR[team] });
  }

  function spawnBurst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 65;
      game.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .45 + Math.random() * .35, maxLife: .8, color });
    }
  }

  function deviceScale() {
    return Math.min(canvas.width / 1280, canvas.height / 720) * 1.15;
  }

  function draw() {
    if (!game) return;
    drawGround();
    drawRoads();
    drawObstacles();
    drawBases();
    drawSquads();
    drawProjectiles();
    drawParticles();
    drawMiniHints();
  }

  function drawGround() {
    const b = game.biome;
    ctx.fillStyle = b.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = .16;
    ctx.fillStyle = b.ground2;
    const step = 70 * deviceScale();
    for (let y = 0; y < canvas.height + step; y += step) {
      for (let x = 0; x < canvas.width + step; x += step) {
        const off = ((x / step + y / step) % 2) * step * .25;
        ctx.beginPath();
        ctx.ellipse(x + off, y, step * .36, step * .20, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRoads() {
    const width = 18 * deviceScale();
    ctx.lineCap = 'round';
    for (const [a, bIndex] of game.edges) {
      const p1 = game.nodes[a], p2 = game.nodes[bIndex];
      ctx.strokeStyle = 'rgba(0,0,0,.16)';
      ctx.lineWidth = width + 8 * deviceScale();
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.strokeStyle = game.biome.road;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([7 * deviceScale(), 12 * deviceScale()]);
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.lineWidth = 2 * deviceScale();
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawObstacles() {
    const s = deviceScale();
    for (const o of game.obstacles) {
      const x = o.x * canvas.width, y = o.y * canvas.height;
      const r = o.r * s;
      if (game.nodes.some(n => Math.hypot(n.x - x, n.y - y) < r + 55 * s)) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.rot);
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.beginPath(); ctx.ellipse(4*s, 8*s, r*1.05, r*.66, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = game.biome.obstacle;
      ctx.beginPath();
      ctx.roundRect(-r, -r*.48, r*2, r*.96, r*.34);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.beginPath(); ctx.ellipse(-r*.25, -r*.13, r*.45, r*.14, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawBases() {
    const s = deviceScale();
    for (const node of game.nodes) {
      const r = (node.kind === 'hq' ? 34 : 27) * s;
      const teamColor = TEAM_COLOR[node.team];
      const hover = Math.hypot(pointer.x - node.x, pointer.y - node.y) <= r * 1.3;

      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.fillStyle = 'rgba(0,0,0,.23)';
      ctx.beginPath(); ctx.ellipse(4*s, 10*s, r*1.18, r*.66, 0, 0, Math.PI*2); ctx.fill();

      if (hover || (selectedSquadId && node.team !== TEAM.PLAYER)) {
        ctx.strokeStyle = hover ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.16)';
        ctx.lineWidth = 2 * s;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.32, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = '#1a2630';
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.roundRect(-r*.85, -r*.72, r*1.7, r*1.44, 9*s); ctx.fill(); ctx.stroke();

      ctx.fillStyle = teamColor;
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.roundRect(-r*.64, -r*.52, r*1.28, r*.48, 5*s); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#d8edf9';
      ctx.font = `700 ${Math.max(10, 11*s)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.kind === 'hq' ? 'CORE' : 'RBT', 0, -r*.26);

      ctx.strokeStyle = '#d8edf9'; ctx.lineWidth = 2*s;
      ctx.beginPath(); ctx.moveTo(r*.72, -r*.9); ctx.lineTo(r*.72, -r*1.55); ctx.stroke();
      ctx.fillStyle = teamColor;
      ctx.beginPath(); ctx.moveTo(r*.72, -r*1.54); ctx.lineTo(r*1.30, -r*1.30); ctx.lineTo(r*.72, -r*1.08); ctx.closePath(); ctx.fill();

      if (node.kind === 'hq') {
        const w = r*1.55;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w/2, r*.85, w, 5*s);
        ctx.fillStyle = teamColor; ctx.fillRect(-w/2, r*.85, w * clamp(node.hp/node.maxHp,0,1), 5*s);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath(); ctx.roundRect(-18*s, r*.8, 36*s, 18*s, 8*s); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `800 ${11*s}px system-ui`; ctx.fillText(String(node.stock), 0, r*1.08);
      }

      if (node.captureTeam) {
        const p = clamp(node.captureProgress / 3, 0, 1);
        ctx.strokeStyle = TEAM_COLOR[node.captureTeam];
        ctx.lineWidth = 4*s;
        ctx.beginPath(); ctx.arc(0, 0, r*1.48, -Math.PI/2, -Math.PI/2 + Math.PI*2*p); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawSquads() {
    const s = deviceScale();
    for (const squad of game.squads) {
      const color = TEAM_COLOR[squad.team];
      const r = 11 * s;
      const positions = formationOffsets(squad.count, 17*s);

      if (squad.selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2*s;
        ctx.setLineDash([5*s, 4*s]);
        ctx.beginPath(); ctx.arc(squad.x, squad.y, 28*s, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
      }

      positions.forEach(([ox, oy]) => {
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(squad.x+ox+2*s, squad.y+oy+6*s, r*.92, r*.5, 0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#263746';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.3*s;
        ctx.beginPath(); ctx.roundRect(squad.x+ox-r*.68, squad.y+oy-r*.7, r*1.36, r*1.4, 3*s); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(squad.x+ox-r*.25, squad.y+oy-r*.08, 1.8*s, 0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(squad.x+ox+r*.25, squad.y+oy-r*.08, 1.8*s, 0,Math.PI*2); ctx.fill();
      });

      const hpRatio = clamp(squad.hp / squad.maxHp, 0, 1);
      if (hpRatio < .99) {
        const w = 35*s;
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(squad.x-w/2, squad.y-30*s, w, 4*s);
        ctx.fillStyle = color; ctx.fillRect(squad.x-w/2, squad.y-30*s, w*hpRatio, 4*s);
      }
    }
  }

  function formationOffsets(count, gap) {
    const presets = {
      1: [[0,0]],
      2: [[-gap*.5,0],[gap*.5,0]],
      3: [[-gap*.55,gap*.35],[gap*.55,gap*.35],[0,-gap*.45]],
      4: [[-gap*.5,-gap*.5],[gap*.5,-gap*.5],[-gap*.5,gap*.5],[gap*.5,gap*.5]],
      5: [[-gap*.55,-gap*.55],[gap*.55,-gap*.55],[-gap*.55,gap*.55],[gap*.55,gap*.55],[0,0]]
    };
    return presets[clamp(count,1,5)] || presets[1];
  }

  function drawProjectiles() {
    const s = deviceScale();
    for (const p of game.projectiles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5*s;
      ctx.beginPath(); ctx.moveTo(p.x1,p.y1); ctx.lineTo(p.x2,p.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    const s = deviceScale();
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life/p.maxLife, 0,1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.5*s,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMiniHints() {
    const s = deviceScale();
    const selected = selectedSquadId ? getSquad(selectedSquadId) : null;
    if (!selected) return;
    const start = nearestNodeIndex(selected.x, selected.y);

    for (let i = 0; i < game.nodes.length; i++) {
      if (i === start) continue;
      const node = game.nodes[i];
      const path = shortestPath(start, i);
      if (path.length <= 1) continue;
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = `700 ${10*s}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.max(1,path.length-1)} tramo${path.length-1===1?'':'s'}`, node.x, node.y + 56*s);
    }
  }

  function getPointerPosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleCanvasClick(e) {
    if (!game || paused || ended) return;
    const p = getPointerPosition(e);
    pointer = p;
    const s = deviceScale();

    const clickedSquad = game.squads
      .filter(q => q.team === TEAM.PLAYER && q.hp > 0)
      .sort((a,b) => dist(p,a)-dist(p,b))[0];
    if (clickedSquad && dist(p, clickedSquad) <= 34*s) {
      selectSquad(clickedSquad);
      return;
    }

    const clickedNode = game.nodes
      .map(node => ({ node, d: dist(p,node) }))
      .sort((a,b)=>a.d-b.d)[0];

    if (clickedNode && clickedNode.d <= 50*s) {
      if (selectedSquadId) {
        sendSquad(getSquad(selectedSquadId), clickedNode.node.index);
        return;
      }

      if (clickedNode.node.team === TEAM.PLAYER && clickedNode.node.stock > 0) {
        const squad = formSquadFromBase(clickedNode.node, TEAM.PLAYER);
        if (squad) {
          selectSquad(squad);
          showToast(`Pelotón formado con ${squad.count} robot${squad.count===1?'':'s'}. Elige una base objetivo.`);
        }
        return;
      }
    }

    deselectSquad();
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2200);
  }

  function loop(ts) {
    const dt = Math.min(0.034, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    resizeCanvas();
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointermove', e => { pointer = getPointerPosition(e); });
  canvas.addEventListener('pointerleave', () => { pointer = { x:-999,y:-999 }; });
  canvas.addEventListener('pointerup', handleCanvasClick);

  ui.cancelSelection.addEventListener('click', deselectSquad);
  ui.tutorialClose.addEventListener('click', () => {
    ui.tutorial.classList.add('hidden');
    save.tutorialSeen = true;
    persist();
  });

  ui.pauseBtn.addEventListener('click', () => {
    if (ended) return;
    paused = true;
    ui.pauseModal.classList.remove('hidden');
  });
  ui.resumeBtn.addEventListener('click', () => {
    paused = false;
    ui.pauseModal.classList.add('hidden');
    lastTs = performance.now();
  });
  ui.restartBtn.addEventListener('click', () => startLevel(save.currentLevel));
  ui.replayBtn.addEventListener('click', () => startLevel(save.currentLevel));
  ui.nextBtn.addEventListener('click', () => startLevel(Math.min(save.unlockedLevel, save.currentLevel + 1)));
  ui.prevLevelBtn.addEventListener('click', () => startLevel(save.currentLevel - 1));
  ui.nextUnlockedBtn.addEventListener('click', () => startLevel(save.currentLevel + 1));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (selectedSquadId) deselectSquad();
      else if (!ended) {
        paused = !paused;
        ui.pauseModal.classList.toggle('hidden', !paused);
      }
    }
  });

  if (save.tutorialSeen) ui.tutorial.classList.add('hidden');
  refreshHud();
  startLevel(save.currentLevel);
  requestAnimationFrame(loop);
})();
