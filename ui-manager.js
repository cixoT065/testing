let activeTooltip = {
    target: null,
    itemId: null
};

const UIElements = {
    playerName: document.getElementById('player-name'), playerClass: document.getElementById('player-class'),
    playerLevel: document.getElementById('player-level'), playerStatPoints: document.getElementById('player-stat-points'),
    playerHpText: document.getElementById('player-hp-text'), playerHpFill: document.getElementById('player-hp-fill'),
    playerXpText: document.getElementById('player-xp-text'), playerXpFill: document.getElementById('player-xp-fill'),
    playerAtk: document.getElementById('player-atk'), playerDef: document.getElementById('player-def'),
    playerCritChance: document.getElementById('player-crit-chance'), playerCritDmg: document.getElementById('player-crit-dmg'),
    playerEvasion: document.getElementById('player-evasion'), playerAccuracy: document.getElementById('player-accuracy'),
    playerGold: document.getElementById('player-gold'), monsterName: document.getElementById('monster-name'),
    monsterHpText: document.getElementById('monster-hp-text'), monsterHpFill: document.getElementById('monster-hp-fill'),
    waveCounter: document.getElementById('wave-counter'), killCounter: document.getElementById('kill-counter'), 
    eventLog: document.getElementById('event-log'), battleLog: document.getElementById('battle-log'),
    challengeBossBtn: document.getElementById('challenge-boss-btn'),
    classSelectionModal: document.getElementById('class-selection-modal'), promotionModal: document.getElementById('promotion-modal'),
    classSelectionChoices: document.getElementById('class-selection-choices'),
    promotionChoices: document.getElementById('promotion-choices'),
    classDescription: document.getElementById('class-description'), promotionDescription: document.getElementById('promotion-description'),
    confirmClassBtn: document.getElementById('confirm-class-btn'),
    confirmPromotionBtn: document.getElementById('confirm-promotion-btn'),
    inventoryList: document.getElementById('inventory-list'), equipmentDisplay: document.getElementById('equipment-display'),
    newGameBtn: document.getElementById('new-game-btn'), rebirthBtn: document.getElementById('rebirth-btn'),
    manualSaveBtn: document.getElementById('manual-save-btn'), manualLoadBtn: document.getElementById('manual-load-btn'),
    manualSaveModal: document.getElementById('manual-save-modal'), manualSaveTextarea: document.getElementById('manual-save-textarea'),
    closeSaveModalBtn: document.getElementById('close-save-modal-btn'),
    sellNBtn: document.getElementById('sell-n-btn'), sellRBtn: document.getElementById('sell-r-btn'),
    rebirthPoints: document.getElementById('rebirth-points'), rebirthAtk: document.getElementById('rebirth-atk'),
    rebirthDef: document.getElementById('rebirth-def'), rebirthHp: document.getElementById('rebirth-hp'),
    rebirthGold: document.getElementById('rebirth-gold'), rebirthXp: document.getElementById('rebirth-xp'),
    globalTooltip: document.getElementById('global-tooltip'),
    skillPanel: document.getElementById('skill-panel'), skillDisplay: document.getElementById('skill-display'),
    pointInvestmentDisplay: document.getElementById('point-investment-display'),
    confirmInvestBtn: document.getElementById('confirm-invest-btn'),
    resetInvestBtn: document.getElementById('reset-invest-btn'),
    buyPotion25: document.getElementById('buy-potion-25'), buyPotion50: document.getElementById('buy-potion-50'),
    buyPotion75: document.getElementById('buy-potion-75'), buyPotion100: document.getElementById('buy-potion-100'),
    buyXpBoost2x: document.getElementById('buy-xp-boost-2x'), buyXpBoost3x: document.getElementById('buy-xp-boost-3x'),
    xpBoostStatus: document.getElementById('xp-boost-status'),
    blacksmithItemSelector: document.getElementById('blacksmith-item-selector'),
    blacksmithEnhancementPanel: document.getElementById('blacksmith-enhancement-panel'),
    enhancementInfo: document.getElementById('enhancement-info'),
    enhanceItemBtn: document.getElementById('enhance-item-btn'),
};

function updateAllUIs() { 
    updateUI(); 
    updateInventoryUI(); 
    updateEquipmentUI(); 
    updatePointInvestmentUI(); 
    updateSkillUI(); 
    updateBlacksmithUI();
}

function updateUI() {
    if (!gameState.player) return;
    const totalStats = getPlayerTotalStats();
    UIElements.playerName.textContent = gameState.player.name; UIElements.playerClass.textContent = gameState.player.className;
    UIElements.playerLevel.textContent = gameState.player.level;
    UIElements.playerHpText.textContent = `${Math.ceil(gameState.player.currentHp)} / ${Math.round(totalStats.hp)}`;
    UIElements.playerHpFill.style.width = `${(gameState.player.currentHp / totalStats.hp) * 100}%`;
    UIElements.playerXpText.textContent = `${gameState.player.xp} / ${gameState.player.xpToNextLevel}`;
    UIElements.playerXpFill.style.width = `${(gameState.player.xp / gameState.player.xpToNextLevel) * 100}%`;
    UIElements.playerAtk.textContent = Math.round(totalStats.atk); UIElements.playerDef.textContent = Math.round(totalStats.def);
    UIElements.playerAccuracy.textContent = `${(totalStats.accuracy * 100).toFixed(1)}%`;
    UIElements.playerEvasion.textContent = `${(totalStats.evasion * 100).toFixed(1)}%`;
    UIElements.playerCritChance.textContent = `${(totalStats.critChance * 100).toFixed(1)}%`;
    UIElements.playerCritDmg.textContent = `${(totalStats.critDmg * 100).toFixed(0)}%`;
    UIElements.playerGold.textContent = gameState.gold;

    if (gameState.currentMonster) {
        UIElements.monsterName.textContent = gameState.currentMonster.name;
        UIElements.monsterHpText.textContent = `${Math.ceil(gameState.currentMonster.hp)} / ${gameState.currentMonster.maxHp}`;
        UIElements.monsterHpFill.style.width = `${(gameState.currentMonster.hp / gameState.currentMonster.maxHp) * 100}%`;
    }
    UIElements.waveCounter.textContent = gameState.wave; UIElements.killCounter.textContent = gameState.kills;
    UIElements.rebirthPoints.textContent = gameState.rebirth.points; UIElements.rebirthAtk.textContent = gameState.rebirth.bonuses.atk;
    UIElements.rebirthDef.textContent = gameState.rebirth.bonuses.def;
    UIElements.rebirthHp.textContent = gameState.rebirth.bonuses.hp;
    UIElements.rebirthGold.textContent = gameState.rebirth.bonuses.gold;
    UIElements.rebirthXp.textContent = gameState.rebirth.bonuses.xp;

    const xpBoost = gameState.activeBoosts.xp;
    if (xpBoost && xpBoost.fightsRemaining > 0) {
        UIElements.xpBoostStatus.textContent = `XP BOOST: x${xpBoost.multiplier} (${xpBoost.fightsRemaining} fights left)`;
        UIElements.xpBoostStatus.style.display = 'block';
    } else {
        UIElements.xpBoostStatus.style.display = 'none';
    }

    const isBossFight = gameState.currentMonster && gameState.currentMonster.monsterType === 'boss';
    for (const key of [25, 50, 75, 100]) {
        const cost = gameState.potionCosts[`p${key}`];
        const btn = UIElements[`buyPotion${key}`];
        if (btn) {
            btn.textContent = `Buy (${cost}G)`;
            btn.disabled = isBossFight || gameState.gold < cost || gameState.player.currentHp >= totalStats.hp;
        }
    }

    const boost2xCost = 250 * gameState.wave;
    UIElements.buyXpBoost2x.textContent = `Buy (${boost2xCost}G)`;
    UIElements.buyXpBoost2x.disabled = gameState.gold < boost2xCost || !!gameState.activeBoosts.xp;
    
    const boost3xCost = 600 * gameState.wave;
    UIElements.buyXpBoost3x.textContent = `Buy (${boost3xCost}G)`;
    UIElements.buyXpBoost3x.disabled = gameState.gold < boost3xCost || !!gameState.activeBoosts.xp;
}

function updatePointInvestmentUI() {
    const display = UIElements.pointInvestmentDisplay;
    display.innerHTML = '';
    if (!gameState.player) return;

    const p = gameState.player;
    const allocation = gameState.playerTemp.pointAllocation;
    const totalPending = Object.values(allocation).reduce((a, b) => a + b, 0);
    const pointsAvailable = p.statPoints - totalPending;

    UIElements.playerStatPoints.textContent = `${p.statPoints} (${pointsAvailable} avail)`;

    for (const stat in p.investedStats) {
        const statDiv = document.createElement('div');
        statDiv.className = 'point-investment-stat';

        const currentVal = (p.baseStats[stat] || 0) +
            (stat === 'critChance' ? p.investedStats[stat] * 0.002 :
                stat === 'critDmg' ? p.investedStats[stat] * 0.005 :
                p.investedStats[stat]);

        const pendingPoints = allocation[stat];
        const pendingValue = (stat === 'critChance' ? pendingPoints * 0.002 :
            stat === 'critDmg' ? pendingPoints * 0.005 :
            pendingPoints);

        const futureVal = currentVal + pendingValue;

        let displayCurrent, displayFuture;
        if (['critChance', 'critDmg'].includes(stat)) {
            displayCurrent = `${(currentVal * 100).toFixed(1)}%`;
            displayFuture = `${(futureVal * 100).toFixed(1)}%`;
        } else {
            displayCurrent = Math.round(currentVal);
            displayFuture = Math.round(futureVal);
        }

        statDiv.innerHTML = `
            <span class="stat-label">${STAT_NAMES[stat]}: <span class="stat-value">${displayCurrent}</span>
                ${pendingPoints > 0 ? ` -> ${displayFuture}` : ''}
            </span>
            <div class="investment-controls">
                <button class="btn-minus" data-stat="${stat}">-</button>
                <span class="pending-points">${pendingPoints}</span>
                <button class="btn-plus" data-stat="${stat}">+</button>
            </div>
        `;
        const plusBtn = statDiv.querySelector('.btn-plus');
        const minusBtn = statDiv.querySelector('.btn-minus');
        plusBtn.disabled = pointsAvailable <= 0;
        minusBtn.disabled = pendingPoints <= 0;

        plusBtn.onclick = () => handlePointAllocation(stat, 1);
        minusBtn.onclick = () => handlePointAllocation(stat, -1);

        display.appendChild(statDiv);
    }
    UIElements.confirmInvestBtn.disabled = totalPending <= 0;
    UIElements.resetInvestBtn.disabled = totalPending <= 0;
}

function updateInventoryUI() {
    const list = UIElements.inventoryList;
    list.innerHTML = '';
    const equippedIds = Object.values(gameState.equipment);
    gameState.inventory.forEach(item => {
        const isEquipped = equippedIds.includes(item.id);
        const rarityColor = itemData.rarities[item.rarity].color;
        const enhancementText = (item.enhancementLevel || 0) > 0 ? ` +${item.enhancementLevel}` : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <div class="inventory-item-info" data-item-id="${item.id}">
                <span style="color: ${rarityColor};">${item.name}${enhancementText}</span>
                ${isEquipped ? '<span class="equipped-tag">[Equipped]</span>' : ''}
            </div>
            <div class="inventory-item-actions">
                <button class="equip-btn" data-item-id="${item.id}">${isEquipped ? 'Unequip' : 'Equip'}</button>
                <button class="sell-btn" data-item-id="${item.id}">Sell</button>
            </div>
        `;
        list.appendChild(itemDiv);
    });

    list.querySelectorAll('.inventory-item-info').forEach(el => {
        el.onclick = (e) => {
            const item = gameState.inventory.find(i => i.id == e.currentTarget.dataset.itemId);
            if (item) handleTooltipToggle(e, item, equippedIds.includes(item.id));
        };
    });
    list.querySelectorAll('.equip-btn').forEach(btn => {
        btn.onclick = (e) => {
            const item = gameState.inventory.find(i => i.id == e.currentTarget.dataset.itemId);
            if (item) {
                if (equippedIds.includes(item.id)) unequipItem(item.type);
                else equipItem(item);
            }
        };
    });
    list.querySelectorAll('.sell-btn').forEach(btn => {
        btn.onclick = (e) => sellItem(e.currentTarget.dataset.itemId);
        btn.disabled = equippedIds.includes(parseFloat(btn.dataset.itemId));
    });
}

function updateEquipmentUI() {
    const display = UIElements.equipmentDisplay;
    display.innerHTML = '';
    ['weapon', 'body', 'legs'].forEach(type => {
        const item = gameState.inventory.find(i => i.id === gameState.equipment[type]);
        const itemSlot = document.createElement('div');
        itemSlot.className = 'equipment-slot-display';
        let nameHTML = '---';
        if (item) {
            const enhancementText = (item.enhancementLevel || 0) > 0 ? ` +${item.enhancementLevel}` : '';
            nameHTML = `<span style="color: ${itemData.rarities[item.rarity].color};">${item.name}${enhancementText}</span>`;
            itemSlot.onclick = (e) => handleTooltipToggle(e, item, true);
        }
        itemSlot.innerHTML = `<strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${nameHTML}`;
        display.appendChild(itemSlot);
    });
}

function updateSkillUI() {
    const panel = UIElements.skillPanel;
    const display = UIElements.skillDisplay;
    display.innerHTML = '';

    if (!gameState.player || gameState.player.activeSkills.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'flex';
    const activeSkillData = Object.values(promotionSkills).filter(skill => gameState.player.activeSkills.includes(skill.name));
    
    activeSkillData.forEach(skillData => {
        const skillDiv = document.createElement('div');
        skillDiv.className = 'skill-entry';
        skillDiv.innerHTML = `
            <strong>${skillData.name}</strong>
            <p>${skillData.description}</p>
        `;
        display.appendChild(skillDiv);
    });
}

function updateBlacksmithUI() {
    const selector = UIElements.blacksmithItemSelector;
    selector.innerHTML = '';

    ['weapon', 'body', 'legs'].forEach(type => {
        const item = gameState.inventory.find(i => i.id === gameState.equipment[type]);
        const slot = document.createElement('div');
        slot.className = 'blacksmith-slot';
        slot.dataset.type = type;
        
        if (item) {
            const enhancementText = (item.enhancementLevel || 0) > 0 ? ` +${item.enhancementLevel}` : '';
            slot.innerHTML = `<span style="color: ${itemData.rarities[item.rarity].color};">${item.name}${enhancementText}</span>`;
        } else {
            slot.innerHTML = `[${type.charAt(0).toUpperCase() + type.slice(1)} Slot]`;
            slot.style.color = 'var(--disabled-text-color)';
        }
        
        if (gameState.playerTemp.blacksmithSelection === type) {
            slot.classList.add('selected');
        }

        slot.onclick = () => selectBlacksmithItem(type);
        selector.appendChild(slot);
    });

    updateEnhancementPanel();
}

function updateEnhancementPanel() {
    const panel = UIElements.blacksmithEnhancementPanel;
    const infoDiv = UIElements.enhancementInfo;
    const btn = UIElements.enhanceItemBtn;
    const selectedType = gameState.playerTemp.blacksmithSelection;
    const item = gameState.inventory.find(i => i.id === gameState.equipment[selectedType]);

    if (!item) {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'block';

    const cost = getEnhancementCost(item);
    const currentLevel = item.enhancementLevel || 0;
    const MAX_ENHANCEMENT = 10;
    const lastResult = gameState.playerTemp.lastEnhancementResult;

    let infoHTML = `
        <p style="text-align:center;"><strong style="color: ${itemData.rarities[item.rarity].color};">${item.name} (${item.rarity})</strong></p>
        <p>Enhancement: <strong>+${currentLevel} -> +${currentLevel >= MAX_ENHANCEMENT ? currentLevel : '?'}</strong></p>
        <hr style="border-color: var(--border-color);">
    `;
    
    const statPool = [];
    for (const stat in STAT_NAMES) {
        if ((item[stat] && typeof item[stat] === 'number')) {
            statPool.push(stat);
        }
    }

    if (currentLevel >= MAX_ENHANCEMENT) {
        infoHTML += `<p style="text-align:center;">Max Level Reached</p>`;
        btn.disabled = true;
    } else if (statPool.length > 0) {
        statPool.forEach(stat => {
            const baseValue = (item[stat] || 0);
            const enhancementBonus = item.enhancementBonusStats?.[stat] || 0;
            const totalValue = baseValue + enhancementBonus;
            const isPercent = ['critChance', 'critDmg'].includes(stat);
            const displayValue = isPercent ? `${(totalValue * 100).toFixed(1)}%` : Math.round(totalValue);

            let statLine = `<p>${STAT_NAMES[stat]}: ${displayValue} -> ?`;
            if (lastResult && lastResult.stat === stat) {
                statLine = `<p>${STAT_NAMES[stat]}: ${displayValue} <span class="stat-increase"><-- Just Enhanced!</span>`;
            }
            infoHTML += `${statLine}</p>`;
        });
        infoHTML += `<hr style="border-color: var(--border-color);"><p style="text-align:center;">Cost: <span style="color: var(--gold-color);">${cost}G</span></p>`;
        btn.disabled = gameState.gold < cost;
    } else {
        infoHTML += `<p style="text-align:center;">This item has no stats to enhance.</p>`;
        btn.disabled = true;
    }
    
    infoDiv.innerHTML = infoHTML;
}

function logAction(message, typeClass, logType = 'event') {
    const p = document.createElement('p');
    p.innerHTML = message;
    if (typeClass) p.classList.add(typeClass);

    const targetLog = logType === 'battle' ? UIElements.battleLog : UIElements.eventLog;
    targetLog.appendChild(p);
    targetLog.scrollTop = targetLog.scrollHeight;
}

function handleTooltipToggle(event, item, isEquipped) {
    event.stopPropagation();
    if (activeTooltip.itemId === item.id) {
        hideTooltip();
    } else {
        showTooltip(event.currentTarget, item, isEquipped);
    }
}

function showTooltip(targetElement, item, isEquipped) {
    hideTooltip(); 
    
    activeTooltip.target = targetElement;
    activeTooltip.itemId = item.id;
    
    const tooltip = UIElements.globalTooltip;
    const classColor = item.classReq === gameState.player.baseClassName ? 'var(--text-color)' : '#e06c75';
    const enhancementText = (item.enhancementLevel || 0) > 0 ? ` +${item.enhancementLevel}` : '';

    let content = `<strong style="color: ${itemData.rarities[item.rarity].color}; font-weight: bold;">${item.name}${enhancementText} (${item.type})</strong><br>`;
    content += `Rarity: <span style="color: ${itemData.rarities[item.rarity].color}; font-weight: bold;">${item.rarity}</span> | Class: <span style="color:${classColor};">${item.classReq}</span><br>----<br>`;
    
    const buildStatString = (stat, baseValue) => {
        const enhancementBonus = item.enhancementBonusStats?.[stat] || 0;
        if (baseValue === 0 && enhancementBonus === 0) return '';

        const totalValue = baseValue + enhancementBonus;
        const isPercent = ['critChance', 'critDmg'].includes(stat);
        let displayString;

        if (isPercent) {
            displayString = `+${(totalValue * 100).toFixed(1)}%`;
            if (enhancementBonus > 0) {
                displayString += ` (<span class="enhancement-bonus">+${(enhancementBonus * 100).toFixed(1)}%</span>)`;
            }
        } else {
            displayString = `+${Math.round(totalValue)}`;
            if (enhancementBonus > 0) {
                displayString += ` (<span class="enhancement-bonus">+${Math.round(enhancementBonus)}</span>)`;
            }
        }
        return `${STAT_NAMES[stat]}: ${displayString}<br>`;
    };

    let baseStatContent = '';
    let bonusStatContent = '';

    for (const stat in STAT_NAMES) {
        if (item[stat] && typeof item[stat] === 'number') {
            baseStatContent += buildStatString(stat, item[stat]);
        } else if (item.bonusStats && item.bonusStats[stat]) {
            bonusStatContent += buildStatString(stat, item.bonusStats[stat]);
        }
    }
    
    content += baseStatContent;
    if (bonusStatContent) {
        content += `---- (Bonus) ----<br>${bonusStatContent}`;
    }

    if (item.setName) {
        content += `----<br><strong>${item.setName}</strong><br>`;
        const setInfo = itemSets[item.setName];
        const equippedCount = gameState.inventory.filter(i => i.setName === item.setName && Object.values(gameState.equipment).includes(i.id)).length;
        for (const count in setInfo.bonuses) {
            const bonusIsActive = equippedCount >= count;
            content += `<span style="color: ${bonusIsActive ? 'var(--set-bonus-active)' : 'var(--disabled-text-color)'};">${setInfo.bonuses[count].description}</span><br>`;
        }
    }
    
    if (!isEquipped && gameState.equipment[item.type]) {
        const currentStats = getPlayerTotalStats();
        const futureStats = getPlayerTotalStats(item);
        let comparisonContent = '----<br><strong>Comparison:</strong><br>';
        let hasComparison = false;

        for (const stat in DISPLAY_STATS) {
            const diff = futureStats[stat] - currentStats[stat];
            if (Math.abs(diff) < 0.0001) continue;
            
            hasComparison = true;
            const isPercent = ['accuracy', 'evasion', 'critChance', 'critDmg'].includes(stat);
            let diffDisplay = isPercent ? `${(diff * 100).toFixed(1)}%` : `${Math.round(diff)}`;
            if (diff > 0) diffDisplay = `+${diffDisplay}`;

            const symbol = diff > 0 ? '▲' : '▼';
            const className = diff > 0 ? 'stat-increase' : 'stat-decrease';
            
            comparisonContent += `${DISPLAY_STATS[stat]}: <span class="${className}">${symbol}${diffDisplay}</span><br>`;
        }
        if (hasComparison) content += comparisonContent;
    }

    content += `----<br>Sell Value: ${itemData.rarities[item.rarity].value}G`;
    tooltip.innerHTML = content;

    tooltip.style.display = 'block';
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let top = targetRect.bottom + 5;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    if (top + tooltipRect.height > window.innerHeight) top = targetRect.top - tooltipRect.height - 5;
    if (left < 0) left = 5;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 5;
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    
    setTimeout(() => window.addEventListener('click', handleDocumentClickForTooltip), 0);
}

function hideTooltip() {
    if (activeTooltip.target) {
        UIElements.globalTooltip.style.display = 'none';
        activeTooltip.target = null;
        activeTooltip.itemId = null;
        window.removeEventListener('click', handleDocumentClickForTooltip);
    }
}

function handleDocumentClickForTooltip(event) {
    if (activeTooltip.target && !activeTooltip.target.contains(event.target) && !UIElements.globalTooltip.contains(event.target)) {
        hideTooltip();
    }
}

function showPromotionModal(choices) {
    gameState.isRunning = false;
    UIElements.promotionDescription.textContent = 'Select a promotion to learn more.';
    UIElements.confirmPromotionBtn.disabled = true;
    
    const promotionChoices = UIElements.promotionChoices;
    promotionChoices.innerHTML = '';

    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.dataset.promotion = choice;
        btn.onclick = () => {
            gameState.playerTemp.promotionSelection = choice;
            let description = promotionInfo[choice]?.description || 'No information available.';
            const skill = promotionSkills[choice];
            if(skill) {
                description += `<br><br><strong>New Skill: ${skill.name}</strong> - <em>${skill.description}</em>`;
            }
            UIElements.promotionDescription.innerHTML = description;
            promotionChoices.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            UIElements.confirmPromotionBtn.disabled = false;
        };
        promotionChoices.appendChild(btn);
    });

    UIElements.confirmPromotionBtn.onclick = () => {
        const selection = gameState.playerTemp.promotionSelection;
        if (selection) {
            gameState.player.className = selection;
            gameState.player.promotionPending = false;
            gameState.player.pendingPromotionChoices = null;

            const skill = promotionSkills[selection];
            if(skill && !gameState.player.activeSkills.includes(skill.name)) {
                gameState.player.activeSkills.push(skill.name);
                logAction(`You have learned the skill: <span class="log-skill">${skill.name}</span>!`, 'log-system', "event");
            }

            logAction(`You have been promoted to ${gameState.player.className}!`, 'log-system', "event");
            gameState.player.currentHp = getPlayerTotalStats().hp;
            UIElements.promotionModal.style.display = 'none';
            gameState.isRunning = true;
            updateAllUIs();
        }
    };
    
    UIElements.promotionModal.style.display = 'flex';
}

function setupTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `tab-content-${tabId}`);
            });
            if (tabId === 'blacksmith') {
                updateBlacksmithUI();
            }
        });
    });
}

function setupClassSelectionEvents() {
    const choiceButtons = UIElements.classSelectionChoices.querySelectorAll('button');
    
    choiceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const className = btn.dataset.class;
            gameState.playerTemp.classSelection = className;
            UIElements.classDescription.textContent = classes[className].description;
            
            choiceButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            UIElements.confirmClassBtn.disabled = false;
        });
    });

    UIElements.confirmClassBtn.addEventListener('click', () => {
        if (gameState.playerTemp.classSelection) {
            selectClass(gameState.playerTemp.classSelection);
        }
    });
}