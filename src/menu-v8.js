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
  const selectedLevelInfo = $('selectedLevelInfo');
  const coinCount = $('coinCount');

  const WORLD_NAMES = ['Desierto Inicial', 'Cañón Avanzado', 'Bosque', 'Nieve', 'Ciudad', 'Zona Élite'];
  const statCopy = {
    basic: 'Equilibrado y confiable.',
    fast: 'Velocidad y presión constante.',
    heavy: 'Resistencia y potencia frontal.',
    sniper: 'Gran alcance y daño por disparo.'
  };

  let activeTab = 'campaign';

  function api() { return window.RBTwarAPI || null; }

  function showTab(tab) {
    activeTab = tab;
    const campaign = tab === 'campaign';
    campaignTab?.classList.toggle('active', campaign);
    upgradesTab?.classList.toggle('active', !campaign);
    campaignPanel?.classList.toggle('hidden', !campaign);
    upgradesPanel?.classList.toggle('hidden', campaign);
    if (!campaign) refreshUpgrades();
  }

  function worldFor(level) {
    return WORLD_NAMES[Math.min(5, Math.floor((Math.max(1, level) - 1) / 5))];
  }

  function refreshCampaign() {
    const state = api()?.getState?.();
    if (!state) return;
    const level = state.currentLevel || 1;
    const unlocked = (state.catalog || []).filter(u => u.unlocked).map(u => u.name);
    if (campaignZone) campaignZone.textContent = worldFor(level);
    if (campaignUnits) campaignUnits.textContent = unlocked.length ? unlocked.join(' · ') : 'Básico';
    if (campaignProgressFill) campaignProgressFill.style.width = `${Math.max(3, Math.min(100, state.unlockedLevel / 30 * 100))}%`;
  }

  function bonusText(level) {
    const extra = Math.max(0, level - 1);
    return `+${extra * 12}% vida/daño · -${extra * 7}% producción`;
  }

  function unitCard(unit, coins) {
    const card = document.createElement('article');
    card.className = `upgrade-card unit-${unit.type}${unit.unlocked ? '' : ' locked'}`;

    const top = document.createElement('div');
    top.className = 'upgrade-card-top';
    top.innerHTML = `
      <div class="unit-emblem">${unit.short}</div>
      <div class="unit-copy">
        <small>${unit.unlocked ? 'UNIDAD DISPONIBLE' : `SE DESBLOQUEA EN NIVEL ${unit.unlock}`}</small>
        <strong>${unit.name}</strong>
        <span>${statCopy[unit.type] || ''}</span>
      </div>
      <div class="unit-level">Nv. ${unit.level}</div>`;

    const stats = document.createElement('div');
    stats.className = 'upgrade-stats';
    stats.innerHTML = `
      <span><b>VID</b>${Math.round(unit.hp * (1 + (unit.level - 1) * .12))}</span>
      <span><b>ATQ</b>${Math.round(unit.damage * (1 + (unit.level - 1) * .12))}</span>
      <span><b>RNG</b>${unit.range}</span>`;

    const bonus = document.createElement('div');
    bonus.className = 'upgrade-bonus';
    bonus.textContent = bonusText(unit.level);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'upgrade-buy';

    if (!unit.unlocked) {
      action.disabled = true;
      action.textContent = `🔒 NIVEL ${unit.unlock}`;
    } else if (unit.level >= unit.maxLevel) {
      action.disabled = true;
      action.classList.add('maxed');
      action.textContent = 'MÁXIMO';
    } else {
      action.disabled = coins < unit.cost;
      action.innerHTML = `<span>MEJORAR A NV. ${unit.level + 1}</span><strong>🪙 ${unit.cost}</strong>`;
      action.addEventListener('click', () => buy(unit.type));
    }

    card.append(top, stats, bonus, action);
    return card;
  }

  function refreshUpgrades(message = '') {
    const state = api()?.getState?.();
    if (!state || !upgradeGrid) return;
    upgradeGrid.innerHTML = '';
    upgradeCoins.textContent = String(state.coins);
    for (const unit of state.catalog) upgradeGrid.appendChild(unitCard(unit, state.coins));
    if (upgradeStatus) {
      upgradeStatus.textContent = message || 'Cada nivel mejora vida, daño, movimiento y velocidad de producción.';
      upgradeStatus.classList.toggle('success', Boolean(message && message.startsWith('¡')));
    }
    refreshCampaign();
  }

  function buy(type) {
    const result = api()?.upgradeUnit?.(type);
    if (!result) return;
    if (result.ok) {
      const unit = api().getCatalog().find(u => u.type === type);
      refreshUpgrades(`¡${unit.name} mejorado a nivel ${result.level}!`);
      return;
    }
    if (result.reason === 'coins') refreshUpgrades(`Necesitas ${result.cost} monedas y tienes ${result.coins}.`);
    else if (result.reason === 'locked') refreshUpgrades(`Esa unidad se desbloquea al llegar al nivel ${result.unlock}.`);
    else if (result.reason === 'max') refreshUpgrades('Esa unidad ya alcanzó el nivel máximo.');
  }

  campaignTab?.addEventListener('click', () => showTab('campaign'));
  upgradesTab?.addEventListener('click', () => showTab('upgrades'));

  window.addEventListener('rbtwar:ready', () => {
    document.body.classList.add('menu-open');
    refreshCampaign();
    refreshUpgrades();
    showTab(activeTab);
  });
  window.addEventListener('rbtwar:state', () => {
    refreshCampaign();
    if (activeTab === 'upgrades') refreshUpgrades();
  });

  const startScreen = $('startScreen');
  if (startScreen) {
    const observer = new MutationObserver(() => {
      const visible = !startScreen.classList.contains('hidden');
      document.body.classList.toggle('menu-open', visible);
      if (visible) {
        refreshCampaign();
        if (activeTab === 'upgrades') refreshUpgrades();
      }
    });
    observer.observe(startScreen, { attributes: true, attributeFilter: ['class'] });
  }

  if (selectedLevelInfo) new MutationObserver(refreshCampaign).observe(selectedLevelInfo, { childList: true, characterData: true, subtree: true });
  if (coinCount) new MutationObserver(() => activeTab === 'upgrades' && refreshUpgrades()).observe(coinCount, { childList: true, characterData: true, subtree: true });
})();
