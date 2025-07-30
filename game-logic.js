function getPlayerTotalStats(hypotheticalItem = null) {
    if (!gameState.player) return {};
    const p = gameState.player;
    const rawStats = {};

    for (const statName in STAT_NAMES) {
        rawStats[statName] = 0;
    }

    for (const statName in rawStats) {
        rawStats[statName] += p.baseStats[statName] || 0;
        if (p.investedStats[statName]) {
            if (statName === 'critChance') rawStats[statName] += p.investedStats[statName] * 0.002;
            else if (statName === 'critDmg') rawStats[statName] += p.investedStats[statName] * 0.005;
            else rawStats[statName] += p.investedStats[statName];
        }
    }

    const equippedSets = {};
    const effectiveEquipment = { ...gameState.equipment };
    if (hypotheticalItem) {
        effectiveEquipment[hypotheticalItem.type] = hypotheticalItem; 
    }

    for (const type in effectiveEquipment) {
        let item = effectiveEquipment[type];
        if (typeof item === 'number') {
            item = gameState.inventory.find(i => i.id === item);
        }

        if (item) {
            if (item.setName) {
                equippedSets[item.setName] = (equippedSets[item.setName] || 0) + 1;
            }
            for (const stat in item) {
                if (STAT_NAMES[stat] && typeof item[stat] === 'number') {
                    rawStats[stat] += item[stat];
                }
            }
            for (const stat in (item.bonusStats || {})) {
                if (rawStats[stat] !== undefined) {
                    rawStats[stat] += item.bonusStats[stat];
                }
            }
            for (const stat in (item.enhancementBonusStats || {})) {
                if (rawStats[stat] !== undefined) {
                    rawStats[stat] += item.enhancementBonusStats[stat];
                }
            }
        }
    }

    let hpPercentBonus = 0;
    for (const setName in equippedSets) {
        const setInfo = itemSets[setName];
        const count = equippedSets[setName];
        for (let i = 2; i <= count; i++) {
            if (setInfo.bonuses[i]) {
                for (const bonusStat in setInfo.bonuses[i]) {
                    if (bonusStat === 'description') continue;
                    if (bonusStat === 'hpPercent') {
                        hpPercentBonus += setInfo.bonuses[i][bonusStat];
                    } else if (rawStats[bonusStat] !== undefined) {
                        rawStats[bonusStat] += setInfo.bonuses[i][bonusStat];
                    }
                }
            }
        }
    }
    
    const finalStats = { ...rawStats };
    const primaryStat = classes[p.baseClassName].primaryStat;

    finalStats.atk = Math.pow(rawStats[primaryStat] || 1, PRIMARY_STAT_POWER_CURVE) + (gameState.rebirth.bonuses.atk || 0);
    finalStats.def = (rawStats.def || 0) + (gameState.rebirth.bonuses.def || 0);
    finalStats.hp = 50 + ((rawStats.con || 0) * 5) + (gameState.rebirth.bonuses.hp || 0);
    finalStats.accuracy = (rawStats.dex || 0) * 0.002;
    finalStats.evasion = (rawStats.agl || 0) * 0.001;

    if (hpPercentBonus > 0) {
        finalStats.hp *= (1 + hpPercentBonus);
    }

    if (p.activeSkills.includes('Frenzy') && !hypotheticalItem) {
        const missingHpPercent = 1 - (p.currentHp / finalStats.hp);
        const frenzyBonus = Math.floor(missingHpPercent / 0.1) * 0.08;
        finalStats.atk *= (1 + frenzyBonus);
    }
    if (gameState.playerTemp.standFirmTurns > 0 && !hypotheticalItem) {
        finalStats.def *= 1.30;
    }
    if (gameState.playerTemp.battleRushTurns > 0 && !hypotheticalItem) {
        finalStats.atk *= 1.20;
    }

    if (p.currentHp > finalStats.hp && !hypotheticalItem) {
        p.currentHp = finalStats.hp;
    }
    
    return finalStats;
}

function gameLoop() {
    if (!gameState.isRunning || !gameState.player || !gameState.currentMonster) return;
    const player = gameState.player;
    
    handleBuffsAndDebuffs();

    if (gameState.currentMonster.hp <= 0) { monsterDefeated(); return; }

    const playerStats = getPlayerTotalStats();
    let playerDamage = calculateDamage(playerStats, gameState.currentMonster, true);
    gameState.currentMonster.hp -= playerDamage.damage;
    logAction(`You hit ${gameState.currentMonster.name} for ${playerDamage.damage} damage.${playerDamage.isCrit ? ' (CRIT!)' : ''}`, 'log-player', 'battle');
    
    handlePostPlayerAttackSkills(playerStats, playerDamage);

    if (gameState.currentMonster.hp <= 0) { monsterDefeated(); return; }
    
    if (gameState.currentMonster.missNextAttack) {
        logAction(`${gameState.currentMonster.name}'s attack was nullified by a time distortion!`, 'log-skill', 'battle');
        gameState.currentMonster.missNextAttack = false;
    } else if (gameState.playerTemp.guaranteedEvasion) {
        logAction(`You phase through the attack, taking no damage!`, 'log-skill', 'battle');
        gameState.playerTemp.guaranteedEvasion = false;
    } else {
        let monsterDamage = calculateDamage(gameState.currentMonster, playerStats, false);
        
        let wasBlocked = false;
        if(player.activeSkills.includes('Aegis Block') && Math.random() < 0.15) {
            wasBlocked = true;
            if(player.activeSkills.includes('Holy Shield')) {
                const healAmount = Math.round(playerStats.hp * 0.05);
                player.currentHp = Math.min(playerStats.hp, player.currentHp + healAmount);
                logAction(`You blocked the attack with your Holy Shield, healing for ${healAmount} HP!`, 'log-skill', 'battle');
            } else {
                logAction(`You blocked the attack with Aegis Block!`, 'log-skill', 'battle');
            }

            if(player.activeSkills.includes('Stand Firm')) {
                gameState.playerTemp.standFirmTurns = 3;
                logAction(`You Stand Firm, bolstering your defense!`, 'log-skill', 'battle');
            }
            if(player.activeSkills.includes('Divine Retribution')) {
                const retaliateDmg = Math.round(playerStats.def);
                gameState.currentMonster.hp -= retaliateDmg;
                logAction(`Your shield erupts with holy light, dealing ${retaliateDmg} damage!`, 'log-skill', 'battle');
            }
            monsterDamage.damage = 0;
        }

        if (player.activeSkills.includes('Thornmail') && gameState.playerTemp.standFirmTurns > 0 && !wasBlocked) {
            const reflectDmg = Math.round(monsterDamage.preMitigationDamage * 0.20);
            gameState.currentMonster.hp -= reflectDmg;
            logAction(`Your Thornmail reflects ${reflectDmg} damage!`, 'log-skill', 'battle');
        }

        gameState.player.currentHp -= monsterDamage.damage;
        logAction(`${gameState.currentMonster.name} hits you for ${monsterDamage.damage} damage.`, 'log-monster', 'battle');
    }

    if (gameState.player.currentHp <= 0) playerDefeated();
    updateAllUIs();
}

function calculateDamage(attacker, defender, isPlayerAttacker) {
    const p = gameState.player;
    const monster = gameState.currentMonster;
    
    const MIN_HIT_CHANCE = 0.25;
    const MAX_HIT_CHANCE = 0.95;

    const defenderEvasion = isPlayerAttacker ? (monster.evasion || 0) : (defender.evasion || 0);
    const attackerAccuracy = attacker.accuracy || 0;

    let hitChance = 0.90 + attackerAccuracy - defenderEvasion;
    hitChance = Math.max(MIN_HIT_CHANCE, Math.min(MAX_HIT_CHANCE, hitChance));

    if (Math.random() > hitChance) {
        logAction(`${isPlayerAttacker ? 'Your' : (attacker.name + "'s")} attack was evaded!`, 'log-system', 'battle');
        return { damage: 0, isCrit: false, preMitigationDamage: 0 };
    }

    let isCrit = false;
    if (isPlayerAttacker) {
        gameState.playerTemp.attacksSinceLastFocus++;
        if (p.activeSkills.includes('Focus') && gameState.playerTemp.attacksSinceLastFocus >= 5) {
             isCrit = true;
             gameState.playerTemp.attacksSinceLastFocus = 0;
             logAction('Focus guarantees a critical hit!', 'log-skill', 'battle');
        } else if (gameState.playerTemp.guaranteedCrit) {
            isCrit = true;
            gameState.playerTemp.guaranteedCrit = false;
            logAction('Shadow Step guarantees a critical hit!', 'log-skill', 'battle');
        }
    }
    if(!isCrit) isCrit = Math.random() < (attacker.critChance || 0);

    let critMultiplier = isCrit ? (attacker.critDmg || 1.5) : 1;
    if (isCrit && isPlayerAttacker && p.activeSkills.includes('Lethal Precision') && gameState.playerTemp.attacksSinceLastFocus === 0) {
        critMultiplier += 0.5;
    }

    let baseDamage = (attacker.atk || 0);
    
    let defenderDef = isPlayerAttacker ? (monster.def || 0) : (defender.def || 0);
    if (isPlayerAttacker && monster.debuffs['Sunder']) {
        defenderDef *= (1 - (monster.debuffs['Sunder'].stacks * 0.1));
    }
     if (isPlayerAttacker && monster.debuffs['Apocalypse']) {
        defenderDef *= (1 - 0.15);
    }

    let damageMultiplier = 1.0;
    if (isPlayerAttacker) {
        let executeThreshold = 0.2;
        let executeBonus = 0.5;
        if (p.activeSkills.includes('Cull the Weak')) {
            executeThreshold = 0.3;
            executeBonus = 1.0;
        }
        if (p.activeSkills.includes('Execute') && monster.hp / monster.maxHp <= executeThreshold) {
            damageMultiplier += executeBonus;
        }
    }
    
    const preMitigationDamage = baseDamage * critMultiplier * damageMultiplier;
    const damageReduction = 1 - (defenderDef / (defenderDef + 100));
    let finalDamage = Math.round(preMitigationDamage * damageReduction);

    return { damage: Math.max(1, finalDamage), isCrit: isCrit, preMitigationDamage: preMitigationDamage };
}

function handlePostPlayerAttackSkills(playerStats, playerDamage) {
    const p = gameState.player;
    const monster = gameState.currentMonster;
    
    if (p.activeSkills.includes('Unyielding Assault') && gameState.playerTemp.battleRushTurns > 0) {
        const lifestealAmount = Math.round(playerDamage.damage * 0.10);
        p.currentHp = Math.min(playerStats.hp, p.currentHp + lifestealAmount);
        logAction(`Unyielding Assault heals you for ${lifestealAmount} HP.`, 'log-skill', 'battle');
    }

    if (p.activeSkills.includes('Double Shot') && Math.random() < 0.15) {
        const secondShotDmg = Math.round(playerDamage.damage * 0.6);
        monster.hp -= secondShotDmg;
        logAction(`Double Shot hits for an extra ${secondShotDmg} damage!`, 'log-skill', 'battle');
    }
    if (p.activeSkills.includes('Shadow Step') && Math.random() < 0.1) {
        gameState.playerTemp.guaranteedCrit = true;
        if (p.activeSkills.includes('Invisibility')) {
            gameState.playerTemp.guaranteedEvasion = true;
        }
    }
    if (p.activeSkills.includes('Battle Rush') && Math.random() < 0.2) {
        gameState.playerTemp.battleRushTurns = 3;
        logAction('Battle Rush grants you a surge of power!', 'log-skill', 'battle');
    }

    if (playerDamage.isCrit && p.activeSkills.includes('Bleed')) {
        const maxStacks = p.activeSkills.includes('Hemorrhage') ? 3 : 1;
        let logMsg;
        
        if (!monster.debuffs['Bleed']) {
            monster.debuffs['Bleed'] = { damage: Math.round(playerStats.atk * 0.3), duration: 3, stacks: 1 };
            logMsg = 'Your critical hit causes the enemy to Bleed!';
        } else {
            monster.debuffs['Bleed'].duration = 3;
            if (monster.debuffs['Bleed'].stacks < maxStacks) {
                monster.debuffs['Bleed'].stacks++;
                logMsg = 'Your critical hit adds a stack and refreshes Bleed!';
            } else {
                logMsg = 'Your critical hit refreshes Bleed!';
            }
        }
        logAction(logMsg, 'log-skill', 'battle');
    }

    if (p.activeSkills.includes('Sunder') && Math.random() < 0.25) {
        const maxStacks = p.activeSkills.includes('Armor Shatter') ? 3 : 1;
        if (!monster.debuffs['Sunder']) {
            monster.debuffs['Sunder'] = { duration: 5, stacks: 1 };
            logAction('You Sunder the enemy\'s armor!', 'log-skill', 'battle');
        } else if (monster.debuffs['Sunder'].stacks < maxStacks) {
            monster.debuffs['Sunder'].stacks++;
            monster.debuffs['Sunder'].duration = 5;
            logAction('You apply another stack of Sunder!', 'log-skill', 'battle');
        } else {
            monster.debuffs['Sunder'].duration = 5;
        }
    }

    let arcanePowerProc = false;
    let arcanePowerChance = 0;
    if(p.activeSkills.includes('High Voltage')) arcanePowerChance = 0.15;
    else if (p.activeSkills.includes('Arcane Power')) arcanePowerChance = 0.10;
    
    if (arcanePowerChance > 0 && Math.random() < arcanePowerChance) {
        arcanePowerProc = true;
        let arcaneDmg = playerStats.atk * (p.activeSkills.includes('High Voltage') ? 3.0 : 2.5);
        if (p.activeSkills.includes('Chain Lightning')) {
            arcaneDmg += playerStats.atk * 1.5;
        }
        arcaneDmg = Math.round(arcaneDmg);
        monster.hp -= arcaneDmg;
        logAction(`Arcane Power erupts for ${arcaneDmg} bonus damage!`, 'log-skill', 'battle');
    }
    if(arcanePowerProc && p.activeSkills.includes('Combustion')) {
        let burnDmg = playerStats.atk * (p.activeSkills.includes('Avatar') ? 1.0 : 0.5);
        monster.debuffs['Combustion'] = { damage: Math.round(burnDmg), duration: 3 };
        if(p.activeSkills.includes('Avatar')) monster.debuffs['Apocalypse'] = { duration: 3 };
        logAction('The enemy is engulfed in magical flames!', 'log-skill', 'battle');
    }

    let soulDrainChance = 0;
    if(p.activeSkills.includes('Devour Soul')) soulDrainChance = 0.08;
    else if (p.activeSkills.includes('Soul Drain')) soulDrainChance = 0.05;

    if (soulDrainChance > 0 && Math.random() < soulDrainChance) {
        let drainDmg = playerStats.atk * 1.5;
        if (p.activeSkills.includes('Annihilate')) {
            drainDmg += monster.maxHp * 0.05;
        }
        drainDmg = Math.round(drainDmg);
        monster.hp -= drainDmg;
        
        let healPercent = p.activeSkills.includes('Devour Soul') ? 0.75 : 0.50;
        const healAmount = Math.round(drainDmg * healPercent);
        p.currentHp = Math.min(playerStats.hp, p.currentHp + healAmount);
        logAction(`Soul Drain deals ${drainDmg} damage and heals you for ${healAmount}!`, 'log-skill', 'battle');

        if (p.activeSkills.includes('Time Warp')) {
            let missChance = p.activeSkills.includes('Paradox') ? 1.0 : 0.5;
            if (Math.random() < missChance) {
                monster.missNextAttack = true;
            }
        }
    }
}

function handleBuffsAndDebuffs() {
    const p = gameState.player;
    const monster = gameState.currentMonster;
    const playerStats = getPlayerTotalStats();

    if(gameState.playerTemp.standFirmTurns > 0) gameState.playerTemp.standFirmTurns--;
    if(gameState.playerTemp.battleRushTurns > 0) gameState.playerTemp.battleRushTurns--;

    for (const key in monster.debuffs) {
        const debuff = monster.debuffs[key];
        if (debuff.duration > 0) {
            if (key === 'Bleed') {
                let bleedDmg = debuff.damage * debuff.stacks;
                if (p.activeSkills.includes('Exsanguinate') && Math.random() < playerStats.critChance) {
                    bleedDmg = Math.round(bleedDmg * playerStats.critDmg);
                    logAction(`Bleed critically strikes for ${bleedDmg} damage!`, 'log-skill', 'battle');
                } else {
                    logAction(`Bleed deals ${bleedDmg} damage.`, 'log-monster', 'battle');
                }
                monster.hp -= bleedDmg;
            }
             if (key === 'Combustion') {
                monster.hp -= debuff.damage;
                logAction(`Combustion burns for ${debuff.damage} damage.`, 'log-monster', 'battle');
            }
            debuff.duration--;
        }
        if (debuff.duration <= 0) {
            delete monster.debuffs[key];
        }
    }
}

function monsterDefeated() {
    logAction(`You have defeated the ${gameState.currentMonster.name}!`, 'log-system', "event");

    const goldBonus = 1 + (gameState.rebirth.bonuses.gold / 100);
    const xpRebirthBonus = 1 + (gameState.rebirth.bonuses.xp / 100);
    const goldGained = Math.round(gameState.currentMonster.gold * goldBonus);

    let xpShopBoostMultiplier = 1;
    let xpLogMessage = '';
    if (gameState.activeBoosts.xp && gameState.activeBoosts.xp.fightsRemaining > 0) {
        xpShopBoostMultiplier = gameState.activeBoosts.xp.multiplier;
        gameState.activeBoosts.xp.fightsRemaining--;
        xpLogMessage = ` (x${xpShopBoostMultiplier} Boost!)`;
        if (gameState.activeBoosts.xp.fightsRemaining <= 0) {
            gameState.activeBoosts.xp = null;
            logAction('Your XP Boost has expired.', 'log-boost', "event");
        }
    }

    const xpGained = Math.round(gameState.currentMonster.xp * xpRebirthBonus * xpShopBoostMultiplier);

    gameState.gold += goldGained;
    gameState.player.xp += xpGained;
    logAction(`You gained ${goldGained} gold and ${xpGained} XP.${xpLogMessage}`, 'log-drop', "event");

    if (Math.random() < gameState.currentMonster.dropChance) {
        generateItemDrop(gameState.currentMonster);
    }

    gameState.kills++;
    if (gameState.currentMonster.monsterType === 'boss') {
        gameState.wave++;
        gameState.kills = 0;
        UIElements.challengeBossBtn.disabled = true;
    }

    if (gameState.kills >= 10 && gameState.currentMonster.monsterType !== 'boss') UIElements.challengeBossBtn.disabled = false;
    
    while (gameState.player.xp >= gameState.player.xpToNextLevel) {
        levelUp();
    }

    spawnMonster();
}

function playerDefeated() {
    gameState.player.currentHp = 0;
    logAction('You have been defeated!', 'log-monster', 'battle');
    const xpPenalty = Math.round(gameState.player.xpToNextLevel * 0.10);
    gameState.player.xp = Math.max(0, gameState.player.xp - xpPenalty);
    logAction(`As a penalty, you lose ${xpPenalty} XP.`, 'log-error', "event");
    gameState.player.currentHp = getPlayerTotalStats().hp * 0.5;
    logAction(`You revive with 50% health.`, 'log-system', "event");
    if (gameState.currentMonster.monsterType === 'boss') {
        UIElements.challengeBossBtn.disabled = true;
        spawnMonster();
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getRarityProbabilities(monsterType) {
    switch (monsterType) {
        case 'regular':
            return { N: 0.80, R: 0.17, SR: 0.025, SSR: 0.005, UR: 0, LR: 0 };
        case 'mutant':
            return { N: 0.647, R: 0.30, SR: 0.04, SSR: 0.01, UR: 0.003, LR: 0 };
        case 'elite':
            return { N: 0.459, R: 0.40, SR: 0.10, SSR: 0.03, UR: 0.01, LR: 0.001 };
        case 'boss':
            return { N: 0.10, R: 0.60, SR: 0.20, SSR: 0.075, UR: 0.02, LR: 0.005 };
        default:
            return { N: 1.0, R: 0, SR: 0, SSR: 0, UR: 0, LR: 0 };
    }
}

function generateItemDrop(monster) {
    if (gameState.inventory.length >= gameState.maxInventorySize) {
        logAction('Inventory is full!', 'log-system', "event"); return;
    }

    const classChoices = ['Warrior', 'Rogue', 'Wizard'];
    const classForDrop = classChoices[Math.floor(Math.random() * classChoices.length)];
    const itemType = itemData.types[Math.floor(Math.random() * itemData.types.length)];

    const probs = getRarityProbabilities(monster.monsterType);
    const rand = Math.random();
    let cumulativeProb = 0;
    let rarityKey = 'N';
    for (const rarity in probs) {
        if (rand < (cumulativeProb += probs[rarity])) {
            rarityKey = rarity;
            break;
        }
    }

    const rarityInfo = itemData.rarities[rarityKey];
    const waveScale = 1 + Math.log10(gameState.wave || 1);
    const SET_ITEM_CHANCE = 0.10;

    const newItem = {
        id: Date.now() + Math.random(),
        type: itemType,
        rarity: rarityKey,
        classReq: classForDrop,
        bonusStats: {},
        setName: null,
        enhancementLevel: 0,
        enhancementBonusStats: {},
    };

    for(const statName in STAT_NAMES) {
        newItem.enhancementBonusStats[statName] = 0;
    }

    let itemName;
    if (['SR', 'SSR', 'UR', 'LR'].includes(rarityKey) && Math.random() < SET_ITEM_CHANCE) {
        const possibleSets = Object.keys(itemSets).filter(name => itemSets[name].class === classForDrop);
        if (possibleSets.length > 0) {
            const selectedSetName = possibleSets[Math.floor(Math.random() * possibleSets.length)];
            newItem.setName = selectedSetName;
            const setItemNames = itemSets[selectedSetName].items;
            itemName = setItemNames[Math.floor(Math.random() * setItemNames.length)];
        }
    }

    if (!newItem.setName) {
        const possibleNames = itemData.names[itemType][classForDrop];
        const baseName = possibleNames[Math.floor(Math.random() * possibleNames.length)];
        const prefix = itemData.names.prefixes.Balanced[Math.floor(Math.random() * itemData.names.prefixes.Balanced.length)];
        itemName = `${prefix} ${baseName}`;
    }
    newItem.name = itemName;

    const calculateStatValue = (stat) => {
        let value;
        if (['critChance', 'critDmg'].includes(stat)) {
            value = (Math.random() * 0.03 + 0.005) * rarityInfo.statMod * waveScale;
        } else {
            value = Math.round((Math.random() * 3 + 1) * rarityInfo.statMod * waveScale);
        }
        return value;
    };

    let coreStat = null;
    if (newItem.type === 'weapon') coreStat = (newItem.classReq === 'Wizard') ? 'int' : 'str';
    else if (newItem.type === 'body') coreStat = 'def';
    else if (newItem.type === 'legs') coreStat = 'con';

    let baseStatPool = shuffleArray([...itemData.bonusStatPool]);
    baseStatPool = baseStatPool.filter(s => s !== coreStat);

    if (coreStat) {
        newItem[coreStat] = calculateStatValue(coreStat);
    }
    
    const generatedBaseStats = [];
    const baseStatsToGenerate = rarityInfo.baseStatCount - (coreStat ? 1 : 0);
    for (let i = 0; i < baseStatsToGenerate; i++) {
        if (baseStatPool.length === 0) break;
        const stat = baseStatPool.pop();
        newItem[stat] = calculateStatValue(stat);
        generatedBaseStats.push(stat);
    }

    let bonusStatPool = shuffleArray([...itemData.bonusStatPool]);
    bonusStatPool = bonusStatPool.filter(s => s !== coreStat && !generatedBaseStats.includes(s));
    for (let i = 0; i < rarityInfo.bonusStats; i++) {
        if (bonusStatPool.length === 0) break;
        const stat = bonusStatPool.pop();
        newItem.bonusStats[stat] = calculateStatValue(stat);
    }

    gameState.inventory.push(newItem);
    const color = rarityInfo.color;
    logAction(`You found a [<span style="color:${color}; font-weight: bold;">${rarityKey}</span>] <span style="color:${color}">${newItem.name}</span>!`, 'log-drop', "event");
    updateInventoryUI();
}

function spawnMonster(isBoss = false) {
    gameState.isRunning = true;
    let monsterTemplate;
    if (isBoss) {
        monsterTemplate = monsters.bosses[(gameState.wave - 1) % monsters.bosses.length];
    } else {
        const rand = Math.random();
        if (gameState.wave > 3 && rand < 0.15) {
            monsterTemplate = monsters.elite[Math.floor(Math.random() * monsters.elite.length)];
        } else if (gameState.wave > 1 && rand < 0.30) {
            monsterTemplate = monsters.mutant[Math.floor(Math.random() * monsters.mutant.length)];
        } else {
            monsterTemplate = monsters.regular[Math.floor(Math.random() * monsters.regular.length)];
        }
    }

    const hpScale = Math.pow(1.20, gameState.wave - 1);
    const statScale = Math.pow(1.12, gameState.wave - 1);
    const goldScale = Math.pow(1.15, gameState.wave - 1);
    const xpScale = Math.pow(1.09, gameState.wave - 1);

    gameState.currentMonster = {
        ...monsterTemplate,
        hp: Math.round(monsterTemplate.baseHp * hpScale),
        maxHp: Math.round(monsterTemplate.baseHp * hpScale),
        atk: Math.round(monsterTemplate.baseAtk * statScale),
        def: Math.round(monsterTemplate.baseDef * statScale),
        evasion: monsterTemplate.baseEvasion + (gameState.wave * 0.001),
        accuracy: 0,
        gold: Math.round(monsterTemplate.gold * goldScale),
        xp: Math.round(monsterTemplate.xp * xpScale),
        isBoss: isBoss,
        debuffs: {},
        missNextAttack: false,
    };
    logAction(`A wild ${gameState.currentMonster.name} appears!`, 'log-system', "event");
    updateAllUIs();
}

function getAvailablePromotion(player) {
    const baseClassInfo = classes[player.baseClassName];
    if (!baseClassInfo || !baseClassInfo.promotions) return null;

    const promotionTiers = Object.keys(baseClassInfo.promotions).sort((a, b) => a - b);

    for (const tierLevel of promotionTiers) {
        if (player.level >= tierLevel) {
            const tier = baseClassInfo.promotions[tierLevel];
            if (Array.isArray(tier) && player.className === player.baseClassName) {
                return { level: tierLevel, choices: tier };
            } else if (typeof tier === 'object' && tier[player.className]) {
                return { level: tierLevel, choices: tier[player.className] };
            }
        }
    }
    return null;
}

function levelUp() {
    const p = gameState.player;
    
    p.xp -= p.xpToNextLevel;
    p.level++;
    p.xpToNextLevel = Math.round(38 * Math.pow(p.level, 1.45));
    
    const pointsGained = Math.floor(Math.random() * 3) + 5;
    p.statPoints += pointsGained;

    let growth = { ...classes[p.baseClassName].growth };
    const promoAdjust = promotionGrowthAdjustments[p.className];
    if (promoAdjust) {
        for (const stat in promoAdjust) {
            growth[stat] = (growth[stat] || 0) + promoAdjust[stat];
        }
    }
    for (const stat in growth) {
        p.baseStats[stat] += growth[stat];
    }

    p.currentHp = getPlayerTotalStats().hp;
    logAction(`LEVEL UP! You are now level ${p.level}. Gained ${pointsGained} stat points.`, 'log-system', "event");
    logAction('Health fully restored!', 'log-system', "event");
    if (p.level >= 70) UIElements.rebirthBtn.style.display = 'block';

    if (!p.promotionPending) {
        const availablePromotion = getAvailablePromotion(p);
        if (availablePromotion) {
            p.promotionPending = true;
            p.pendingPromotionChoices = availablePromotion.choices;
            showPromotionModal(availablePromotion.choices);
        }
    }
    updateAllUIs();
}

function selectClass(className) {
    const classInfo = classes[className];
    gameState.player = {
        name: 'Player-' + Math.floor(1000 + Math.random() * 9000),
        className: className, baseClassName: className,
        level: 1, xp: 0, xpToNextLevel: 40,
        statPoints: 5,
        baseStats: { ...classInfo.base },
        investedStats: { str: 0, con: 0, def: 0, dex: 0, agl: 0, int: 0, critChance: 0, critDmg: 0 },
        currentHp: classInfo.base.hp, activeSkills: [],
        promotionPending: false,
        pendingPromotionChoices: null,
    };
    resetTransientData();
    UIElements.classSelectionModal.style.display = 'none';
    logAction(`You have chosen the path of the ${className}.`, 'log-system', "event");
    startGame();
}

function equipItem(itemToEquip) {
    if (itemToEquip.classReq !== gameState.player.baseClassName) {
        logAction(`Cannot equip: ${itemToEquip.name}. Requires ${itemToEquip.classReq} class.`, 'log-error', "event");
        return;
    }
    gameState.equipment[itemToEquip.type] = itemToEquip.id;
    logAction(`Equipped <span style="color:${itemData.rarities[itemToEquip.rarity].color};">${itemToEquip.name}</span>.`, 'log-system', "event");
    hideTooltip();
    updateAllUIs();
}

function unequipItem(itemType) {
    const itemToUnequip = gameState.inventory.find(item => item.id === gameState.equipment[itemType]);
    gameState.equipment[itemType] = null;
    if (itemToUnequip) logAction(`Unequipped <span style="color:${itemData.rarities[itemToUnequip.rarity].color};">${itemToUnequip.name}</span>.`, 'log-system', "event");
    hideTooltip();
    updateAllUIs();
}

function sellItem(itemId) {
    const itemIndex = gameState.inventory.findIndex(i => i.id == itemId);
    if (itemIndex === -1) return;
    const item = gameState.inventory[itemIndex];
    if (Object.values(gameState.equipment).includes(item.id)) {
        logAction("Cannot sell an equipped item.", 'log-error', "event"); return;
    }
    const sellValue = itemData.rarities[item.rarity].value;
    gameState.gold += sellValue;
    gameState.inventory.splice(itemIndex, 1);
    logAction(`Sold <span style="color:${itemData.rarities[item.rarity].color};">${item.name}</span> for ${sellValue}G.`, 'log-system', "event");
    hideTooltip();
    updateAllUIs();
}

function sellItemsByRarity(rarity) {
    let soldCount = 0; let goldEarned = 0;
    const equippedIds = Object.values(gameState.equipment);
    const itemsToKeep = gameState.inventory.filter(item => {
        if (item.rarity === rarity && !equippedIds.includes(item.id)) {
            goldEarned += itemData.rarities[item.rarity].value; soldCount++; return false;
        }
        return true;
    });
    if (soldCount > 0) {
        gameState.inventory = itemsToKeep; gameState.gold += goldEarned;
        logAction(`Sold ${soldCount} [${rarity}] items for ${goldEarned}G.`, 'log-system', "event");
        updateAllUIs();
    } else {
        logAction(`No unequipped [${rarity}] items to sell.`, 'log-system', "event");
    }
}

function handlePointAllocation(stat, amount) {
    if (!gameState.player) return;
    const allocation = gameState.playerTemp.pointAllocation;
    const totalPending = Object.values(allocation).reduce((a, b) => a + b, 0);

    if (amount > 0 && gameState.player.statPoints - totalPending > 0) {
        allocation[stat]++;
    } else if (amount < 0 && allocation[stat] > 0) {
        allocation[stat]--;
    }
    updateAllUIs();
}

function confirmPointInvestment() {
    if (!gameState.player) return;
    const allocation = gameState.playerTemp.pointAllocation;
    const totalToSpend = Object.values(allocation).reduce((a, b) => a + b, 0);

    if (totalToSpend > 0 && gameState.player.statPoints >= totalToSpend) {
        for (const stat in allocation) {
            gameState.player.investedStats[stat] += allocation[stat];
        }
        gameState.player.statPoints -= totalToSpend;
        logAction(`Invested ${totalToSpend} points.`, 'log-system', "event");
        resetPointInvestment();
    }
}

function resetPointInvestment() {
    for (const stat in gameState.playerTemp.pointAllocation) {
        gameState.playerTemp.pointAllocation[stat] = 0;
    }
    updateAllUIs();
}

function buyPotion(percent) {
    const cost = gameState.potionCosts[`p${percent}`];
    const totalStats = getPlayerTotalStats();
    if (gameState.gold >= cost && gameState.player.currentHp < totalStats.hp) {
        gameState.gold -= cost;
        const healAmount = totalStats.hp * (percent / 100);
        gameState.player.currentHp = Math.min(totalStats.hp, gameState.player.currentHp + healAmount);
        gameState.potionCosts[`p${percent}`] = Math.round(cost * 1.03);
        logAction(`You drink a potion, restoring health.`, 'log-system', "event");
        updateUI();
    }
}

function buyXpBoost(multiplier) {
    const baseCost = multiplier === 2 ? 250 : 600;
    const cost = baseCost * gameState.wave;

    if (gameState.gold >= cost && !gameState.activeBoosts.xp) {
        gameState.gold -= cost;
        gameState.activeBoosts.xp = {
            multiplier: multiplier,
            fightsRemaining: 100
        };
        logAction(`Purchased a x${multiplier} XP Boost for 100 fights!`, 'log-boost', "event");
        updateAllUIs();
    }
}

function selectBlacksmithItem(type) {
    gameState.playerTemp.blacksmithSelection = type;
    gameState.playerTemp.lastEnhancementResult = null;
    updateBlacksmithUI();
}

function getEnhancementCost(item) {
    if (!item) return 0;
    const baseCost = 50;
    const rarityMod = itemData.rarities[item.rarity].enhanceCostMod;
    const levelMod = Math.pow(1.4, (item.enhancementLevel || 0));
    return Math.round(baseCost * rarityMod * levelMod);
}

function enhanceSelectedItem() {
    const selectedType = gameState.playerTemp.blacksmithSelection;
    const item = gameState.inventory.find(i => i.id === gameState.equipment[selectedType]);
    if (!item) return;

    const currentLevel = item.enhancementLevel || 0;
    const MAX_ENHANCEMENT = 10;
    if (currentLevel >= MAX_ENHANCEMENT) {
        logAction("This item is already at max enhancement level.", "log-error", "event");
        return;
    }

    const cost = getEnhancementCost(item);
    if (gameState.gold < cost) {
        logAction('Not enough gold to enhance.', 'log-error', "event");
        return;
    }
    
    const statPool = [];
    for (const stat in STAT_NAMES) {
        if ((item[stat] && typeof item[stat] === 'number')) {
            statPool.push(stat);
        }
    }

    if (statPool.length === 0) {
        logAction("This item has no stats to enhance.", "log-error", "event");
        return;
    }
    
    gameState.gold -= cost;

    const statToEnhance = statPool[Math.floor(Math.random() * statPool.length)];
    let increase = 0;
    let isPercent = false;

    if (statToEnhance === 'critChance') {
        increase = 0.003; isPercent = true;
    } else if (statToEnhance === 'critDmg') {
        increase = 0.01; isPercent = true;
    } else {
        const baseValue = (item[statToEnhance] || 0);
        increase = 1 + Math.round(baseValue * 0.10);
    }
    
    item.enhancementBonusStats[statToEnhance] = (item.enhancementBonusStats[statToEnhance] || 0) + increase;
    item.enhancementLevel = currentLevel + 1;
    
    gameState.playerTemp.lastEnhancementResult = { stat: statToEnhance };

    const displayIncrease = isPercent ? `${(increase * 100).toFixed(1)}%` : `+${increase}`;
    logAction(`Successfully enhanced <span style="color:${itemData.rarities[item.rarity].color};">${item.name}</span>! ${STAT_NAMES[statToEnhance]} increased by ${displayIncrease}.`, 'log-system', "event");
    
    updateAllUIs();
}

function investRebirthPoint(stat) {
    if (gameState.rebirth.points > 0) {
        gameState.rebirth.points--;
        if (['gold', 'xp'].includes(stat)) gameState.rebirth.bonuses[stat] += 1;
        else gameState.rebirth.bonuses[stat] += (stat === 'hp' ? 5 : 1);
        updateAllUIs();
    }
}