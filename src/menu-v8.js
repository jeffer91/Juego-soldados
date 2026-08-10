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

  const ZONES = ['Desierto', 'Cañón', 'Bosque', 'Nieve', 'Ciudad', 'Élite'];
  const unitMeta = {
    basic: { icon: '◆', role: 'CAPTURA' },
    fast: { icon: '⚡', role: 'RÁPIDO' },
    heavy: { icon: '⬢', role: 'BLINDADO' },
    sniper: { icon: '◎', role: 'ALCANCE' }
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

  function zoneFor(level, meta) {
    const key = meta?.biome;
    const byKey = { desert:'Desierto', canyon:'Cañón', forest:'Bosque', snow:'Nieve', city:'Ciudad', elite:'Élite' };
    return byKey[key] || ZONES[Math.floor((Math.max(1, level) - 1) / 5) % ZONES.length];
  }

  function refreshCampaign() {
    const state = api()?.getState?.();
    if (!state) return;
    const level = Math.max(1, state.currentLevel || 1);
    const unlocked = (state.catalog || []).filter(u => u.unlocked).map(u => u.short || u.name.slice(0,3).toUpperCase());
    if (campaignZone) campaignZone.textContent = zoneFor(level, state.levelMeta);
    if (campaignUnits) campaignUnits.textContent = unlocked.join(' · ') || 'BAS';
    if (campaignProgressFill) campaignProgressFill.style.width = `${(((level - 1) % 10) + 1) * 10}%`;
  }

  function unitCard(unit, coins) {
    const card = document.createElement('article');
    card.className = `upgrade-card unit-${unit.type}${unit.unlocked ? '' : ' locked'}`;
    const meta = unitMeta[unit.type] || { icon:'●', role:'' };

    const top = document.createElement('div');
    top.className = 'upgrade-card-top';
    top.innerHTML = `
      <div class="unit-emblem">${meta.icon}</div>
      <div class="unit-copy">
        <strong>${unit.name}</strong>
        <span>${unit.unlocked ? meta.role : `🔒 Nivel ${unit.unlock}`}</span>
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

  function refreshUpgrades(message = '') {
    const state = api()?.getState?.();
    if (!state || !upgradeGrid) return;
    upgradeGrid.innerHTML = '';
    if (upgradeCoins) upgradeCoins.textContent = String(state.coins);
    for (const unit of state.catalog || []) upgradeGrid.appendChild(unitCard(unit, state.coins));
    if (upgradeStatus) {
      upgradeStatus.textContent = message;
      upgradeStatus.classList.toggle('success', Boolean(message));
    }
    refreshCampaign();
  }

  function buy(type) {
    const result = api()?.upgradeUnit?.(type);
    if (!result) return;
    if (result.ok) {
      const unit = api().getCatalog().find(u => u.type === type);
      refreshUpgrades(`✓ ${unit.name} Nv.${result.level}`);
    } else if (result.reason === 'coins') refreshUpgrades(`🪙 ${result.cost}`);
    else if (result.reason === 'locked') refreshUpgrades(`🔒 Nivel ${result.unlock}`);
    else if (result.reason === 'max') refreshUpgrades('MÁX.');
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
    new MutationObserver(() => {
      const visible = !startScreen.classList.contains('hidden');
      document.body.classList.toggle('menu-open', visible);
      if (visible) {
        refreshCampaign();
        if (activeTab === 'upgrades') refreshUpgrades();
      }
    }).observe(startScreen, { attributes:true, attributeFilter:['class'] });
  }

  if (selectedLevelInfo) new MutationObserver(refreshCampaign).observe(selectedLevelInfo, { childList:true, characterData:true, subtree:true });
  if (coinCount) new MutationObserver(() => activeTab === 'upgrades' && refreshUpgrades()).observe(coinCount, { childList:true, characterData:true, subtree:true });
})();
