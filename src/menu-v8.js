(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const campaignTab = $('campaignTab');
  const upgradesTab = $('upgradesTab');
  const campaignPanel = $('campaignPanel');
  const upgradesPanel = $('upgradesPanel');
  const upgradeGrid = $('upgradeGrid');
  const upgradeCoins = $('upgradeCoins');
  const upgradeStatus = $('upgradeStatus');
  const campaignZone = $('campaignZone');
  const campaignUnits = $('campaignUnits');
  const campaignProgressFill = $('campaignProgressFill');
  const levelPath = $('levelPath');

  const ZONES = ['Desierto', 'Cañón', 'Bosque', 'Nieve', 'Ciudad', 'Élite'];
  const FAMILY_META = [
    { icon:'◆', role:'INFANTERÍA' },
    { icon:'◉', role:'VELOCIDAD' },
    { icon:'⬢', role:'BLINDADO' },
    { icon:'◎', role:'ALCANCE' },
    { icon:'✚', role:'SOPORTE' },
    { icon:'✦', role:'ESPECIAL' }
  ];

  let activeTab = 'campaign';
  let upgradeFrame = 0;
  let pendingMessage = '';

  function api() { return window.RBTwarAPI || null; }

  function zoneFor(level, meta) {
    const byKey = { desert:'Desierto', canyon:'Cañón', forest:'Bosque', snow:'Nieve', city:'Ciudad', elite:'Élite' };
    return byKey[meta?.biome] || ZONES[Math.floor((Math.max(1, level) - 1) / 5) % ZONES.length];
  }

  function refreshCampaign() {
    const state = api()?.getState?.();
    if (!state) return;
    const level = Math.max(1, Number(state.currentLevel || 1));
    const catalog = state.catalog || [];
    const byType = new Map(catalog.map(unit => [unit.type, unit]));
    const battleTypes = (state.battleUnits || api()?.getBattleUnits?.(level) || []).slice(0, 4);
    const battleUnits = battleTypes.map(type => byType.get(type)).filter(Boolean);

    if (campaignZone) campaignZone.textContent = zoneFor(level, state.levelMeta);
    if (campaignUnits) {
      const text = battleUnits.length ? battleUnits.map(u => u.short).join(' · ') : 'BAS';
      if (campaignUnits.textContent !== text) campaignUnits.textContent = text;
    }
    if (campaignProgressFill) campaignProgressFill.style.width = `${(((level - 1) % 10) + 1) * 10}%`;
  }

  function unitCard(unit, coins) {
    const card = document.createElement('article');
    card.className = `upgrade-card unit-${unit.type}${unit.unlocked ? '' : ' locked'}`;
    card.dataset.type = unit.type;
    card.dataset.family = String(unit.family || 0);
    const family = FAMILY_META[unit.family || 0] || FAMILY_META[0];
    const role = unit.role ? `${family.role} · ${unit.role}` : family.role;

    const top = document.createElement('div');
    top.className = 'upgrade-card-top';
    top.innerHTML = `
      <div class="unit-emblem">${family.icon}</div>
      <div class="unit-copy">
        <strong>${unit.name}</strong>
        <span>${unit.unlocked ? role : `🔒 Nivel ${unit.unlock}`}</span>
      </div>
      <div class="unit-level">${unit.level}</div>`;

    const stats = document.createElement('div');
    stats.className = 'upgrade-stats';
    const factor = 1 + (unit.level - 1) * .12;
    stats.innerHTML = `
      <span title="Vida"><b>♥</b>${Math.round(unit.hp * factor)}</span>
      <span title="Ataque"><b>⚔</b>${Math.round(unit.damage * factor)}</span>
      <span title="Rango"><b>◎</b>${unit.range}</span>`;

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'upgrade-buy';
    if (!unit.unlocked) {
      action.disabled = true;
      action.textContent = `🔒 ${unit.unlock}`;
    } else if (unit.level >= unit.maxLevel) {
      action.disabled = true;
      action.classList.add('maxed');
      action.textContent = 'MÁX.';
    } else {
      action.disabled = coins < unit.cost;
      action.innerHTML = `<span>MEJORAR</span><strong>🪙 ${unit.cost}</strong>`;
      action.addEventListener('click', () => buy(unit.type));
    }

    card.append(top, stats, action);
    return card;
  }

  function renderUpgrades(message = '') {
    upgradeFrame = 0;
    if (activeTab !== 'upgrades') return;
    const state = api()?.getState?.();
    if (!state || !upgradeGrid) return;

    const fragment = document.createDocumentFragment();
    for (const unit of state.catalog || []) fragment.appendChild(unitCard(unit, state.coins));
    upgradeGrid.replaceChildren(fragment);

    if (upgradeCoins) upgradeCoins.textContent = String(state.coins);
    if (upgradeStatus) {
      upgradeStatus.textContent = message;
      upgradeStatus.classList.toggle('success', Boolean(message));
    }
    pendingMessage = '';
    refreshCampaign();
  }

  function queueUpgrades(message = '') {
    if (message) pendingMessage = message;
    if (activeTab !== 'upgrades' || upgradeFrame) return;
    upgradeFrame = requestAnimationFrame(() => renderUpgrades(pendingMessage));
  }

  function showTab(tab) {
    activeTab = tab;
    const campaign = tab === 'campaign';
    campaignTab?.classList.toggle('active', campaign);
    upgradesTab?.classList.toggle('active', !campaign);
    campaignPanel?.classList.toggle('hidden', !campaign);
    upgradesPanel?.classList.toggle('hidden', campaign);
    if (campaign) refreshCampaign();
    else queueUpgrades();
  }

  function buy(type) {
    const result = api()?.upgradeUnit?.(type);
    if (!result) return;
    if (result.ok) {
      const unit = api().getCatalog().find(u => u.type === type);
      queueUpgrades(`✓ ${unit.name} Nv.${result.level}`);
    } else if (result.reason === 'coins') queueUpgrades(`🪙 ${result.cost}`);
    else if (result.reason === 'locked') queueUpgrades(`🔒 Nivel ${result.unlock}`);
    else if (result.reason === 'max') queueUpgrades('MÁX.');
  }

  campaignTab?.addEventListener('click', () => showTab('campaign'));
  upgradesTab?.addEventListener('click', () => showTab('upgrades'));
  levelPath?.addEventListener('click', () => setTimeout(refreshCampaign, 0));

  window.addEventListener('rbtwar:ready', () => {
    document.body.classList.add('menu-open');
    refreshCampaign();
    showTab(activeTab);
  });

  window.addEventListener('rbtwar:state', () => {
    refreshCampaign();
    if (activeTab === 'upgrades') queueUpgrades();
  });

  const startScreen = $('startScreen');
  if (startScreen) {
    new MutationObserver(() => {
      const visible = !startScreen.classList.contains('hidden');
      document.body.classList.toggle('menu-open', visible);
      if (visible) {
        refreshCampaign();
        if (activeTab === 'upgrades') queueUpgrades();
      }
    }).observe(startScreen, { attributes:true, attributeFilter:['class'] });
  }
})();
