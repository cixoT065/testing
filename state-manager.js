let gameState = getDefaultGameState();

function getDefaultGameState() {
    return {
        player: null, currentMonster: null, wave: 1, kills: 0, gold: 0, isRunning: false,
        potionCosts: { p25: 20, p50: 35, p75: 50, p100: 65 },
        inventory: [],
        equipment: { weapon: null, body: null, legs: null },
        maxInventorySize: 20,
        rebirth: { points: 0, bonuses: { atk: 0, def: 0, hp: 0, gold: 0, xp: 0 } },
        activeBoosts: { xp: null },
        playerTemp: {
            pointAllocation: { str: 0, con: 0, def: 0, dex: 0, agl: 0, int: 0, critChance: 0, critDmg: 0 },
            classSelection: null,
            promotionSelection: null,
            blacksmithSelection: null,
            lastEnhancementResult: null,
            standFirmTurns: 0,
            battleRushTurns: 0,
            guaranteedCrit: false,
            guaranteedEvasion: false,
            attacksSinceLastFocus: 0,
        }
    };
}

function autoSaveToLocalStorage() {
    if (!gameState.player || !gameState.isRunning) return;
    try {
        const stateToSave = { ...gameState };
        delete stateToSave.playerTemp; // Don't save transient data
        const gameStateString = JSON.stringify(stateToSave);
        localStorage.setItem(SAVE_KEY, gameStateString);
    } catch (e) {
        console.error("Auto-save failed:", e);
        logAction("Auto-save failed. Use Export Save as a backup.", "log-error", "event");
    }
}

function migrateSaveData(loadedState) {
    if (loadedState.inventory && Array.isArray(loadedState.inventory)) {
        loadedState.inventory.forEach(item => {
            if (item) {
                if (item.enhancementLevel === undefined) item.enhancementLevel = 0;
                if (item.bonusStats === undefined) item.bonusStats = {};
                if (item.enhancementBonusStats === undefined) item.enhancementBonusStats = {};
                if (item.enhancementProgress) delete item.enhancementProgress; // Remove obsolete property
                
                for (const statName in STAT_NAMES) {
                    if (item.enhancementBonusStats[statName] === undefined) {
                        item.enhancementBonusStats[statName] = 0;
                    }
                }
            }
        });
    }

    if (loadedState.player) {
        if (loadedState.player.promotionPending === undefined) {
            loadedState.player.promotionPending = false;
        }
        if (loadedState.player.pendingPromotionChoices === undefined) {
             loadedState.player.pendingPromotionChoices = null;
        }
        if (loadedState.player.activeSkills === undefined) {
            loadedState.player.activeSkills = [];
        }
    }
    
    return loadedState;
}

function loadFromLocalStorage() {
    try {
        const savedState = localStorage.getItem(SAVE_KEY);
        if (savedState) {
            let loadedState = JSON.parse(savedState);
            if (!loadedState.player || !loadedState.player.baseStats) throw new Error("Invalid save.");
            
            loadedState = migrateSaveData(loadedState);

            gameState = deepMerge(getDefaultGameState(), loadedState);
            resetTransientData();
            logAction("Game loaded automatically.", 'log-system', "event");
            return true;
        }
    } catch (e) {
        console.error("Failed to load from localStorage:", e);
        logAction('Could not auto-load game. Starting new game.', 'log-error', "event");
        localStorage.removeItem(SAVE_KEY);
    }
    return false;
}

function manualSave() {
    if (!gameState.player) return;
    try {
        const stateToSave = { ...gameState };
        delete stateToSave.playerTemp;
        const encodedSave = btoa(JSON.stringify(stateToSave));
        UIElements.manualSaveTextarea.value = encodedSave;
        UIElements.manualSaveModal.style.display = 'flex';
        UIElements.manualSaveTextarea.select();
        logAction("Exported save state.", 'log-system', "event");
    } catch (e) {
        console.error("Manual save failed:", e);
        logAction('EXPORT FAILED.', 'log-error', "event");
    }
}

function manualLoad() {
    const encodedSave = prompt("Please paste your save code:");
    if (!encodedSave) return;
    try {
        let loadedState = JSON.parse(atob(encodedSave));
        if (!loadedState.player || !loadedState.player.baseStats) throw new Error("Invalid save.");

        loadedState = migrateSaveData(loadedState);

        clearInterval(gameInterval); clearInterval(autoSaveInterval);
        gameState = deepMerge(getDefaultGameState(), loadedState);
        resetTransientData();
        logAction("Game imported successfully.", 'log-system', "event");
        UIElements.classSelectionModal.style.display = 'none';
        startGame();
        checkForPendingActions();
    } catch (e) {
        console.error("Manual load failed:", e);
        logAction('IMPORT FAILED: Invalid save code.', 'log-error', "event");
    }
}

function resetTransientData() {
    gameState.playerTemp = {
        pointAllocation: { str: 0, con: 0, def: 0, dex: 0, agl: 0, int: 0, critChance: 0, critDmg: 0 },
        classSelection: null,
        promotionSelection: null,
        blacksmithSelection: null,
        lastEnhancementResult: null,
        standFirmTurns: 0,
        battleRushTurns: 0,
        guaranteedCrit: false,
        guaranteedEvasion: false,
        attacksSinceLastFocus: 0,
    };
    if (gameState.currentMonster) {
        gameState.currentMonster.debuffs = {};
        gameState.currentMonster.missNextAttack = false;
    }
}

function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }

function deepMerge(target, source) {
    let output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key]) && key in target && isObject(target[key])) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
}