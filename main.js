let gameInterval;
let autoSaveInterval;

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function startGame() {
    if (gameInterval) clearInterval(gameInterval);
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    gameState.isRunning = true;
    if (!gameState.currentMonster) spawnMonster();

    updateAllUIs();
    gameInterval = setInterval(gameLoop, 1000);
    autoSaveInterval = setInterval(autoSaveToLocalStorage, 15000);
}

function initializeGame() {
    setupTabs();
    setupClassSelectionEvents();
    setupEventListeners();
    if (loadFromLocalStorage()) {
        UIElements.classSelectionModal.style.display = 'none';
        startGame();
        checkForPendingActions();
    } else {
        logAction("Welcome to Idle RPG. Select your class to begin.", 'log-system', "event");
        UIElements.classSelectionModal.style.display = 'flex';
    }
}

function setupEventListeners() {
    UIElements.manualSaveBtn.onclick = manualSave;
    UIElements.manualLoadBtn.onclick = manualLoad;
    UIElements.closeSaveModalBtn.onclick = () => { UIElements.manualSaveModal.style.display = 'none'; };
    UIElements.newGameBtn.onclick = handleNewGame;
    UIElements.rebirthBtn.onclick = handleRebirth;
    UIElements.challengeBossBtn.onclick = () => {
        spawnMonster(true);
        gameState.player.currentHp = getPlayerTotalStats().hp;
        UIElements.challengeBossBtn.disabled = true;
        updateUI();
    };
    UIElements.buyPotion25.onclick = () => buyPotion(25);
    UIElements.buyPotion50.onclick = () => buyPotion(50);
    UIElements.buyPotion75.onclick = () => buyPotion(75);
    UIElements.buyPotion100.onclick = () => buyPotion(100);
    UIElements.buyXpBoost2x.onclick = () => buyXpBoost(2);
    UIElements.buyXpBoost3x.onclick = () => buyXpBoost(3);
    document.querySelectorAll('#tab-content-rebirth .rebirth-stat button').forEach(btn => {
        btn.onclick = () => investRebirthPoint(btn.dataset.rebirth);
    });
    UIElements.sellNBtn.onclick = () => sellItemsByRarity('N');
    UIElements.sellRBtn.onclick = () => sellItemsByRarity('R');
    UIElements.confirmInvestBtn.onclick = confirmPointInvestment;
    UIElements.resetInvestBtn.onclick = resetPointInvestment;
    UIElements.enhanceItemBtn.onclick = enhanceSelectedItem;
}

function checkForPendingActions() {
    if (gameState.player && gameState.player.promotionPending && gameState.player.pendingPromotionChoices) {
        logAction("Promotion choice is pending. Please select your new class.", "log-system", "event");
        showPromotionModal(gameState.player.pendingPromotionChoices);
    } else if (gameState.player) {
        const availablePromotion = getAvailablePromotion(gameState.player);
        if (availablePromotion) {
             gameState.player.promotionPending = true;
             gameState.player.pendingPromotionChoices = availablePromotion.choices;
             showPromotionModal(availablePromotion.choices);
        }
    }
}

function handleNewGame() {
    clearInterval(gameInterval); clearInterval(autoSaveInterval);
    localStorage.removeItem(SAVE_KEY);
    const rebirthData = gameState.rebirth;
    gameState = getDefaultGameState();
    gameState.rebirth = rebirthData;
    UIElements.eventLog.innerHTML = '';
    UIElements.battleLog.innerHTML = '';
    logAction('The world is born anew. Choose your class.', 'log-system', "event");
    UIElements.rebirthBtn.style.display = 'none';
    UIElements.classSelectionModal.style.display = 'flex';
    updateAllUIs();
}

function handleRebirth() {
    if (!gameState.player || gameState.player.level < 70) return;
    if (confirm('Are you sure you want to rebirth?')) {
        const pointsGained = Math.floor((gameState.player.level - 69) * 1.5 + gameState.wave * 2);
        clearInterval(gameInterval); clearInterval(autoSaveInterval);
        localStorage.removeItem(SAVE_KEY);
        const rebirthData = gameState.rebirth;
        rebirthData.points += pointsGained;
        gameState = getDefaultGameState();
        gameState.rebirth = rebirthData;
        logAction(`You have been reborn! Gained ${pointsGained} Rebirth Points.`, 'log-system', "event");
        UIElements.rebirthBtn.style.display = 'none';
        UIElements.classSelectionModal.style.display = 'flex';
        updateAllUIs();
    }
}